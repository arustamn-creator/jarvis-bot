const TITLE_PREFIX = /^(новый\s+(заказ|проект)\s*:\s*)/i;
const LINK_RE = /https?:\/\/(?:www\.)?kwork\.(?:ru|com)\/projects\/[^\s"'<>]+/i;
const BUDGET_RE = /(?:от\s*)?\d[\d\s]*(?:\s*(?:до|-)\s*\d[\d\s]*)?\s?₽/i;
const CATEGORY_RE = /категория\s*:\s*([^\n<]+)/i;

function stripHtml(html) {
  return html
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>.*?<\/a>/gi, ' $1 ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractTitle(subject) {
  return subject.replace(TITLE_PREFIX, '').trim();
}

function extractLink(...sources) {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(LINK_RE);
    if (match) return match[0].replace(/["'<>]+$/, '');
  }
  return null;
}

function extractBudget(text) {
  const match = text.match(BUDGET_RE);
  return match ? match[0].trim() : null;
}

function extractCategory(text) {
  const match = text.match(CATEGORY_RE);
  return match ? match[1].trim() : null;
}

function parseKworkEmail({ subject = '', text = '', html = null }) {
  const plain = (text && text.trim()) || (html ? stripHtml(html) : '');

  return {
    title: extractTitle(subject || ''),
    budget: extractBudget(plain),
    category: extractCategory(plain),
    link: extractLink(text, html),
    description: plain,
  };
}

module.exports = { parseKworkEmail };
