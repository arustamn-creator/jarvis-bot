const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, 'memory_db', 'kwork_state.json');
const DEFAULT_STATE = { lastRun: null, processedMessageIds: [] };

function loadState(statePath = DEFAULT_PATH) {
  if (!fs.existsSync(statePath)) {
    return { ...DEFAULT_STATE };
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

function saveState(state, statePath = DEFAULT_PATH) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

module.exports = { loadState, saveState, DEFAULT_PATH };
