const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildKworkDigest, formatKworkMessage } = require('../kwork_digest');

const PROFILE = 'Лендинги и сайты под ключ для B2B и малого бизнеса.';

test('buildKworkDigest не трогает Telegram/IMAP-запись — только читает и формирует текст', async () => {
  const fetchUnseenKworkEmails = async () => [
    { uid: 1, messageId: 'msg-1', subject: 'Новые проекты на бирже Kwork', html: '<html-1>' },
    { uid: 2, messageId: 'msg-2', subject: 'Новые проекты на бирже Kwork', html: '<html-2>' },
  ];
  const parseKworkEmail = (email) =>
    email.html === '<html-1>'
      ? [{ title: 'Лендинг для стройкомпании', budget: '15 000 ₽', link: 'https://kwork.ru/new_offer?project=1' }]
      : [{ title: 'Логотип для кофейни', budget: '2 000 ₽', link: 'https://kwork.ru/new_offer?project=2' }];
  const rankKworkOrders = async (orders) => [
    {
      ...orders[0],
      reason: 'Подходит по профилю',
      criteria: { hireRate: null, offers: null, fresh: true, line: 'landing' },
      passedAll: false,
    },
  ];

  const digest = await buildKworkDigest(PROFILE, [], { fetchUnseenKworkEmails, parseKworkEmail, rankKworkOrders });

  assert.equal(digest.checked, 2);
  assert.equal(digest.matched, 1);
  assert.equal(digest.newEmails.length, 2);
  assert.equal(digest.messages.length, 1);
  assert.match(digest.messages[0].text, /Лендинг для стройкомпании/);
  assert.match(digest.messages[0].text, /15 000 ₽/);
  assert.match(digest.messages[0].text, /Подходит по профилю/);
  // Не все критерии подтверждены — сообщение тихое
  assert.equal(digest.messages[0].silent, true);
});

test('buildKworkDigest: пуш только при passedAll, критерии видны в тексте', async () => {
  const fetchUnseenKworkEmails = async () => [
    { uid: 1, messageId: 'msg-1', html: '<html>', date: new Date('2026-07-10T11:00:00Z') },
  ];
  const parseKworkEmail = () => [{ title: 'Лендинг', budget: '15 000 ₽', link: null }];
  const rankKworkOrders = async (orders) => [
    {
      ...orders[0],
      hireRate: 62,
      offers: 4,
      reason: 'ок',
      criteria: { hireRate: true, offers: true, fresh: true, line: 'landing' },
      passedAll: true,
    },
  ];

  const digest = await buildKworkDigest(PROFILE, [], { fetchUnseenKworkEmails, parseKworkEmail, rankKworkOrders });

  assert.equal(digest.messages[0].silent, false);
  assert.match(digest.messages[0].text, /Нанято: 62% ✅/);
  assert.match(digest.messages[0].text, /Предложений: 4 ✅/);
  assert.match(digest.messages[0].text, /Свежая ✅/);
  assert.match(digest.messages[0].text, /лендинги/);
});

test('buildKworkDigest прокидывает дату письма в заказы для проверки свежести', async () => {
  const emailDate = new Date('2026-07-10T11:00:00Z');
  const fetchUnseenKworkEmails = async () => [{ uid: 1, messageId: 'msg-1', html: '<html>', date: emailDate }];
  const parseKworkEmail = () => [{ title: 'Заказ', budget: null, link: null }];
  let seenOrders;
  const rankKworkOrders = async (orders) => {
    seenOrders = orders;
    return [];
  };

  await buildKworkDigest(PROFILE, [], { fetchUnseenKworkEmails, parseKworkEmail, rankKworkOrders });

  assert.equal(seenOrders[0].emailDate, emailDate);
});

test('buildKworkDigest пропускает уже обработанные письма (по messageId)', async () => {
  const fetchUnseenKworkEmails = async () => [
    { uid: 1, messageId: 'already-seen', html: '<html>' },
    { uid: 2, messageId: 'fresh', html: '<html>' },
  ];
  const parseKworkEmail = () => [{ title: 'Заказ', budget: null, link: null }];
  const rankKworkOrders = async (orders) => orders.map((o) => ({ ...o, reason: 'ok' }));

  const digest = await buildKworkDigest(PROFILE, ['already-seen'], { fetchUnseenKworkEmails, parseKworkEmail, rankKworkOrders });

  assert.equal(digest.checked, 1);
  assert.equal(digest.newEmails[0].messageId, 'fresh');
});

test('buildKworkDigest возвращает пустой результат без новых писем, не вызывая ранжирование', async () => {
  const fetchUnseenKworkEmails = async () => [];
  const rankKworkOrders = async () => {
    throw new Error('не должно вызываться без писем');
  };

  const digest = await buildKworkDigest(PROFILE, [], { fetchUnseenKworkEmails, rankKworkOrders });

  assert.equal(digest.checked, 0);
  assert.equal(digest.matched, 0);
  assert.deepEqual(digest.messages, []);
});

test('formatKworkMessage собирает читаемый текст из заказа', () => {
  const text = formatKworkMessage({
    title: 'Лендинг для стройкомпании',
    budget: '15 000 ₽',
    reason: 'Подходит по профилю',
    link: 'https://kwork.ru/new_offer?project=1',
  });

  assert.match(text, /Лендинг для стройкомпании/);
  assert.match(text, /15 000 ₽/);
  assert.match(text, /Подходит по профилю/);
  assert.match(text, /kwork\.ru\/new_offer\?project=1/);
});

test('formatKworkMessage экранирует спецсимволы MarkdownV2 в названии и причине', () => {
  const text = formatKworkMessage({
    title: 'Доработка amo_crm и интеграция [API]',
    budget: '5 000 ₽',
    reason: 'Подходит: нужен сайт_v2 с формой *заявки* и интеграцией [CRM]',
    link: 'https://kwork.ru/new_offer?project=1',
  });

  assert.ok(text.includes('amo\\_crm'), 'underscore in title escaped');
  assert.ok(text.includes('\\[API\\]'), 'brackets in title escaped');
  assert.ok(text.includes('сайт\\_v2'), 'underscore in reason escaped');
  assert.ok(text.includes('\\*заявки\\*'), 'asterisks in reason escaped');
  assert.ok(text.includes('\\[CRM\\]'), 'brackets in reason escaped');
});
