// HTTP API для внешнего дашборда мониторинга (веб/PWA).
// Отдельный порт (DASHBOARD_API_PORT, по умолчанию 3001), отдельный процесс
// маршрутов — не трогает Telegram-бота и его логику. createApp() — чистая
// фабрика без побочных эффектов (не открывает порт), чтобы её можно было
// тестировать без запуска бота; startServer() поднимает реальный listen.

const express = require('express');
const crypto = require('crypto');

function tokenMatches(provided) {
  const expected = process.env.DASHBOARD_API_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cors(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tokenMatches(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// runners: { [agentId]: () => Promise<any> } — функции ручного запуска,
// переданные вызывающей стороной (index.js), чтобы не дублировать логику
// askClaude/checkKworkOrders здесь.
function createApp(registry, runners = {}) {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use(auth);

  app.get('/api/system', (req, res) => {
    const agents = registry.listAgents();
    res.json({
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === 'active').length,
      uptimeSeconds: Math.round(process.uptime()),
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/agents', (req, res) => {
    res.json(registry.listAgents());
  });

  app.get('/api/agents/:id', (req, res) => {
    const agent = registry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: 'agent not found' });
    res.json(agent);
  });

  app.get('/api/agents/:id/logs', (req, res) => {
    if (!registry.exists(req.params.id)) {
      return res.status(404).json({ error: 'agent not found' });
    }
    const limit = parseInt(req.query.limit, 10);
    res.json(registry.getLogs(req.params.id, Number.isFinite(limit) ? limit : 50));
  });

  app.post('/api/agents/:id/run', async (req, res) => {
    const id = req.params.id;
    if (!registry.exists(id)) {
      return res.status(404).json({ error: 'agent not found' });
    }
    const runner = runners[id];
    if (!runner) {
      return res.status(400).json({ error: 'agent does not support manual run' });
    }
    registry.recordStart(id, `${id}: ручной запуск через dashboard API`);
    try {
      const result = await runner();
      registry.recordSuccess(id, `${id}: ручной запуск завершён`);
      res.json({ ok: true, result: result ?? null });
    } catch (err) {
      registry.recordError(id, err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return app;
}

function startServer(app) {
  const port = process.env.DASHBOARD_API_PORT || 3001;
  return app.listen(port, () => {
    console.log(`[dashboard-api] слушает порт ${port}`);
  });
}

module.exports = { createApp, startServer, tokenMatches };
