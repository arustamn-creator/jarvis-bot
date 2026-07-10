const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withRetry, isRetryableError } = require('../retry');

test('withRetry возвращает результат с первой попытки без задержек', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return 'ok';
  });

  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withRetry повторяет при временной ошибке и в итоге возвращает успех', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error('ETIMEDOUT');
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return 'ok';
    },
    { baseDelayMs: 1 }
  );

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry не повторяет при 4xx (кроме 429) и сразу бросает ошибку', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        const err = new Error('Bad request');
        err.status = 400;
        throw err;
      },
      { baseDelayMs: 1 }
    ),
    /Bad request/
  );

  assert.equal(calls, 1);
});

test('withRetry повторяет при 429 и при 5xx', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        const err = new Error('Rate limited');
        err.status = 429;
        throw err;
      },
      { baseDelayMs: 1, maxAttempts: 3 }
    )
  );

  assert.equal(calls, 3);
});

test('withRetry бросает исходную ошибку после исчерпания всех попыток', async () => {
  await assert.rejects(
    withRetry(
      async () => {
        const err = new Error('unable to verify the first certificate');
        throw err;
      },
      { baseDelayMs: 1, maxAttempts: 2 }
    ),
    /unable to verify the first certificate/
  );
});

test('isRetryableError распознаёт TLS-ошибки как временные', () => {
  assert.equal(isRetryableError(new Error('unable to verify the first certificate')), true);
  assert.equal(isRetryableError(new Error('SSL routines:ssl3_read_bytes')), true);
  assert.equal(isRetryableError({ message: '', code: 'ECONNRESET' }), true);
  assert.equal(isRetryableError({ message: 'Not found', status: 404 }), false);
});
