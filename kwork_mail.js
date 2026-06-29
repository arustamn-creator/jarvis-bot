const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

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
  });
}

async function fetchUnseenKworkEmails() {
  const client = createClient();
  await client.connect();

  const emails = [];
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const criteria = buildKworkSearchCriteria();
      for await (const message of client.fetch(criteria, { uid: true, source: true })) {
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
    await client.logout();
  }
  return emails;
}

async function markSeen(uid) {
  const client = createClient();
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid }, ['\\Seen']);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

module.exports = { fetchUnseenKworkEmails, markSeen, buildKworkSearchCriteria };
