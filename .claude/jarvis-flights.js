// ============================================================
//  flights.js — Джарвис: отслеживание цен на авиабилеты
//  Подключение в index.js:
//    const { registerFlightCommands } = require('./flights');
//    registerFlightCommands(bot);
// ============================================================

require('dotenv').config();
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

// ── Настройки ────────────────────────────────────────────────
const AVIASALES_TOKEN = process.env.AVIASALES_TOKEN;
const DATA_FILE       = path.join(__dirname, 'memory_db', 'flights.json');
const CURRENCY        = 'rub';
const API_BASE        = 'https://api.travelpayouts.com/v1';

// ── Хранилище подписок (JSON-файл рядом с memory_db) ────────

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    return { routes: {}, history: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { routes: {}, history: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Aviasales API ────────────────────────────────────────────

async function fetchCheapest(origin, destination) {
  try {
    const { data } = await axios.get(`${API_BASE}/prices/cheap`, {
      params: { origin, destination, currency: CURRENCY, locale: 'ru' },
      headers: { 'X-Access-Token': AVIASALES_TOKEN },
      timeout: 15000,
    });

    const prices = data?.data?.[destination.toUpperCase()];
    if (!prices || Object.keys(prices).length === 0) return null;

    const best = Object.values(prices).reduce((a, b) =>
      a.price <= b.price ? a : b
    );

    return {
      price:      best.price,
      airline:    best.airline || '?',
      departDate: best.depart_date || '—',
      returnDate: best.return_date || null,
      link: `https://www.aviasales.ru/search/${origin.toUpperCase()}` +
            `${(best.depart_date || '').replace(/-/g, '')}` +
            `${destination.toUpperCase()}1`,
    };
  } catch (err) {
    console.error('[flights] API error:', err.message);
    return null;
  }
}

async function fetchCheapAnywhere(origin, limit = 5) {
  try {
    const { data } = await axios.get(`${API_BASE}/prices/cheap`, {
      params: { origin, destination: '-', currency: CURRENCY, locale: 'ru' },
      headers: { 'X-Access-Token': AVIASALES_TOKEN },
      timeout: 15000,
    });

    const results = [];
    for (const [dest, variants] of Object.entries(data?.data || {})) {
      const best = Object.values(variants).reduce((a, b) =>
        a.price <= b.price ? a : b
      );
      results.push({
        dest,
        price:      best.price,
        airline:    best.airline || '?',
        departDate: best.depart_date || '—',
        link: `https://www.aviasales.ru/search/${origin.toUpperCase()}` +
              `${(best.depart_date || '').replace(/-/g, '')}${dest}1`,
      });
    }

    return results.sort((a, b) => a.price - b.price).slice(0, limit);
  } catch (err) {
    console.error('[flights] API error:', err.message);
    return [];
  }
}

// ── Логика подписок ──────────────────────────────────────────

function subscribe(origin, destination, threshold) {
  const db  = loadData();
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
  if (db.routes[key]) return { added: false, key };
  db.routes[key] = {
    origin:      origin.toUpperCase(),
    destination: destination.toUpperCase(),
    threshold:   threshold || null,
    createdAt:   new Date().toISOString(),
  };
  saveData(db);
  return { added: true, key };
}

function unsubscribe(key) {
  const db = loadData();
  key = key.toUpperCase();
  if (!db.routes[key]) return false;
  delete db.routes[key];
  delete db.history[key];
  saveData(db);
  return true;
}

function getRoutes() {
  return loadData().routes;
}

function updateHistory(key, price) {
  const db   = loadData();
  const prev = db.history[key]?.minPrice || null;
  if (!db.history[key]) db.history[key] = {};
  db.history[key].lastPrice  = price;
  db.history[key].lastUpdate = new Date().toISOString();
  if (!prev || price < prev) db.history[key].minPrice = price;
  saveData(db);
  return prev;
}

// ── Форматирование сообщений ─────────────────────────────────

function fmtPrice(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

function msgSubscribed(key, threshold) {
  return `✅ *Подписка оформлена: ${key}*` +
    (threshold ? `\nАлерт когда цена ниже ${fmtPrice(threshold)}` : '\nАлерт при новом минимуме');
}

function msgAlreadyExists(key) {
  return `ℹ️ Маршрут *${key}* уже отслеживается.`;
}

function msgUnsubscribed(key) {
  return `🗑 Маршрут *${key}* удалён из отслеживания.`;
}

function msgNotFound(key) {
  return `⚠️ Маршрут *${key}* не найден в подписках.`;
}

function msgPriceDrop(key, price, threshold, prevMin) {
  return `🔥 *Джарвис: цена упала!*\n\n` +
    `✈️ *${key}*\n` +
    `💰 *${fmtPrice(price)}* — ниже порога ${fmtPrice(threshold)}` +
    (prevMin ? ` (ранее мин. ${fmtPrice(prevMin)})` : '') + '\n';
}

function msgNewMinimum(key, price, prevMin) {
  return `📉 *Новый минимум!*\n\n` +
    `✈️ *${key}*\n` +
    `💰 ${fmtPrice(price)} (было ${fmtPrice(prevMin)}, −${fmtPrice(prevMin - price)})\n`;
}

function msgDailyDigest(pairs) {
  const lines = ['📊 *Джарвис: ежедневная сводка цен*\n'];
  for (const { key, result } of pairs) {
    if (result) {
      lines.push(
        `✈️ *${key}*: ${fmtPrice(result.price)} (${result.departDate}) — ${result.airline}\n` +
        `   [смотреть билеты](${result.link})`
      );
    } else {
      lines.push(`✈️ *${key}*: данные недоступны`);
    }
  }
  lines.push(`\n🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
  return lines.join('\n');
}

function msgSubList(routes, history) {
  const keys = Object.keys(routes);
  if (keys.length === 0) return '📭 *Нет активных подписок.*';
  const lines = ['📋 *Активные подписки Джарвиса*\n'];
  for (const key of keys) {
    const r = routes[key];
    const h = history[key] || {};
    lines.push(
      `✈️ *${key}*\n` +
      `   порог: ${r.threshold ? fmtPrice(r.threshold) : 'без порога'}` +
      ` | мин: ${h.minPrice ? fmtPrice(h.minPrice) : '—'}` +
      ` | сейчас: ${h.lastPrice ? fmtPrice(h.lastPrice) : '—'}`
    );
  }
  return lines.join('\n');
}

function msgCheapAnywhere(origin, results) {
  const lines = [`🌍 *Дешёвые направления из ${origin.toUpperCase()}*\n`];
  results.forEach((r, i) => {
    lines.push(
      `${i + 1}\\. *${r.dest}* — ${fmtPrice(r.price)} (${r.departDate}) · ${r.airline}\n` +
      `   [смотреть](${r.link})`
    );
  });
  return lines.join('\n');
}

function msgHelp() {
  return `✈️ *Джарвис — Авиабилеты*\n\n` +
    `*/fly\\_sub MOW BKK 25000* — подписка с порогом цены\n` +
    `*/fly\\_sub MOW AMS* — подписка без порога\n` +
    `*/fly\\_del MOW\\-BKK* — удалить маршрут\n` +
    `*/fly\\_list* — активные подписки\n` +
    `*/fly\\_check* — проверить цены сейчас\n` +
    `*/fly\\_digest* — сводка по всем маршрутам\n` +
    `*/fly\\_cheap MOW 7* — топ дешёвых направлений\n\n` +
    `_Данные: Travelpayouts API (обновляются раз в 24–48ч)_`;
}

// ── Проверка цен (для планировщика или /fly_check) ───────────

async function checkPrices(bot, notifyChatId) {
  const db     = loadData();
  const routes = db.routes;
  const keys   = Object.keys(routes);
  if (keys.length === 0) return;

  for (const key of keys) {
    const r      = routes[key];
    const result = await fetchCheapest(r.origin, r.destination);
    if (!result) continue;

    const prevMin = updateHistory(key, result.price);

    if (!notifyChatId) continue;

    // Алерт при пробитии порога
    if (r.threshold && result.price <= r.threshold) {
      await bot.sendMessage(notifyChatId,
        msgPriceDrop(key, result.price, r.threshold, prevMin) +
        `🗓 Вылет: ${result.departDate}\n🏢 ${result.airline}\n[Смотреть билеты](${result.link})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    }
    // Алерт при новом историческом минимуме
    else if (prevMin && result.price < prevMin) {
      await bot.sendMessage(notifyChatId,
        msgNewMinimum(key, result.price, prevMin) +
        `🗓 ${result.departDate} · ${result.airline}\n[Смотреть](${result.link})`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    }
  }
}

// ── Регистрация команд в боте ────────────────────────────────

function registerFlightCommands(bot) {

  const send = (chatId, text) =>
    bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });

  // /fly_help
  bot.onText(/\/fly_help/, async (msg) => {
    await send(msg.chat.id, msgHelp());
  });

  // /fly_sub ORIGIN DEST [THRESHOLD]
  // Пример: /fly_sub MOW BKK 25000
  bot.onText(/\/fly_sub\s+([A-Za-z]{3})\s+([A-Za-z]{3})(?:\s+(\d+))?/, async (msg, match) => {
    const chatId    = msg.chat.id;
    const origin    = match[1].toUpperCase();
    const dest      = match[2].toUpperCase();
    const threshold = match[3] ? parseFloat(match[3]) : null;

    await bot.sendChatAction(chatId, 'typing');
    const { added, key } = subscribe(origin, dest, threshold);
    await send(chatId, added ? msgSubscribed(key, threshold) : msgAlreadyExists(key));
  });

  // /fly_del MOW-BKK
  bot.onText(/\/fly_del\s+([A-Za-z]{3}[-_][A-Za-z]{3})/, async (msg, match) => {
    const chatId = msg.chat.id;
    const key    = match[1].replace('_', '-').toUpperCase();
    const ok     = unsubscribe(key);
    await send(chatId, ok ? msgUnsubscribed(key) : msgNotFound(key));
  });

  // /fly_list
  bot.onText(/\/fly_list/, async (msg) => {
    const db = loadData();
    await send(msg.chat.id, msgSubList(db.routes, db.history));
  });

  // /fly_check — проверить цены прямо сейчас
  bot.onText(/\/fly_check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendChatAction(chatId, 'typing');
    const routes = getRoutes();
    if (Object.keys(routes).length === 0) {
      return send(chatId, '📭 Нет активных подписок. Добавьте: `/fly_sub MOW BKK 25000`');
    }
    await send(chatId, '🔍 Проверяю цены...');
    await checkPrices(bot, chatId);
    await send(chatId, '✅ Проверка завершена.');
  });

  // /fly_digest — сводка по всем маршрутам
  bot.onText(/\/fly_digest/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendChatAction(chatId, 'typing');
    const routes = getRoutes();
    if (Object.keys(routes).length === 0) {
      return send(chatId, '📭 Нет активных подписок.');
    }
    const pairs = [];
    for (const [key, r] of Object.entries(routes)) {
      const result = await fetchCheapest(r.origin, r.destination);
      if (result) updateHistory(key, result.price);
      pairs.push({ key, result });
    }
    await send(chatId, msgDailyDigest(pairs));
  });

  // /fly_cheap ORIGIN [LIMIT]
  // Пример: /fly_cheap MOW 7
  bot.onText(/\/fly_cheap\s+([A-Za-z]{3})(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const origin = match[1].toUpperCase();
    const limit  = match[2] ? parseInt(match[2]) : 5;

    await bot.sendChatAction(chatId, 'typing');
    await send(chatId, `🔍 Ищу дешёвые направления из *${origin}*...`);

    const results = await fetchCheapAnywhere(origin, limit);
    if (results.length === 0) {
      return send(chatId, `😔 Не удалось найти билеты из *${origin}*. Проверь IATA-код.`);
    }
    await send(chatId, msgCheapAnywhere(origin, results));
  });

  console.log('[Джарвис] ✈️ Модуль авиабилетов подключён');
}

// ── Экспорт ──────────────────────────────────────────────────
module.exports = { registerFlightCommands, checkPrices, fetchCheapest };
