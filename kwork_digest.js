const { fetchUnseenKworkEmails: defaultFetchUnseenKworkEmails } = require('./kwork_mail');
const { parseKworkEmail: defaultParseKworkEmail } = require('./kwork_parser');
const { rankKworkOrders: defaultRankKworkOrders } = require('./kwork_rank');
const { SERVICE_LINES } = require('./kwork_rank');

const MD_SPECIAL = /[_*[\]()~`>#+\-=|{}.!\\]/g;

function escapeMd(text) {
  return String(text).replace(MD_SPECIAL, '\\$&');
}

// Inside MarkdownV2 link parentheses only ) and \ need escaping.
function escapeUrl(url) {
  return String(url).replace(/[)\\]/g, '\\$&');
}

// Явная строка по 4 критериям фильтра, чтобы решение бота можно было
// проверить глазами. ❓ = данных нет в письме-дайджесте Kwork.
function formatCriteria(order) {
  const c = order.criteria || {};
  const mark = (v) => (v === true ? '✅' : v === false ? '❌' : '❓');
  const hire =
    typeof order.hireRate === 'number' ? `${order.hireRate}%` : 'н/д';
  const offers = typeof order.offers === 'number' ? String(order.offers) : 'н/д';
  const freshLabel = c.fresh === true ? 'Свежая' : c.fresh === false ? 'Старая' : 'Свежесть: н/д';
  const lineLabel = c.line ? SERVICE_LINES[c.line] || c.line : '—';

  return (
    `Нанято: ${hire} ${mark(c.hireRate)} | ` +
    `Предложений: ${offers} ${mark(c.offers)} | ` +
    `${freshLabel} ${mark(c.fresh)} | ` +
    `Линия: ${lineLabel} ${mark(Boolean(c.line))}`
  );
}

function formatKworkMessage(order) {
  const lines = [`🎯 *Новый заказ на Kwork*`, escapeMd(order.title)];
  if (order.budget) lines.push(`💰 ${escapeMd(order.budget)}`);
  if (order.criteria) lines.push(`📋 ${escapeMd(formatCriteria(order))}`);
  if (order.reason) lines.push(`✅ ${escapeMd(order.reason)}`);
  if (order.link) lines.push(`[Открыть заказ](${escapeUrl(order.link)})`);
  return lines.join('\n');
}

// Читает почту, парсит и ранжирует заказы, и формирует тексты сообщений —
// не отправляет в Telegram и не помечает письма прочитанными/не пишет state.
// Это позволяет тестировать всю цепочку без подключения к Telegram API.
async function buildKworkDigest(
  profileText,
  processedMessageIds = [],
  {
    fetchUnseenKworkEmails = defaultFetchUnseenKworkEmails,
    parseKworkEmail = defaultParseKworkEmail,
    rankKworkOrders = defaultRankKworkOrders,
  } = {}
) {
  const emails = await fetchUnseenKworkEmails();
  const newEmails = emails.filter((e) => !processedMessageIds.includes(e.messageId));

  const orders = newEmails.flatMap((email) =>
    parseKworkEmail(email).map((o) => ({ ...o, emailDate: email.date || null }))
  );
  const matches = orders.length ? await rankKworkOrders(orders, profileText) : [];
  // Пуш только когда все 4 критерия подтверждены; иначе тихое сообщение.
  const messages = matches.map((m) => ({
    text: formatKworkMessage(m),
    silent: !m.passedAll,
  }));

  return { newEmails, orders, matches, messages, checked: newEmails.length, matched: matches.length };
}

module.exports = { buildKworkDigest, formatKworkMessage, formatCriteria };
