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
  const rankKworkOrders = async (orders) => [{ ...orders[0], reason: 'Подходит по профилю' }];

  const digest = await buildKworkDigest(PROFILE, [], { fetchUnseenKworkEmails, parseKworkEmail, rankKworkOrders });

  assert.equal(digest.checked, 2);
  assert.equal(digest.matched, 1);
  assert.equal(digest.newEmails.length, 2);
  assert.equal(digest.messages.length, 1);
  assert.match(digest.messages[0], /Лендинг для стройкомпании/);
  assert.match(digest.messages[0], /15 000 ₽/);
  assert.match(digest.messages[0], /Подходит по профилю/);
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
