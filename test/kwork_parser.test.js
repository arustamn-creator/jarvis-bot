const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseKworkEmail } = require('../kwork_parser');

// Упрощённая, но структурно верная копия реального дайджест-письма Kwork:
// таблица из нескольких строк-проектов внутри одного письма.
const DIGEST_HTML = `
  <table>
    <tr>
      <td>
        <a href="https://kwork.ru/new_offer?project=1111111" style="display: block;">Лендинг для строительной компании</a>
        <div style="font-size: 12px;">Разработка и IT > Создание сайта > > Новый сайт</div>
      </td>
      <td><a href="https://kwork.ru/user/someone">Покупатель</a></td>
      <td style="text-align: center;">
        15 000 Р
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://kwork.ru/new_offer?project=2222222" style="display: block;">Логотип для кофейни</a>
        <div style="font-size: 12px;">Дизайн > Логотипы > > Разработка логотипа</div>
      </td>
      <td><a href="https://kwork.ru/user/another">Покупатель</a></td>
      <td style="text-align: center;">
        2 000 Р
      </td>
    </tr>
  </table>
`;

test('извлекает все проекты из письма-дайджеста', () => {
  const orders = parseKworkEmail({ subject: 'Новые проекты на бирже Kwork', text: '', html: DIGEST_HTML });

  assert.equal(orders.length, 2);

  assert.equal(orders[0].title, 'Лендинг для строительной компании');
  assert.equal(orders[0].category, 'Разработка и IT > Создание сайта > > Новый сайт');
  assert.equal(orders[0].budget, '15 000 ₽');
  assert.equal(orders[0].link, 'https://kwork.ru/new_offer?project=1111111');

  assert.equal(orders[1].title, 'Логотип для кофейни');
  assert.equal(orders[1].budget, '2 000 ₽');
  assert.equal(orders[1].link, 'https://kwork.ru/new_offer?project=2222222');
});

test('возвращает [], если в письме нет HTML', () => {
  const orders = parseKworkEmail({ subject: 'Сервисное письмо Kwork', text: 'У вас новое сообщение.', html: null });

  assert.deepEqual(orders, []);
});

test('возвращает [], если в письме нет ни одной строки с проектом', () => {
  const orders = parseKworkEmail({ subject: 'Kwork', text: '', html: '<p>Нет новых заказов по вашим рубрикам.</p>' });

  assert.deepEqual(orders, []);
});
