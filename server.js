const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { spawn } = require('child_process');
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

const chatHistory = [];

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

// ── Bot process management ───────────────────────────────────────────────────
let botProcess = null;

function startBot() {
  if (botProcess) return { ok: false, msg: 'Already running' };
  botProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });
  botProcess.on('exit', (code) => {
    console.log(`[BOT] Exited with code ${code}`);
    botProcess = null;
  });
  botProcess.on('error', (err) => {
    console.error(`[BOT] Error: ${err.message}`);
    botProcess = null;
  });
  return { ok: true, msg: 'Started' };
}

function stopBot() {
  if (!botProcess) return { ok: false, msg: 'Not running' };
  botProcess.kill('SIGTERM');
  botProcess = null;
  return { ok: true, msg: 'Stopped' };
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'jarvis-dashboard.html'));
});

app.get('/api/bot/status', (req, res) => {
  res.json({ status: botProcess ? 'running' : 'stopped' });
});

app.post('/api/bot/start', (req, res) => {
  const result = startBot();
  res.json({ ...result, status: botProcess ? 'running' : 'stopped' });
});

app.post('/api/bot/stop', (req, res) => {
  const result = stopBot();
  res.json({ ...result, status: 'stopped' });
});

app.post('/api/bot/restart', (req, res) => {
  stopBot();
  setTimeout(() => {
    const result = startBot();
    res.json({ ...result, status: botProcess ? 'running' : 'stopped' });
  }, 800);
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

  chatHistory.push({ role: 'user', content: message });

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
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${API_KEY}&alt=sse`,
      headers: {
        'content-type': 'application/json',
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

    chatHistory.push({ role: 'assistant', content: fullText });
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
