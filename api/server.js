// HTTP-роуты дашборда мониторинга (веб/PWA). Монтируются на тот же Express-
// инстанс и тот же порт, что уже слушает Railway через публичный домен
// (см. index.js: `api`, PORT), а не на отдельном порту — Railway-сервис
// проксирует наружу только один порт на один домен. createDashboardRouter()
// — чистая фабрика без побочных эффектов (не открывает порт сама), чтобы её
// можно было монтировать на существующий app и тестировать без запуска бота.

const express = require('express');
const crypto = require('crypto');

function tokenMatches(provided) {
  const expected = process.env.DASHBOARD_API_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Открытый CORS, безопасно применять глобально на весь app — просто
// добавляет заголовки и отвечает на preflight, не блокирует и не меняет
// поведение остальных маршрутов (например /api/ask для voice-core).
function cors(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// Bearer-авторизация по DASHBOARD_API_TOKEN — применяется только внутри
// роутов этого роутера, не глобально на app, чтобы не задеть /api/ask
// (у него свой токен, VOICE_API_TOKEN).
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
function createDashboardRouter(registry, runners = {}) {
  const router = express.Router();

  router.get('/api/system', auth, (req, res) => {
    const agents = registry.listAgents();
    res.json({
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === 'active').length,
      uptimeSeconds: Math.round(process.uptime()),
      serverTime: new Date().toISOString(),
    });
  });

  router.get('/api/agents', auth, (req, res) => {
    res.json(registry.listAgents());
  });

  router.get('/api/agents/:id', auth, (req, res) => {
    const agent = registry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: 'agent not found' });
    res.json(agent);
  });

  router.get('/api/agents/:id/logs', auth, (req, res) => {
    if (!registry.exists(req.params.id)) {
      return res.status(404).json({ error: 'agent not found' });
    }
    const limit = parseInt(req.query.limit, 10);
    res.json(registry.getLogs(req.params.id, Number.isFinite(limit) ? limit : 50));
  });

  router.post('/api/agents/:id/run', auth, async (req, res) => {
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

  return router;
}

module.exports = { createDashboardRouter, cors, tokenMatches };
