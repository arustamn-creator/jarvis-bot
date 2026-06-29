const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseKworkEmail } = require('../kwork_parser');

test('парсит HTML-письмо с заказом', () => {
  const email = {
    subject: 'Новый заказ: Лендинг для строительной компании',
    text: '',
    html: `
      <div>
        <p>На бирже новый заказ по вашей категории.</p>
        <p>Бюджет: 15 000 ₽</p>
        <p>Нужен лендинг для строительной компании с формой заявки.</p>
        <a href="https://kwork.ru/projects/987654/lending-dlya-stroitelnoy-kompanii">Откликнуться</a>
      </div>
    `,
  };

  const result = parseKworkEmail(email);

  assert.equal(result.title, 'Лендинг для строительной компании');
  assert.equal(result.budget, '15 000 ₽');
  assert.equal(result.link, 'https://kwork.ru/projects/987654/lending-dlya-stroitelnoy-kompanii');
  assert.match(result.description, /лендинг для строительной компании/i);
});

test('парсит plain-text письмо без HTML', () => {
  const email = {
    subject: 'Новый проект: Доработка сайта на Tilda',
    text: [
      'Категория: Сайты и лендинги',
      'Бюджет: от 5000 до 8000 ₽',
      'Нужно доработать существующий сайт на Tilda, добавить интеграцию с Яндекс.Метрикой.',
      'Ссылка: https://kwork.ru/projects/123456/dorabotka-sayta-na-tilda',
    ].join('\n'),
    html: null,
  };

  const result = parseKworkEmail(email);

  assert.equal(result.title, 'Доработка сайта на Tilda');
  assert.equal(result.category, 'Сайты и лендинги');
  assert.match(result.budget, /5000/);
  assert.equal(result.link, 'https://kwork.ru/projects/123456/dorabotka-sayta-na-tilda');
});

test('не падает, если в письме нет ссылки или бюджета', () => {
  const email = {
    subject: 'Сервисное письмо Kwork',
    text: 'У вас новое сообщение в личном кабинете.',
    html: null,
  };

  const result = parseKworkEmail(email);

  assert.equal(result.link, null);
  assert.equal(result.budget, null);
  assert.equal(typeof result.description, 'string');
});
