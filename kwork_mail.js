const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { withRetry } = require('./retry');
const { apiLimiter } = require('./rate_limits');

const KWORK_SENDER_DOMAINS = ['kwork.ru', 'kwork.com'];

function buildKworkSearchCriteria() {
  return {
    seen: false,
    or: KWORK_SENDER_DOMAINS.map((domain) => ({ from: domain })),
  };
}

function createClient() {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
    // Соединения здесь короткоживущие (fetch/markSeen и сразу logout).
    // Без socketTimeout полумёртвый сокет Gmail подвешивает fetch/logout
    // навсегда — та же болезнь, что была у client.idle() в index.js.
    socketTimeout: 60 * 1000,
  });
}

// logout() шлёт команду по сокету — на мёртвом соединении может зависнуть
// или бросить; close() рвёт сокет локально и не ждёт ответа сервера.
async function safeLogout(client) {
  try {
    await client.logout();
  } catch (_) {
    client.close();
  }
}

async function fetchUnseenKworkEmails() {
  if (!apiLimiter.allow('kwork')) {
    throw new Error('Kwork IMAP: превышен лимит запросов, пропускаю проверку почты');
  }

  const client = createClient();
  await withRetry(() => client.connect(), { label: 'Kwork IMAP connect' });

  const emails = [];
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      console.log('[kwork mail] Подключён, ищу непрочитанные письма...');
      const criteria = buildKworkSearchCriteria();
      // Сначала выкачиваем сырые письма, парсим после освобождения соединения:
      // await долгой операции внутри for-await по client.fetch() может
      // застопорить поток IMAP-ответов и подвесить цикл навсегда.
      const raw = [];
      for await (const message of client.fetch(criteria, { uid: true, source: true })) {
        raw.push({ uid: message.uid, source: message.source });
      }
      console.log(`[kwork mail] Скачано писем: ${raw.length}, парсинг...`);
      for (const message of raw) {
        const parsed = await simpleParser(message.source);
        emails.push({
          uid: message.uid,
          messageId: parsed.messageId,
          subject: parsed.subject || '',
          date: parsed.date,
          text: parsed.text || '',
          html: parsed.html || null,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await safeLogout(client);
  }
  return emails;
}

// Принимает один uid или массив — все письма помечаются одним соединением.
// Раньше открывалось соединение на каждое письмо: пачка из 10+ писем выжигала
// лимит apiLimiter и обрывала цикл на середине — уже отправленные уведомления
// оставались непрочитанными и дублировались при следующей проверке.
async function markSeen(uids) {
  const list = Array.isArray(uids) ? uids : [uids];
  if (!list.length) return;

  if (!apiLimiter.allow('kwork')) {
    throw new Error('Kwork IMAP: превышен лимит запросов, пропускаю markSeen');
  }

  const client = createClient();
  await withRetry(() => client.connect(), { label: 'Kwork IMAP connect' });
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid: list.join(',') }, ['\\Seen'], { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await safeLogout(client);
  }
}

module.exports = { fetchUnseenKworkEmails, markSeen, buildKworkSearchCriteria };
