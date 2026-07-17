const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const axios = require('axios');

// ── Startup diagnostics ──────────────────────────────────────────────────────
const API_KEY = process.env.GEMINI_API_KEY;
if (API_KEY) {
  console.log(`[OK] GEMINI_API_KEY loaded: ${API_KEY.slice(0, 18)}...`);
} else {
  console.error('[ERROR] GEMINI_API_KEY not found in .env');
}

const app = express();
app.use(express.json());

const SYSTEM_PROMPT = [
  'You are Jarvis, a personal AI assistant — intelligent, precise, and slightly formal, like the AI from Iron Man.',
  'IMPORTANT: Always reply in the SAME language the user writes in.',
  'If the user writes in Russian — reply in Russian.',
  'If the user writes in English — reply in English.',
  'Keep responses concise and helpful.',
].join(' ');

// Ограничение истории: без него массив рос бесконечно, и вся история целиком
// уходила в Gemini каждым запросом.
const MAX_HISTORY = 100;
const chatHistory = [];

function pushHistory(entry) {
  chatHistory.push(entry);
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory.splice(0, chatHistory.length - MAX_HISTORY);
  }
}

// Gemini requires strict user→model alternation, must start with user
function sanitizeHistory(hist) {
  const out = [];
  for (const msg of hist) {
    if (out.length === 0 && msg.role !== 'user') continue;
    if (out.length > 0 && out[out.length - 1].role === msg.role) continue;
    out.push(msg);
  }
  return out;
}

// ── Управление прод-ботом через Railway ─────────────────────────────────────
// Раньше кнопки дашборда запускали ЛОКАЛЬНЫЙ node index.js — второй процесс
// бота рядом с продом. Теперь дашборд управляет самим прод-сервисом Railway.
// Нужен RAILWAY_API_TOKEN в .env (создать: railway.com → Account → Tokens).
const RAILWAY_PROJECT_ID = '8ee239ca-29a4-499f-8dc7-546fbfbc966d';
const RAILWAY_SERVICE_ID = '8a018352-3019-4ed0-9664-50180c02a0b8';

async function railwayGql(query, variables) {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error('RAILWAY_API_TOKEN не задан в .env');
  const res = await axios.post(
    'https://backboard.railway.com/graphql/v2',
    { query, variables },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
  );
  if (res.data.errors?.length) throw new Error(res.data.errors[0].message);
  return res.data.data;
}

let cachedEnvId = null;
async function railwayEnvId() {
  if (cachedEnvId) return cachedEnvId;
  const data = await railwayGql(
    `query ($id: String!) {
      project(id: $id) { environments { edges { node { id name } } } }
    }`,
    { id: RAILWAY_PROJECT_ID }
  );
  const edges = data.project.environments.edges;
  const prod = edges.find((e) => e.node.name === 'production') || edges[0];
  if (!prod) throw new Error('Не нашёл окружение production в Railway');
  cachedEnvId = prod.node.id;
  return cachedEnvId;
}

async function railwayDeployStatus() {
  const environmentId = await railwayEnvId();
  const data = await railwayGql(
    `query ($input: DeploymentListInput!) {
      deployments(input: $input, first: 1) { edges { node { status } } }
    }`,
    { input: { projectId: RAILWAY_PROJECT_ID, serviceId: RAILWAY_SERVICE_ID, environmentId } }
  );
  return data.deployments.edges[0]?.node?.status || 'UNKNOWN';
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'jarvis-dashboard.html'));
});

app.get('/api/bot/status', async (req, res) => {
  try {
    const deploy = await railwayDeployStatus();
    const status =
      deploy === 'SUCCESS' ? 'running'
      : ['BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING'].includes(deploy) ? 'deploying'
      : 'stopped';
    res.json({ status, deploy });
  } catch (err) {
    res.json({ status: 'unknown', error: err.message });
  }
});

app.post('/api/bot/restart', async (req, res) => {
  try {
    const environmentId = await railwayEnvId();
    await railwayGql(
      `mutation ($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId: RAILWAY_SERVICE_ID, environmentId }
    );
    console.log('[BOT] Рестарт прод-сервиса на Railway запущен');
    res.json({ ok: true, msg: 'Рестарт на Railway запущен', status: 'deploying' });
  } catch (err) {
    console.error('[BOT] Ошибка рестарта:', err.message);
    res.status(502).json({ ok: false, msg: err.message, status: 'unknown' });
  }
});

app.delete('/api/chat/history', (req, res) => {
  chatHistory.length = 0;
  console.log('[CHAT] History cleared');
  res.json({ ok: true });
});

// ── Chat via Google Gemini REST API (axios — reliable on Windows) ────────────
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });
  if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  pushHistory({ role: 'user', content: message });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');

  let fullText = '';
  try {
    const contents = sanitizeHistory(chatHistory).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    console.log(`[CHAT] Sending ${contents.length} messages to Gemini API`);

    const apiRes = await axios({
      method: 'POST',
      // Ключ в заголовке, не в URL — URL попадает в логи (err.config.url ниже),
      // заголовки в них не печатаются.
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      data: {
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 1024,
        },
      },
      responseType: 'stream',
      timeout: 60000,
    });

    let buf = '';
    for await (const chunk of apiRes.data) {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete line in buffer
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const evt = JSON.parse(raw);
          const delta = evt.candidates?.[0]?.content?.parts?.[0]?.text;
          if (delta) {
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch { }
      }
    }

    pushHistory({ role: 'assistant', content: fullText });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    console.log(`[CHAT] OK — ${fullText.length} chars`);
  } catch (err) {
    let detail = err.message;
    console.error(`[CHAT] Error type: ${err.constructor.name}`);
    console.error(`[CHAT] Error code: ${err.code || 'none'}`);
    console.error(`[CHAT] Error message: ${err.message}`);
    if (err.response) {
      console.error(`[CHAT] HTTP status: ${err.response.status} ${err.response.statusText}`);
      console.error(`[CHAT] Response headers: ${JSON.stringify(err.response.headers)}`);
      try {
        let body = '';
        for await (const chunk of err.response.data) body += chunk.toString();
        console.error(`[CHAT] Full response body:\n${body}`);
        const parsed = JSON.parse(body);
        detail = `HTTP ${err.response.status}: ${parsed.error?.message || parsed.error?.code || body}`;
      } catch (parseErr) {
        console.error(`[CHAT] Failed to parse error body: ${parseErr.message}`);
        detail = `HTTP ${err.response.status}: ${err.response.statusText}`;
      }
    } else if (err.request) {
      console.error(`[CHAT] No response received (timeout or network error)`);
      console.error(`[CHAT] Request URL: ${err.config?.url}`);
    }
    console.error(`[CHAT] Final error detail: ${detail}`);
    if (!fullText) chatHistory.pop();
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: detail })}\n\n`);
      res.end();
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.DASHBOARD_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[OK] JARVIS Dashboard → http://localhost:${PORT}`);
});
