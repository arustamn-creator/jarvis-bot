const { EventEmitter } = require('events');
const Groq = require('groq-sdk');
const { ProxyAgent } = require('undici');
const { withRetry } = require('./retry');
const { apiLimiter } = require('./rate_limits');

// Ленивая инициализация: конструктор Groq бросает исключение при пустом
// GROQ_API_KEY, а этот модуль требуют пути, которым Groq никогда не нужен
// (обычный успешный ответ Anthropic) — не должны падать при require().
let groqClient = null;
function getGroqClient() {
  if (!groqClient) {
    // Groq блокирует прямые запросы из РФ — ходим через локальный прокси, если задан.
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      fetchOptions: proxyUrl ? { dispatcher: new ProxyAgent(proxyUrl) } : undefined,
    });
  }
  return groqClient;
}

// 'fallback' — переключение Anthropic → Groq (сигнал, что с основным провайдером
// что-то не так, даже если ответ в итоге получен).
// 'exhausted' — оба провайдера недоступны.
const llmEvents = new EventEmitter();

async function callAnthropic({ system, messages, maxTokens }) {
  const res = await fetch('https://apinet.cloud/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Anthropic ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.content[0].text;
}

async function callGroqFallback({ system, messages }) {
  const groqMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ];
  const completion = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: groqMessages,
  });
  return completion.choices[0].message.content;
}

async function callClaude({ system, messages, maxTokens = 4096 }) {
  if (!apiLimiter.allow('anthropic')) {
    throw new Error('Anthropic: превышен лимит запросов');
  }

  try {
    return await withRetry(() => callAnthropic({ system, messages, maxTokens }), {
      label: 'Anthropic',
    });
  } catch (anthropicErr) {
    console.error(`[llm] Anthropic исчерпал попытки (${anthropicErr.message}) — переключаюсь на Groq`);
    llmEvents.emit('fallback', { reason: anthropicErr.message });

    if (!apiLimiter.allow('groq')) {
      const err = new Error('Groq: превышен лимит запросов (fallback недоступен)');
      llmEvents.emit('exhausted', { anthropicError: anthropicErr.message, groqError: err.message });
      throw err;
    }

    try {
      return await callGroqFallback({ system, messages });
    } catch (groqErr) {
      console.error(`[llm] Groq тоже недоступен: ${groqErr.message}`);
      llmEvents.emit('exhausted', {
        anthropicError: anthropicErr.message,
        groqError: groqErr.message,
      });
      throw new Error(`Anthropic и Groq оба недоступны: ${anthropicErr.message} / ${groqErr.message}`);
    }
  }
}

module.exports = { callClaude, llmEvents };
