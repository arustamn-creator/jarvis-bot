const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rankKworkOrders } = require('../kwork_rank');

const PROFILE = 'Лендинги и сайты под ключ для B2B и малого бизнеса.';

const ORDERS = [
  { title: 'Лендинг для стройкомпании', budget: '15 000 ₽', description: '...', link: 'https://kwork.ru/projects/1' },
  { title: 'Логотип для кофейни', budget: '2 000 ₽', description: '...', link: 'https://kwork.ru/projects/2' },
];

test('не вызывает Claude и возвращает [], если заказов нет', async () => {
  const callClaude = () => {
    throw new Error('не должно вызываться для пустого списка');
  };

  const result = await rankKworkOrders([], PROFILE, { callClaude });

  assert.deepEqual(result, []);
});

test('возвращает подходящие заказы с причиной из ответа модели', async () => {
  const callClaude = async () => JSON.stringify([{ index: 0, reason: 'Подходит по профилю: лендинг для B2B' }]);

  const result = await rankKworkOrders(ORDERS, PROFILE, { callClaude });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Лендинг для стройкомпании');
  assert.equal(result[0].reason, 'Подходит по профилю: лендинг для B2B');
});

test('понимает ответ, обёрнутый в ```json блок', async () => {
  const callClaude = async () => '```json\n[{"index": 1, "reason": "ок"}]\n```';

  const result = await rankKworkOrders(ORDERS, PROFILE, { callClaude });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Логотип для кофейни');
});

test('возвращает [], если модель ответила невалидным JSON, без падения', async () => {
  const callClaude = async () => 'извините, не могу это сделать';

  const result = await rankKworkOrders(ORDERS, PROFILE, { callClaude });

  assert.deepEqual(result, []);
});
