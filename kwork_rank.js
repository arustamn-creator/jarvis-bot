const { callClaude: defaultCallClaude } = require('./claude_client');

// Три линии услуг — заказ проходит, только если явно попадает в одну из них.
const SERVICE_LINES = {
  landing: 'лендинги/сайты под ключ',
  seo: 'SEO-аудит сайта',
  tgbot: 'Telegram-боты и автоматизация',
};

const MIN_HIRE_RATE = 50; // нанято ≥ 50%
const MAX_OFFERS = 9; // предложений < 10
const MAX_EMAIL_AGE_HOURS = 12; // письмо старше — заявка уже не свежая

function extractJsonArray(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    const parsed = JSON.parse(candidate.trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Жёсткие числовые критерии. Каждый: true — прошёл, false — завален,
// null — данных нет (в письме-дайджесте Kwork их сейчас не присылают).
function checkHardCriteria(order, now = Date.now()) {
  const hireRate =
    typeof order.hireRate === 'number' ? order.hireRate >= MIN_HIRE_RATE : null;
  const offers =
    typeof order.offers === 'number' ? order.offers <= MAX_OFFERS : null;

  let fresh = null;
  if (order.emailDate) {
    const ageMs = now - new Date(order.emailDate).getTime();
    fresh = ageMs <= MAX_EMAIL_AGE_HOURS * 3600 * 1000;
  }

  return { hireRate, offers, fresh };
}

function buildPrompt(orders) {
  const list = orders
    .map(
      (o, i) =>
        `${i}. ${o.title}\nКатегория: ${o.category || 'не указана'}\nБюджет: ${o.budget || 'не указан'}\nОписание: ${(o.description || '').slice(0, 400)}`
    )
    .join('\n\n');

  return (
    'Классифицируй каждый заказ строго в одну из трёх линий услуг или в null:\n' +
    '- "landing" — лендинги и простые сайты под ключ: продающие страницы, визитки, корпоративные сайты.\n' +
    '- "seo" — SEO-аудит существующего сайта.\n' +
    '- "tgbot" — Telegram-боты и автоматизация процессов малого бизнеса.\n\n' +
    'Правила:\n' +
    '- Оценивай суть заказа целиком, а не отдельные слова. Совпадение по одному слову ' +
    '("бот", "сайт", "SEO") при чужой сути (SMM, дизайн, CRM, мобильные приложения, парсинг) — это null.\n' +
    '- Кастомная разработка на фреймворках (Vue, React, Angular, SPA на TypeScript), ' +
    'интернет-магазины с базой данных, маркетплейсы, доработка чужих движков — это НЕ "landing", ставь null.\n' +
    '- Сомневаешься — ставь null. Ложный пропуск хуже пропущенного заказа.\n\n' +
    `Заказы:\n\n${list}\n\n` +
    'Верни ТОЛЬКО валидный JSON-массив по ВСЕМ заказам: ' +
    '[{ "index": number, "line": "landing" | "seo" | "tgbot" | null, "reason": string }]. ' +
    'Без пояснений вне JSON.'
  );
}

// Заказ проходит, только если ни один из 4 критериев не завален:
// нанято ≥50%, предложений <10, письмо свежее, есть явная линия услуг.
// Критерии с отсутствующими данными (null) не роняют заказ, но снимают
// passedAll — такие уходят тихим сообщением без пуша.
async function rankKworkOrders(
  orders,
  profileText,
  { callClaude = defaultCallClaude, now = Date.now() } = {}
) {
  if (!orders.length) return [];

  const reply = await callClaude({
    system:
      'Ты — строгий фильтр заказов с биржи Kwork для фрилансера. ' +
      'Твоя задача — отсеивать всё, что не попадает в его линии услуг.',
    messages: [{ role: 'user', content: buildPrompt(orders) }],
  });

  const verdicts = extractJsonArray(reply);
  if (!verdicts) return [];

  const results = [];
  for (const v of verdicts) {
    if (!Number.isInteger(v.index) || !orders[v.index]) continue;

    const line = SERVICE_LINES[v.line] ? v.line : null;
    if (!line) continue; // критерий 4 завален — заказ отбрасываем

    const order = orders[v.index];
    const hard = checkHardCriteria(order, now);
    // false = критерий явно завален — не присылаем вообще
    if (hard.hireRate === false || hard.offers === false || hard.fresh === false) continue;

    const criteria = { ...hard, line };
    results.push({
      ...order,
      line,
      reason: v.reason || '',
      criteria,
      passedAll: hard.hireRate === true && hard.offers === true && hard.fresh === true,
    });
  }
  return results;
}

module.exports = { rankKworkOrders, checkHardCriteria, SERVICE_LINES };
