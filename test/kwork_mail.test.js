const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildKworkSearchCriteria } = require('../kwork_mail');

test('buildKworkSearchCriteria ищет непрочитанные письма от kwork.ru или kwork.com', () => {
  const criteria = buildKworkSearchCriteria();

  assert.equal(criteria.seen, false);
  assert.ok(Array.isArray(criteria.or));
  assert.deepEqual(criteria.or, [{ from: 'kwork.ru' }, { from: 'kwork.com' }]);
});
