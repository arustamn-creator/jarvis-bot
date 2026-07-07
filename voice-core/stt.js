const fs = require('fs');
const Groq = require('groq-sdk');
const { ProxyAgent } = require('undici');

// Groq блокирует прямые запросы из РФ — ходим через локальный прокси,
// если он задан (curl делает это сам через HTTPS_PROXY, Node fetch — нет).
// groq-sdk ≥1.3 работает через fetch, поэтому прокси задаётся undici-диспетчером.
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  fetchOptions: proxyUrl ? { dispatcher: new ProxyAgent(proxyUrl) } : undefined,
});

async function transcribe(wavPath) {
  const result = await groq.audio.transcriptions.create({
    file: fs.createReadStream(wavPath),
    model: 'whisper-large-v3-turbo',
    language: 'ru',
  });
  return (result.text || '').trim();
}

module.exports = { transcribe };
