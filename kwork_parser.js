// Письмо Kwork — дайджест: одна таблица со строками вида
// [ссылка+название+категория] | [покупатель] | [цена "N N N Р"].
const PROJECT_ROW_RE =
  /<a href="(https:\/\/kwork\.ru\/new_offer\?project=\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*>([^<]+)<\/div>[\s\S]*?(\d[\d\s]*)\s*Р/g;

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseKworkEmail({ html = null }) {
  if (!html) return [];

  const orders = [];
  const re = new RegExp(PROJECT_ROW_RE);
  let match;
  while ((match = re.exec(html))) {
    const [, link, rawTitle, rawCategory, rawBudget] = match;
    const category = decodeEntities(rawCategory);
    orders.push({
      title: decodeEntities(rawTitle),
      category,
      budget: `${decodeEntities(rawBudget)} ₽`,
      link,
      description: category,
    });
  }
  return orders;
}

module.exports = { parseKworkEmail };
