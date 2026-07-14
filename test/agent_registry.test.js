const { test } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../agent_registry');

test('listAgents возвращает известные агенты со статусом по умолчанию', () => {
  const agents = registry.listAgents();
  const ids = agents.map((a) => a.id);
  assert.ok(ids.includes('kwork-monitor'));
  assert.ok(ids.includes('chat-handler'));
  assert.ok(ids.includes('voice-pipeline'));
  for (const agent of agents) {
    assert.ok(['active', 'idle', 'error'].includes(agent.status));
  }
});

test('recordStart переводит агента в active, recordSuccess — обратно в idle', () => {
  registry.recordStart('kwork-monitor', 'test start');
  assert.equal(registry.getAgent('kwork-monitor').status, 'active');

  registry.recordSuccess('kwork-monitor', 'test done');
  const agent = registry.getAgent('kwork-monitor');
  assert.equal(agent.status, 'idle');
  assert.ok(agent.lastRun);
  assert.equal(agent.lastError, null);
});

test('recordError переводит агента в error и сохраняет сообщение', () => {
  registry.recordStart('kwork-monitor', 'test start');
  registry.recordError('kwork-monitor', new Error('boom'));

  const agent = registry.getAgent('kwork-monitor');
  assert.equal(agent.status, 'error');
  assert.equal(agent.lastError, 'boom');
});

test('getAgent для неизвестного id возвращает null', () => {
  assert.equal(registry.getAgent('does-not-exist'), null);
});

test('getLogs для неизвестного id возвращает null', () => {
  assert.equal(registry.getLogs('does-not-exist'), null);
});

test('getLogs возвращает последние N записей в кольцевом буфере', () => {
  for (let i = 0; i < 5; i += 1) {
    registry.log('chat-handler', `msg ${i}`);
  }
  const logs = registry.getLogs('chat-handler', 3);
  assert.equal(logs.length, 3);
  assert.equal(logs[logs.length - 1].message, 'msg 4');
});

test('exists корректно проверяет известность id агента', () => {
  assert.equal(registry.exists('kwork-monitor'), true);
  assert.equal(registry.exists('nope'), false);
});

test('getAgent включает последние 20 строк логов', () => {
  for (let i = 0; i < 25; i += 1) {
    registry.log('voice-pipeline', `entry ${i}`);
  }
  const agent = registry.getAgent('voice-pipeline');
  assert.equal(agent.logs.length, 20);
  assert.equal(agent.logs[agent.logs.length - 1].message, 'entry 24');
});
