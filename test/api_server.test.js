const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createDashboardRouter, cors } = require('../api/server');

const TEST_TOKEN = 'test-dashboard-token';

// Собираем app так же, как index.js монтирует дашборд-роуты на общий `api`
// (тот же процесс/порт, что и /api/ask) — а не отдельным сервером.
function createApp(registry, runners) {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use(createDashboardRouter(registry, runners));
  return app;
}

// Мимикрирует существующий /api/ask с собственным токеном (VOICE_API_TOKEN),
// живущий на том же app — проверяем, что дашборд-авторизация его не задевает.
function mountUnrelatedRoute(app) {
  app.post('/api/ask', (req, res) => {
    res.json({ reply: 'unrelated route reached' });
  });
}

function makeFakeRegistry() {
  const agents = {
    'kwork-monitor': {
      id: 'kwork-monitor',
      name: 'Kwork Monitor',
      description: 'Мониторинг заказов Kwork',
      schedule: 'IMAP IDLE',
      runnable: true,
      status: 'idle',
      lastRun: null,
      lastError: null,
    },
    'chat-handler': {
      id: 'chat-handler',
      name: 'Chat Handler',
      description: 'Обработка сообщений',
      schedule: null,
      runnable: false,
      status: 'idle',
      lastRun: null,
      lastError: null,
    },
  };

  return {
    listAgents: () => Object.values(agents),
    getAgent: (id) => (agents[id] ? { ...agents[id], logs: [] } : null),
    getLogs: (id) => (agents[id] ? [{ timestamp: new Date().toISOString(), level: 'info', message: 'test log' }] : null),
    exists: (id) => Boolean(agents[id]),
    recordStart: () => {},
    recordSuccess: () => {},
    recordError: () => {},
  };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('запрос без токена -> 401', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/system`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'unauthorized');
  });
});

test('запрос с неверным токеном -> 401', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents`, {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    assert.equal(res.status, 401);
  });
});

test('GET /api/system с токеном -> 200 и правильная структура', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/system`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totalAgents, 2);
    assert.equal(body.activeAgents, 0);
    assert.equal(typeof body.uptimeSeconds, 'number');
    assert.equal(typeof body.serverTime, 'string');
  });
});

test('GET /api/agents с токеном -> 200 со списком агентов нужной формы', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.length, 2);
    for (const agent of body) {
      assert.equal(typeof agent.id, 'string');
      assert.equal(typeof agent.name, 'string');
      assert.ok(['active', 'idle', 'error'].includes(agent.status));
      assert.ok('lastRun' in agent);
      assert.ok('schedule' in agent);
      assert.equal(typeof agent.description, 'string');
    }
  });
});

test('GET /api/agents/:id для существующего агента -> 200 с логами', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/kwork-monitor`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, 'kwork-monitor');
    assert.ok(Array.isArray(body.logs));
  });
});

test('GET /api/agents/:id для несуществующего агента -> 404', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/does-not-exist`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 404);
  });
});

test('GET /api/agents/:id/logs с токеном -> 200 массив логов', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/kwork-monitor/logs?limit=10`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
  });
});

test('GET /api/agents/:id/logs для несуществующего агента -> 404', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/does-not-exist/logs`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 404);
  });
});

test('POST /api/agents/:id/run для несуществующего id -> 404', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/does-not-exist/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 404);
  });
});

test('POST /api/agents/:id/run для агента без ручного запуска -> 400', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/chat-handler/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 400);
  });
});

test('POST /api/agents/:id/run для runnable агента вызывает переданный runner -> 200', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  let called = false;
  const app = createApp(makeFakeRegistry(), {
    'kwork-monitor': async () => {
      called = true;
      return { checked: 3, matched: 1 };
    },
  });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/kwork-monitor/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.deepEqual(body.result, { checked: 3, matched: 1 });
    assert.equal(called, true);
  });
});

test('POST /api/agents/:id/run без токена -> 401', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents/kwork-monitor/run`, { method: 'POST' });
    assert.equal(res.status, 401);
  });
});

test('ответ содержит CORS-заголовок Access-Control-Allow-Origin: *', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/system`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });
});

test('дашборд-авторизация не блокирует несвязанный маршрут на том же app (/api/ask)', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  mountUnrelatedRoute(app);
  await withServer(app, async (base) => {
    // Без DASHBOARD_API_TOKEN и вообще без заголовка Authorization —
    // /api/ask не должен требовать его, это отдельный маршрут со своей auth.
    const res = await fetch(`${base}/api/ask`, { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reply, 'unrelated route reached');
  });
});

test('OPTIONS preflight на дашборд-маршрут отвечает 204 без токена', async () => {
  process.env.DASHBOARD_API_TOKEN = TEST_TOKEN;
  const app = createApp(makeFakeRegistry(), {});
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/agents`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
  });
});
