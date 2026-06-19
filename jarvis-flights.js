// ============================================================
//  jarvis-flights.js v2 — Полная система авиабилетов
//  Команды: /fly — главное меню с кнопками
//  Функции:
//    • Поиск любых направлений
//    • Выбор дат / месяца / гибкие даты
//    • Мониторинг цен каждые 6 часов
//    • Алерт при снижении цены
//    • Топ дешёвых направлений
//    • Маршрут MOW-MCX и любые другие
// ============================================================

require('dotenv').config();
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const AVIASALES_TOKEN = process.env.AVIASALES_TOKEN;
const API_BASE        = 'https://api.travelpayouts.com/v1';
const DATA_FILE       = path.join(__dirname, 'memory_db', 'flights.json');
const CURRENCY        = 'rub';
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_URL = 'https://api.apify.com/v2/actors/johnvc~google-flights-data-scraper-flight-and-price-search/run-sync-get-dataset-items';

// Коды аэропортов СНГ — для них используем Aviasales
const CIS_AIRPORTS = [
  'MOW','LED','MCX','KZN','SVX','ROV','KRR','UFA','PEE','OVB',
  'VVO','KHV','UUD','AER','GOJ','VOG','SCW','AAQ','EVN','TBS',
  'GYD','ALA','TSE','NQZ','FRU','DYU','TAS','SKD','ASB','MSQ','KBP','ODS'
];

function isCisAirport(code) {
  return CIS_AIRPORTS.includes(code.toUpperCase());
}

// ── Хранилище ────────────────────────────────────────────────

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      return { routes: {}, history: {}, sessions: {} };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { routes: {}, history: {}, sessions: {} };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getSession(chatId) {
  const db = loadData();
  return db.sessions[chatId] || {};
}

function setSession(chatId, data) {
  const db = loadData();
  db.sessions[chatId] = { ...db.sessions[chatId], ...data };
  saveData(db);
}

function clearSession(chatId) {
  const db = loadData();
  delete db.sessions[chatId];
  saveData(db);
}

// ── Aviasales API ─────────────────────────────────────────────

async function searchAviasales(origin, destination, departDate = null) {
  try {
    const params = {
      origin:      origin.toUpperCase(),
      destination: destination.toUpperCase(),
      currency:    CURRENCY,
      locale:      'ru',
    };
    if (departDate) params.depart_date = departDate; // формат: 2025-08 или 2025-08-15

    const { data } = await axios.get(`${API_BASE}/prices/cheap`, {
      params,
      headers: { 'X-Access-Token': AVIASALES_TOKEN },
      timeout: 15000,
    });

    const prices = data?.data?.[destination.toUpperCase()];
    if (!prices || Object.keys(prices).length === 0) return null;

    // Сортируем по цене
    const sorted = Object.values(prices).sort((a, b) => a.price - b.price);
    return sorted.map(t => ({
      price:      t.price,
      airline:    t.airline || '?',
      departDate: t.depart_date || '—',
      returnDate: t.return_date || null,
      transfers:  t.transfers || 0,
      link: `https://www.aviasales.ru/search/${origin.toUpperCase()}` +
            `${(t.depart_date || '').replace(/-/g, '')}${destination.toUpperCase()}1`,
    }));
  } catch (err) {
    console.error('[flights] API error:', err.message);
    return null;
  }
}

async function searchCheapAnywhere(origin, limit = 8) {
  try {
    const { data } = await axios.get(`${API_BASE}/prices/cheap`, {
      params: { origin, destination: '-', currency: CURRENCY, locale: 'ru' },
      headers: { 'X-Access-Token': AVIASALES_TOKEN },
      timeout: 15000,
    });

    const results = [];
    for (const [dest, variants] of Object.entries(data?.data || {})) {
      const best = Object.values(variants).sort((a, b) => a.price - b.price)[0];
      results.push({
        dest,
        price:      best.price,
        airline:    best.airline || '?',
        departDate: best.depart_date || '—',
        transfers:  best.transfers || 0,
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

// ── Форматирование ────────────────────────────────────────────

function fmtPrice(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

function fmtTransfers(n) {
  if (n === 0) return 'прямой ✈️';
  if (n === 1) return '1 пересадка';
  return `${n} пересадки`;
}

function fmtDate(d) {
  if (!d || d === '—') return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function fmtResults(tickets, origin, dest, limit = 5) {
  if (!tickets || tickets.length === 0) {
    return `😔 По маршруту *${origin}-${dest}* билеты не найдены.\n\nПопробуй другие даты или направление.`;
  }

  const top = tickets.slice(0, limit);
  const lines = [`✈️ *${origin.toUpperCase()} → ${dest.toUpperCase()}*\n`];

  top.forEach((t, i) => {
    lines.push(
      `${i + 1}\\. 💰 *${fmtPrice(t.price)}* — ${fmtDate(t.departDate)}\n` +
      `   🏢 ${t.airline} · ${fmtTransfers(t.transfers)}\n` +
      `   [Купить билет](${t.link})`
    );
  });

  lines.push(`\n_Данные: Travelpayouts (обновляются раз в 24–48ч)_`);
  return lines.join('\n');
}

// ── Подписки и мониторинг ─────────────────────────────────────

function addSubscription(origin, dest, threshold = null) {
  const db  = loadData();
  const key = `${origin.toUpperCase()}-${dest.toUpperCase()}`;
  db.routes[key] = {
    origin: origin.toUpperCase(),
    dest:   dest.toUpperCase(),
    threshold,
    createdAt: new Date().toISOString(),
  };
  saveData(db);
  return key;
}

function removeSubscription(key) {
  const db = loadData();
  if (!db.routes[key]) return false;
  delete db.routes[key];
  delete db.history[key];
  saveData(db);
  return true;
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

// ── Кнопки ───────────────────────────────────────────────────

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔍 Найти билеты',        callback_data: 'fly_search' },
        { text: '🌍 Куда дешевле',        callback_data: 'fly_anywhere' },
      ],
      [
        { text: '⭐ Мои маршруты',        callback_data: 'fly_list' },
        { text: '📊 Проверить цены',      callback_data: 'fly_check' },
      ],
      [
        { text: '✈️ МОW → MCX',          callback_data: 'fly_mow_mcx' },
        { text: '📅 Сводка сегодня',      callback_data: 'fly_digest' },
      ],
      [
        { text: '➕ Следить за маршрутом', callback_data: 'fly_subscribe' },
        { text: '🗑 Удалить маршрут',     callback_data: 'fly_remove' },
      ],
    ]
  };
}

function backKeyboard() {
  return {
    inline_keyboard: [[
      { text: '◀️ Главное меню', callback_data: 'fly_menu' }
    ]]
  };
}

function dateChoiceKeyboard(origin, dest) {
  const now   = new Date();
  const months = [];
  for (let i = 0; i < 4; i++) {
    const d    = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const name = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    months.push([{ text: `📅 ${name}`, callback_data: `fly_date_${origin}_${dest}_${key}` }]);
  }
  months.push([{ text: '🔄 Любая дата (минимум)', callback_data: `fly_date_${origin}_${dest}_any` }]);
  months.push([{ text: '◀️ Назад', callback_data: 'fly_menu' }]);
  return { inline_keyboard: months };
}

function subscribeKeyboard(key) {
  return {
    inline_keyboard: [
      [{ text: '🔔 Следить за ценой', callback_data: `fly_sub_${key}` }],
      [{ text: '◀️ Главное меню',     callback_data: 'fly_menu' }],
    ]
  };
}

function removeKeyboard(routes) {
  const keys = Object.keys(routes);
  if (keys.length === 0) return backKeyboard();
  const rows = keys.map(k => [{ text: `🗑 ${k}`, callback_data: `fly_del_${k}` }]);
  rows.push([{ text: '◀️ Назад', callback_data: 'fly_menu' }]);
  return { inline_keyboard: rows };
}

// — Поиск через Google Flights (международные)
async function searchGoogleFlights(origin, destination, date) {
  try {
    const response = await axios.post(APIFY_ACTOR_URL, {
      departureAirport: origin,
      arrivalAirport: destination,
      departureDate: date
    }, {
      params: { token: APIFY_TOKEN },
      timeout: 60000
    });

    const flights = response.data;
    if (!flights || flights.length === 0) return null;

    return flights.slice(0, 5).map(f => ({
      price: f.price,
      currency: f.currency || 'USD',
      airline: f.airlines,
      departTime: f.departure_time,
      arriveTime: f.arrival_time,
      stops: f.stops,
      duration: f.duration
    }));
  } catch (err) {
    console.error('[google-flights] error:', err.message);
    return null;
  }
}

// — Универсальный поиск (выбирает источник автоматически)
async function searchFlights(origin, destination, date) {
  if (isCisAirport(origin) && isCisAirport(destination)) {
    // Используем Aviasales для СНГ направлений
    return await searchAviasales(origin, destination, date);
  } else {
    // Используем Google Flights для международных
    return await searchGoogleFlights(origin, destination, date);
  }
}// ── Регистрация ───────────────────────────────────────────────

function registerFlightCommands(bot) {

  const send = (chatId, text, keyboard = null) => {
    const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
    if (keyboard) opts.reply_markup = keyboard;
    return bot.sendMessage(chatId, text, opts);
  };

  const edit = (chatId, msgId, text, keyboard = null) => {
    const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
    if (keyboard) opts.reply_markup = keyboard;
    return bot.editMessageText(text, { chat_id: chatId, message_id: msgId, ...opts });
  };

  // ── /fly — главное меню
  bot.onText(/\/fly/, async (msg) => {
    await send(msg.chat.id,
      `✈️ *Джарвис — Авиабилеты*\n\nВыбери действие:`,
      mainMenuKeyboard()
    );
  });

  // ── Обработка кнопок
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const msgId  = query.message.message_id;
    const data   = query.data;

    await bot.answerCallbackQuery(query.id);

    // Главное меню
    if (data === 'fly_menu') {
      await edit(chatId, msgId,
        `✈️ *Джарвис — Авиабилеты*\n\nВыбери действие:`,
        mainMenuKeyboard()
      );
      return;
    }

    // 🔍 Найти билеты — запрашиваем откуда
    if (data === 'fly_search') {
      setSession(chatId, { step: 'waiting_origin' });
      await edit(chatId, msgId,
        `🔍 *Поиск билетов*\n\nНапиши город отправления или IATA-код:\n\n` +
        `Примеры: *Москва*, *MOW*, *Махачкала*, *MCX*, *Питер*, *LED*`,
        backKeyboard()
      );
      return;
    }

    // 🌍 Куда дешевле
    if (data === 'fly_anywhere') {
      setSession(chatId, { step: 'waiting_origin_any' });
      await edit(chatId, msgId,
        `🌍 *Куда дешевле всего?*\n\nНапиши город откуда летишь:`,
        backKeyboard()
      );
      return;
    }

    // ✈️ MOW → MCX быстрый маршрут
    if (data === 'fly_mow_mcx') {
      await edit(chatId, msgId,
        `✈️ *Москва → Махачкала*\n\nВыбери месяц вылета:`,
        dateChoiceKeyboard('MOW', 'MCX')
      );
      return;
    }

    // 📅 Выбор даты для маршрута
    if (data.startsWith('fly_date_')) {
      const parts  = data.replace('fly_date_', '').split('_');
      const origin = parts[0];
      const dest   = parts[1];
      const date   = parts[2]; // 2025-08 или any

      await bot.sendChatAction(chatId, 'typing');
      const tickets = await searchFlights(origin, dest, date === 'any' ? null : date);
      const text    = fmtResults(tickets, origin, dest);
      const key     = `${origin}-${dest}`;

      await edit(chatId, msgId, text, subscribeKeyboard(key));
      return;
    }

    // ➕ Подписаться
    if (data === 'fly_subscribe') {
      setSession(chatId, { step: 'waiting_sub_origin' });
      await edit(chatId, msgId,
        `➕ *Следить за маршрутом*\n\nНапиши город отправления:`,
        backKeyboard()
      );
      return;
    }

    // Подписка из результатов поиска
    if (data.startsWith('fly_sub_')) {
      const key    = data.replace('fly_sub_', '');
      const [o, d] = key.split('-');
      addSubscription(o, d);
      await edit(chatId, msgId,
        `🔔 *Подписка оформлена!*\n\n✈️ Маршрут *${key}* добавлен в мониторинг.\n` +
        `Буду сообщать о снижении цен каждые 6 часов.`,
        backKeyboard()
      );
      return;
    }

    // 📊 Проверить цены
    if (data === 'fly_check') {
      const db     = loadData();
      const routes = Object.values(db.routes);
      if (routes.length === 0) {
        await edit(chatId, msgId,
          `📭 *Нет активных подписок*\n\nДобавь маршрут через кнопку "Следить за маршрутом"`,
          backKeyboard()
        );
        return;
      }
      await bot.sendChatAction(chatId, 'typing');
      const lines = ['📊 *Текущие цены по подпискам*\n'];
      for (const r of routes) {
        const tickets = await searchFlights(r.origin, r.dest);
        if (tickets && tickets[0]) {
          const t    = tickets[0];
          const key  = `${r.origin}-${r.dest}`;
          const prev = updateHistory(key, t.price);
          const diff = prev ? (prev - t.price > 0 ? `📉 −${fmtPrice(prev - t.price)}` : `📈 +${fmtPrice(t.price - prev)}`) : '';
          lines.push(
            `✈️ *${key}*: ${fmtPrice(t.price)} ${diff}\n` +
            `   ${fmtDate(t.departDate)} · ${t.airline} · ${fmtTransfers(t.transfers)}\n` +
            `   [смотреть](${t.link})`
          );
        } else {
          lines.push(`✈️ *${r.origin}-${r.dest}*: данные недоступны`);
        }
      }
      await edit(chatId, msgId, lines.join('\n'), backKeyboard());
      return;
    }

    // ⭐ Мои маршруты
    if (data === 'fly_list') {
      const db     = loadData();
      const routes = db.routes;
      const hist   = db.history;
      if (Object.keys(routes).length === 0) {
        await edit(chatId, msgId,
          `📭 *Нет активных подписок*\n\nНажми "Следить за маршрутом" чтобы добавить.`,
          backKeyboard()
        );
        return;
      }
      const lines = ['⭐ *Мои маршруты*\n'];
      for (const [key, r] of Object.entries(routes)) {
        const h = hist[key] || {};
        lines.push(
          `✈️ *${key}*\n` +
          `   Мин. цена: ${h.minPrice ? fmtPrice(h.minPrice) : '—'}\n` +
          `   Сейчас: ${h.lastPrice ? fmtPrice(h.lastPrice) : '—'}`
        );
      }
      await edit(chatId, msgId, lines.join('\n'), backKeyboard());
      return;
    }

    // 📅 Сводка
    if (data === 'fly_digest') {
      const db     = loadData();
      const routes = Object.values(db.routes);
      if (routes.length === 0) {
        await edit(chatId, msgId, `📭 Нет подписок для сводки.`, backKeyboard());
        return;
      }
      await bot.sendChatAction(chatId, 'typing');
      const lines = [`📅 *Сводка цен — ${new Date().toLocaleDateString('ru-RU')}*\n`];
      for (const r of routes) {
        const tickets = await searchFlights(r.origin, r.dest);
        if (tickets && tickets[0]) {
          const t = tickets[0];
          lines.push(`✈️ *${r.origin}→${r.dest}*: ${fmtPrice(t.price)} (${fmtDate(t.departDate)}) [купить](${t.link})`);
        }
      }
      await edit(chatId, msgId, lines.join('\n'), backKeyboard());
      return;
    }

    // 🗑 Удалить маршрут
    if (data === 'fly_remove') {
      const db = loadData();
      await edit(chatId, msgId,
        `🗑 *Удалить маршрут*\n\nВыбери маршрут:`,
        removeKeyboard(db.routes)
      );
      return;
    }

    if (data.startsWith('fly_del_')) {
      const key = data.replace('fly_del_', '');
      removeSubscription(key);
      await edit(chatId, msgId,
        `✅ Маршрут *${key}* удалён.`,
        backKeyboard()
      );
      return;
    }
  });

  // ── Обработка текстовых сообщений (диалог поиска)
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId  = msg.chat.id;
    const session = getSession(chatId);
    console.log('[DEBUG] session для', chatId, JSON.stringify(session));
    if (!session.step) return;

    const text = msg.text.trim();

    // Словарь городов → IATA
    const cityMap = {
      'москва': 'MOW', 'moscow': 'MOW',
      'махачкала': 'MCX', 'makhachkala': 'MCX',
      'питер': 'LED', 'санкт-петербург': 'LED', 'спб': 'LED',
      'новосибирск': 'OVB', 'екатеринбург': 'SVX',
      'сочи': 'AER', 'краснодар': 'KRR',
      'казань': 'KZN', 'уфа': 'UFA',
      'дубай': 'DXB', 'dubai': 'DXB',
      'стамбул': 'IST', 'istanbul': 'IST',
      'бангкок': 'BKK', 'bangkok': 'BKK',
      'париж': 'CDG', 'paris': 'CDG',
      'берлин': 'BER', 'berlin': 'BER',
      'тбилиси': 'TBS', 'tbilisi': 'TBS',
      'ереван': 'EVN', 'yerevan': 'EVN',
      'анталья': 'AYT', 'antalya': 'AYT',
    };

    const iata = text.length === 3 && /^[A-Za-z]+$/.test(text)
      ? text.toUpperCase()
      : cityMap[text.toLowerCase()] || text.toUpperCase();

    // Шаг 1: ждём город отправления (поиск)
    if (session.step === 'waiting_origin') {
      setSession(chatId, { step: 'waiting_dest', origin: iata });
      await send(chatId,
        `📍 Откуда: *${iata}*\n\nТеперь напиши город назначения:`,
        backKeyboard()
      );
      return;
    }

    // Шаг 2: ждём город назначения (поиск)
    if (session.step === 'waiting_dest') {
      const origin = session.origin;
      const dest   = iata;
      setSession(chatId, { step: 'waiting_date', origin, dest });
      await send(chatId,
        `✈️ *${origin} → ${dest}*\n\nВыбери месяц или укажи дату (формат: *2025-08-15*):`,
        dateChoiceKeyboard(origin, dest)
      );
      return;
    }

    // Шаг 2б: пользователь написал дату вручную
    if (session.step === 'waiting_date') {
      const origin = session.origin;
      const dest   = session.dest;
      // Проверяем формат даты
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) {
        clearSession(chatId);
        await bot.sendChatAction(chatId, 'typing');
        const tickets = await searchFlights(origin, dest, text);
        const result  = fmtResults(tickets, origin, dest);
        const key     = `${origin}-${dest}`;
        await send(chatId, result, subscribeKeyboard(key));
      } else {
        await send(chatId,
          `⚠️ Неверный формат. Используй: *2025-08* (месяц) или *2025-08-15* (дата)\n\nИли выбери из кнопок выше.`
        );
      }
      return;
    }

    // Шаг 1б: откуда для "куда дешевле"
    if (session.step === 'waiting_origin_any') {
      clearSession(chatId);
      await bot.sendChatAction(chatId, 'typing');
      await send(chatId, `🔍 Ищу дешёвые направления из *${iata}*...`);
      const results = await searchCheapAnywhere(iata, 8);
      if (results.length === 0) {
        await send(chatId, `😔 Не удалось найти билеты из *${iata}*. Проверь название города.`, backKeyboard());
        return;
      }
      const lines = [`🌍 *Куда дешевле из ${iata}*\n`];
      results.forEach((r, i) => {
        lines.push(
          `${i+1}\\. ✈️ *${r.dest}* — ${fmtPrice(r.price)}\n` +
          `   📅 ${fmtDate(r.departDate)} · ${r.airline} · ${fmtTransfers(r.transfers)}\n` +
          `   [Купить](${r.link})`
        );
      });
      await send(chatId, lines.join('\n'), backKeyboard());
      return;
    }

    // Подписка — откуда
    if (session.step === 'waiting_sub_origin') {
      setSession(chatId, { step: 'waiting_sub_dest', subOrigin: iata });
      await send(chatId, `📍 Откуда: *${iata}*\n\nТеперь напиши город назначения:`);
      return;
    }

    // Подписка — куда
    if (session.step === 'waiting_sub_dest') {
      const origin = session.subOrigin;
      const dest   = iata;
      clearSession(chatId);
      const key = addSubscription(origin, dest);
      await send(chatId,
        `🔔 *Подписка оформлена!*\n\n✈️ *${key}* добавлен в мониторинг.\nБуду сообщать о снижении цен каждые 6 часов.`,
        backKeyboard()
      );
      return;
    }
  });

  // ── Мониторинг цен каждые 6 часов
  async function monitorPrices(notifyChatId) {
    const db     = loadData();
    const routes = Object.values(db.routes);
    if (routes.length === 0) return;

    console.log(`[flights] Мониторинг ${routes.length} маршрутов...`);

    for (const r of routes) {
      const tickets = await searchFlights(r.origin, r.dest);
      if (!tickets || !tickets[0]) continue;

      const best = tickets[0];
      const key  = `${r.origin}-${r.dest}`;
      const prev = updateHistory(key, best.price);

      if (!notifyChatId) continue;

      // Снижение цены
      if (prev && best.price < prev) {
        const drop = prev - best.price;
        await bot.sendMessage(notifyChatId,
          `📉 *Цена упала!*\n\n` +
          `✈️ *${key}*\n` +
          `💰 ${fmtPrice(best.price)} (было ${fmtPrice(prev)}, −${fmtPrice(drop)})\n` +
          `📅 ${fmtDate(best.departDate)} · ${best.airline}\n` +
          `[Купить билет](${best.link})`,
          { parse_mode: 'Markdown', disable_web_page_preview: true,
            reply_markup: backKeyboard() }
        );
      }

      // Порог цены
      if (r.threshold && best.price <= r.threshold) {
        await bot.sendMessage(notifyChatId,
          `🔥 *Цена ниже порога!*\n\n` +
          `✈️ *${key}*\n` +
          `💰 *${fmtPrice(best.price)}* ≤ порог ${fmtPrice(r.threshold)}\n` +
          `📅 ${fmtDate(best.departDate)} · ${best.airline}\n` +
          `[Купить билет](${best.link})`,
          { parse_mode: 'Markdown', disable_web_page_preview: true,
            reply_markup: backKeyboard() }
        );
      }
    }
  }

  // Запуск мониторинга каждые 6 часов
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (CHAT_ID) {
    setInterval(() => monitorPrices(CHAT_ID), 6 * 60 * 60 * 1000);
    console.log('[Джарвис] ✈️ Мониторинг цен: каждые 6 часов');
  }

  console.log('[Джарвис] ✈️ Модуль авиабилетов v2 подключён — /fly для меню');
}

module.exports = { registerFlightCommands, clearSession };
