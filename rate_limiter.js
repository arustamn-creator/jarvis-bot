// Token bucket — трафик у нас низкий, но неравномерный (пачка Kwork-писем,
// несколько сообщений подряд от одного пользователя), поэтому нужен
// нетребовательный к памяти счётчик, который разрешает короткий всплеск
// до ёмкости бакета, а не жёстко режет по окну.
class TokenBucket {
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerSec = refillPerSec;
    this.lastRefill = Date.now();
  }

  tryConsume(cost = 1) {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefill = now;

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

class RateLimiter {
  constructor({ capacity, windowSec, whitelist = [] }) {
    this.capacity = capacity;
    this.windowSec = windowSec;
    this.whitelist = new Set(whitelist.filter(Boolean).map(String));
    this.buckets = new Map();
  }

  allow(key) {
    if (this.whitelist.has(String(key))) return true;

    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket({ capacity: this.capacity, refillPerSec: this.capacity / this.windowSec }));
    }

    const allowed = this.buckets.get(key).tryConsume(1);
    if (!allowed) {
      console.warn(`[rate-limit] отклонён запрос для "${key}" — лимит ${this.capacity} / ${this.windowSec}с исчерпан`);
    }
    return allowed;
  }
}

module.exports = { RateLimiter, TokenBucket };
