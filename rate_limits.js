// Общие лимитеры-синглтоны для исходящих запросов к внешним API
// (Kwork IMAP, Anthropic, Groq — каждый источник получает свой бакет по ключу)
// и входящих сообщений в Telegram-боте. Лимиты настраиваются через .env,
// без деплоя нового кода.
const { RateLimiter } = require('./rate_limiter');

function envInt(name, fallback) {
  const value = parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const apiLimiter = new RateLimiter({
  capacity: envInt('RATE_LIMIT_API_CAPACITY', 10),
  windowSec: envInt('RATE_LIMIT_API_WINDOW_SEC', 60),
});

const telegramLimiter = new RateLimiter({
  capacity: envInt('RATE_LIMIT_TELEGRAM_CAPACITY', 5),
  windowSec: envInt('RATE_LIMIT_TELEGRAM_WINDOW_SEC', 10),
  whitelist: [process.env.TELEGRAM_CHAT_ID],
});

module.exports = { apiLimiter, telegramLimiter };
