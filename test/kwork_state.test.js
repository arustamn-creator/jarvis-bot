const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadState, saveState } = require('../kwork_state');

function tmpStatePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwork_state_test_'));
  return path.join(dir, 'kwork_state.json');
}

test('loadState возвращает значения по умолчанию, если файла нет', () => {
  const statePath = tmpStatePath();

  const state = loadState(statePath);

  assert.deepEqual(state, { lastRun: null, processedMessageIds: [] });
});

test('saveState создаёт папку и пишет файл, loadState читает его обратно', () => {
  const statePath = tmpStatePath();
  const toSave = { lastRun: '2026-06-29T10:00:00.000Z', processedMessageIds: ['abc', 'def'] };

  saveState(toSave, statePath);
  const loaded = loadState(statePath);

  assert.deepEqual(loaded, toSave);
});

test('saveState создаёт несуществующую родительскую папку', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwork_state_test_'));
  const nestedPath = path.join(dir, 'nested', 'kwork_state.json');

  saveState({ lastRun: null, processedMessageIds: [] }, nestedPath);

  assert.ok(fs.existsSync(nestedPath));
});
