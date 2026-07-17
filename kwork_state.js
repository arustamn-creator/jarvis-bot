const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, 'memory_db', 'kwork_state.json');
const DEFAULT_STATE = { lastRun: null, processedMessageIds: [] };

function loadState(statePath = DEFAULT_PATH) {
  if (!fs.existsSync(statePath)) {
    return { ...DEFAULT_STATE };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (err) {
    // Битый файл (оборванная запись) раньше ронял каждую проверку почты —
    // вечный цикл реконнектов. Дефолт хуже лишь дублями уведомлений.
    console.error('[kwork state] Битый файл состояния, начинаю с чистого:', err.message);
    return { ...DEFAULT_STATE };
  }
}

function saveState(state, statePath = DEFAULT_PATH) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  // Атомарно: пишем во временный файл и переименовываем, чтобы обрыв записи
  // не оставил после себя битый JSON.
  const tmpPath = `${statePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, statePath);
}

module.exports = { loadState, saveState, DEFAULT_PATH };
