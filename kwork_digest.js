const { fetchUnseenKworkEmails: defaultFetchUnseenKworkEmails } = require('./kwork_mail');
const { parseKworkEmail: defaultParseKworkEmail } = require('./kwork_parser');
const { rankKworkOrders: defaultRankKworkOrders } = require('./kwork_rank');

// Без parse_mode: title/reason — произвольный текст (с биржи и от Claude),
// который может содержать символы Markdown (_ * ` [) и ломать парсинг entities
// в Telegram. Plain text исключает этот класс ошибок целиком.
function formatKworkMessage(order) {
  const lines = ['🎯 Новый заказ на Kwork', order.title];
  if (order.budget) lines.push(`💰 ${order.budget}`);
  if (order.reason) lines.push(`✅ ${order.reason}`);
  if (order.link) lines.push(order.link);
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

  const orders = newEmails.flatMap(parseKworkEmail);
  const matches = orders.length ? await rankKworkOrders(orders, profileText) : [];
  const messages = matches.map(formatKworkMessage);

  return { newEmails, orders, matches, messages, checked: newEmails.length, matched: matches.length };
}

module.exports = { buildKworkDigest, formatKworkMessage };
