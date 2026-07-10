const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rankKworkOrders, checkHardCriteria } = require('../kwork_rank');

const PROFILE = 'Лендинги и сайты под ключ для B2B и малого бизнеса.';
const NOW = new Date('2026-07-10T12:00:00Z').getTime();
const FRESH_DATE = new Date('2026-07-10T11:00:00Z'); // час назад — свежая
const OLD_DATE = new Date('2026-07-09T10:00:00Z'); // 26 часов — старая

const ORDERS = [
  {
    title: 'Лендинг для стройкомпании',
    budget: '15 000 ₽',
    description: 'Продающая страница для строительной компании',
    link: 'https://kwork.ru/projects/1',
    emailDate: FRESH_DATE,
  },
  {
    title: 'Логотип для кофейни',
    budget: '2 000 ₽',
    description: 'Дизайн логотипа',
    link: 'https://kwork.ru/projects/2',
    emailDate: FRESH_DATE,
  },
];

test('не вызывает Claude и возвращает [], если заказов нет', async () => {
  const callClaude = () => {
    throw new Error('не должно вызываться для пустого списка');
  };

  const result = await rankKworkOrders([], PROFILE, { callClaude });

  assert.deepEqual(result, []);
});

test('пропускает заказ с явной линией услуг и отбрасывает line=null', async () => {
  const callClaude = async () =>
    JSON.stringify([
      { index: 0, line: 'landing', reason: 'Продающий лендинг для B2B' },
      { index: 1, line: null, reason: 'Дизайн логотипа — не наша линия' },
    ]);

  const result = await rankKworkOrders(ORDERS, PROFILE, { callClaude, now: NOW });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Лендинг для стройкомпании');
  assert.equal(result[0].line, 'landing');
  assert.equal(result[0].criteria.fresh, true);
  // Нанято/предложений в письме нет — критерии неизвестны, passedAll снят
  assert.equal(result[0].criteria.hireRate, null);
  assert.equal(result[0].criteria.offers, null);
  assert.equal(result[0].passedAll, false);
});

test('отбрасывает заказ из старого письма, даже если линия совпала', async () => {
  const orders = [{ ...ORDERS[0], emailDate: OLD_DATE }];
  const callClaude = async () =>
    JSON.stringify([{ index: 0, line: 'landing', reason: 'ок' }]);

  const result = await rankKworkOrders(orders, PROFILE, { callClaude, now: NOW });

  assert.deepEqual(result, []);
});

test('отбрасывает заказ с заваленными hireRate/offers, даже если модель одобрила', async () => {
  const orders = [
    { ...ORDERS[0], hireRate: 30, offers: 4 },
    { ...ORDERS[0], hireRate: 80, offers: 28 },
  ];
  const callClaude = async () =>
    JSON.stringify([
      { index: 0, line: 'landing', reason: 'ок' },
      { index: 1, line: 'landing', reason: 'ок' },
    ]);

  const result = await rankKworkOrders(orders, PROFILE, { callClaude, now: NOW });

  assert.deepEqual(result, []);
});

test('passedAll=true только когда все 4 критерия подтверждены данными', async () => {
  const orders = [{ ...ORDERS[0], hireRate: 62, offers: 4 }];
  const callClaude = async () =>
    JSON.stringify([{ index: 0, line: 'landing', reason: 'ок' }]);

  const result = await rankKworkOrders(orders, PROFILE, { callClaude, now: NOW });

  assert.equal(result.length, 1);
  assert.equal(result[0].passedAll, true);
  assert.deepEqual(result[0].criteria, { hireRate: true, offers: true, fresh: true, line: 'landing' });
});

test('кейс цветочного магазина: кастомный интернет-магазин не проходит фильтр', async () => {
  const orders = [
    {
      title: 'Создание онлайн магазина по покупке цветов',
      budget: '2 000 ₽',
      description:
        'Нужен интернет-магазин цветов на Vue/TypeScript с базой данных и хостингом. Срок 3 дня.',
      link: 'https://kwork.ru/projects/3',
      emailDate: FRESH_DATE,
    },
  ];
  // Модель по новым правилам обязана вернуть null (кастомный магазин на
  // фреймворке — не "лендинги под ключ").
  const callClaude = async () =>
    JSON.stringify([
      { index: 0, line: null, reason: 'Интернет-магазин на Vue/TS с БД — не лендинг под ключ' },
    ]);

  const result = await rankKworkOrders(orders, PROFILE, { callClaude, now: NOW });

  assert.deepEqual(result, []);
});

test('кейс цветочного магазина: даже при ошибке модели заваленные метрики режут заказ', async () => {
  const orders = [
    {
      title: 'Создание онлайн магазина по покупке цветов',
      budget: '2 000 ₽',
      description: 'Vue/TS, база данных, хостинг, 3 дня',
      link: 'https://kwork.ru/projects/3',
      emailDate: FRESH_DATE,
      offers: 28, // если поле однажды появится в данных — фильтр сработает
    },
  ];
  // Худший случай: модель ошибочно посчитала магазин "лендингом"
  const callClaude = async () =>
    JSON.stringify([{ index: 0, line: 'landing', reason: 'похоже на сайт' }]);

  const result = await rankKworkOrders(orders, PROFILE, { callClaude, now: NOW });

  assert.deepEqual(result, []);
});

test('возвращает [], если модель ответила невалидным JSON, без падения', async () => {
  const callClaude = async () => 'извините, не могу это сделать';

  const result = await rankKworkOrders(ORDERS, PROFILE, { callClaude });

  assert.deepEqual(result, []);
});

test('checkHardCriteria: null для отсутствующих данных, границы 50% и 10 предложений', () => {
  assert.deepEqual(checkHardCriteria({}, NOW), { hireRate: null, offers: null, fresh: null });
  assert.deepEqual(checkHardCriteria({ hireRate: 50, offers: 9, emailDate: FRESH_DATE }, NOW), {
    hireRate: true,
    offers: true,
    fresh: true,
  });
  assert.deepEqual(checkHardCriteria({ hireRate: 49, offers: 10, emailDate: OLD_DATE }, NOW), {
    hireRate: false,
    offers: false,
    fresh: false,
  });
});
