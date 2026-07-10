const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter } = require('../rate_limiter');

test('RateLimiter разрешает запросы в пределах ёмкости бакета', () => {
  const limiter = new RateLimiter({ capacity: 3, windowSec: 60 });

  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), true);
});

test('RateLimiter отклоняет запрос сверх ёмкости бакета', () => {
  const limiter = new RateLimiter({ capacity: 2, windowSec: 60 });

  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), false);
});

test('RateLimiter ведёт отдельные бакеты по ключу-источнику', () => {
  const limiter = new RateLimiter({ capacity: 1, windowSec: 60 });

  assert.equal(limiter.allow('kwork'), true);
  assert.equal(limiter.allow('kwork'), false);
  assert.equal(limiter.allow('anthropic'), true);
});

test('RateLimiter не ограничивает ключи из белого списка', () => {
  const limiter = new RateLimiter({ capacity: 1, windowSec: 60, whitelist: ['admin'] });

  assert.equal(limiter.allow('admin'), true);
  assert.equal(limiter.allow('admin'), true);
  assert.equal(limiter.allow('admin'), true);
});

test('RateLimiter восполняет токены со временем', async () => {
  const limiter = new RateLimiter({ capacity: 1, windowSec: 0.1 });

  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), false);

  await new Promise((resolve) => setTimeout(resolve, 150));

  assert.equal(limiter.allow('a'), true);
});
