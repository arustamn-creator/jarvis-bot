const { callClaude: defaultCallClaude } = require('./claude_client');

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

function buildPrompt(orders, profileText) {
  const list = orders
    .map((o, i) => `${i}. ${o.title}\nБюджет: ${o.budget || 'не указан'}\nСсылка: ${o.link || 'нет'}\nОписание: ${(o.description || '').slice(0, 400)}`)
    .join('\n\n');

  return (
    `Профиль фрилансера: ${profileText}\n\n` +
    `Вот список новых заказов с Kwork:\n\n${list}\n\n` +
    'Верни ТОЛЬКО валидный JSON-массив объектов { "index": number, "reason": string } ' +
    'для заказов, которые реально подходят этому профилю. Неподходящие не включай. ' +
    'Если ничего не подходит — верни []. Без пояснений вне JSON.'
  );
}

async function rankKworkOrders(orders, profileText, { callClaude = defaultCallClaude } = {}) {
  if (!orders.length) return [];

  const reply = await callClaude({
    system: 'Ты помогаешь фрилансеру отбирать подходящие заказы с биржи Kwork.',
    messages: [{ role: 'user', content: buildPrompt(orders, profileText) }],
  });

  const matches = extractJsonArray(reply);
  if (!matches) return [];

  return matches
    .filter((m) => Number.isInteger(m.index) && orders[m.index])
    .map((m) => ({ ...orders[m.index], reason: m.reason || '' }));
}

module.exports = { rankKworkOrders };
