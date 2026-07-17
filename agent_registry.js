// In-memory реестр "агентов" бота для dashboard API — процессы index.js,
// смоделированные как агенты с id/status/lastRun и кольцевым буфером логов.
// Синглтон в рамках процесса, без внешнего хранилища — состояние живёт,
// пока жив процесс бота (как и сам бот).

const MAX_LOGS_PER_AGENT = 200;

const AGENT_DEFS = {
  'chat-handler': {
    name: 'Chat Handler',
    description: 'Обрабатывает текстовые сообщения Telegram через askClaude (Claude API + Supabase память)',
    schedule: null,
    runnable: false,
  },
  'kwork-monitor': {
    name: 'Kwork Monitor',
    description: 'Мониторинг заказов Kwork через Gmail IMAP IDLE, дайджест новых заказов в Telegram',
    schedule: 'IMAP IDLE (постоянное соединение), переподключение через 30с при обрыве',
    runnable: true,
  },
  'voice-pipeline': {
    name: 'Voice Pipeline',
    description: 'Голосовые сообщения: скачивание → ffmpeg → Whisper (Groq) → Claude → синтез речи (опц.)',
    schedule: null,
    runnable: false,
  },
  'marketing-generator': {
    name: 'Marketing Generator',
    description: 'Генерирует тексты профиля/откликов/постов под команду /marketing через Claude',
    schedule: null,
    runnable: false,
  },
  'kwork-response-drafter': {
    name: 'Kwork Response Drafter',
    description: 'Черновик отклика на заказ Kwork по формуле fix-плана через команду /draft. Отправляет только Рустам сам',
    schedule: null,
    runnable: false,
  },
};

const state = new Map();

function ensure(id) {
  if (!state.has(id)) {
    state.set(id, { status: 'idle', lastRun: null, lastError: null, logs: [] });
  }
  return state.get(id);
}

for (const id of Object.keys(AGENT_DEFS)) ensure(id);

function exists(id) {
  return Object.prototype.hasOwnProperty.call(AGENT_DEFS, id);
}

function log(id, message, level = 'info') {
  const entry = { timestamp: new Date().toISOString(), level, message };
  const s = ensure(id);
  s.logs.push(entry);
  if (s.logs.length > MAX_LOGS_PER_AGENT) s.logs.shift();
  return entry;
}

function recordStart(id, message) {
  const s = ensure(id);
  s.status = 'active';
  log(id, message || `${id}: запуск`);
}

function recordSuccess(id, message) {
  const s = ensure(id);
  s.status = 'idle';
  s.lastRun = new Date().toISOString();
  s.lastError = null;
  log(id, message || `${id}: завершено успешно`);
}

function recordError(id, err) {
  const s = ensure(id);
  const errMessage = err instanceof Error ? err.message : String(err);
  s.status = 'error';
  s.lastRun = new Date().toISOString();
  s.lastError = errMessage;
  log(id, `${id}: ошибка — ${errMessage}`, 'error');
}

function toSummary(id) {
  const def = AGENT_DEFS[id];
  const s = ensure(id);
  return {
    id,
    name: def.name,
    description: def.description,
    schedule: def.schedule,
    runnable: def.runnable,
    status: s.status,
    lastRun: s.lastRun,
    lastError: s.lastError,
  };
}

function listAgents() {
  return Object.keys(AGENT_DEFS).map(toSummary);
}

function getAgent(id) {
  if (!exists(id)) return null;
  const s = ensure(id);
  return {
    ...toSummary(id),
    logs: s.logs.slice(-20),
  };
}

function getLogs(id, limit = 50) {
  if (!exists(id)) return null;
  const s = ensure(id);
  const safeLimit = Math.max(1, Math.min(limit, MAX_LOGS_PER_AGENT));
  return s.logs.slice(-safeLimit);
}

module.exports = {
  AGENT_DEFS,
  exists,
  log,
  recordStart,
  recordSuccess,
  recordError,
  listAgents,
  getAgent,
  getLogs,
};
