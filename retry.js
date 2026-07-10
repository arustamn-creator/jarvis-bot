const RETRYABLE_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPROTO', 'ENOTFOUND']);
const TLS_MESSAGE_RE = /unable to verify the first certificate|SSL routines|UNEXPECTED_EOF_WHILE_READING|certificate|EPROTO/i;

function isRetryableError(err) {
  if (err.status === 429) return true;
  if (typeof err.status === 'number' && err.status >= 500) return true;
  if (err.code && RETRYABLE_CODES.has(err.code)) return true;
  if (err.message && TLS_MESSAGE_RE.test(err.message)) return true;
  return false;
}

// Экспоненциальный backoff (1s, 2s, 4s, ...) с джиттером ±20%, чтобы при
// массовых сбоях повторные попытки не били лимиты синхронно.
async function withRetry(fn, {
  maxAttempts = 5,
  baseDelayMs = 1000,
  isRetryable = isRetryableError,
  label = 'call',
} = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = isRetryable(err);
      console.error(
        `[retry] ${label}: попытка ${attempt}/${maxAttempts} провалена — ${err.message}` +
        (retryable ? '' : ' (не временная ошибка, не повторяем)')
      );
      if (!retryable || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isRetryableError };
