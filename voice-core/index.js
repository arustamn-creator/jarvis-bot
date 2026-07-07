// Voice-core v1: push-to-talk (Ctrl+Space) → запись → Groq Whisper → бэкенд.
// Ключи берутся из корневого .env репозитория.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { uIOhook, UiohookKey } = require('uiohook-napi');
const { Recorder, detectMicDevice, cleanup } = require('./recorder');
const { transcribe } = require('./stt');
const { ask } = require('./backend');

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('[voice-core] GROQ_API_KEY не задан в .env');
    process.exit(1);
  }

  const device = await detectMicDevice();
  console.log(`[voice-core] Микрофон: ${device}`);

  const recorder = new Recorder(device);
  let recording = false;
  let busy = false;

  async function onRelease() {
    const rec = await recorder.stop();
    if (!rec) {
      console.log('[voice-core] Запись слишком короткая — пропускаю.');
      return;
    }
    if (busy) {
      console.log('[voice-core] Предыдущий запрос ещё обрабатывается — пропускаю.');
      cleanup(rec.path);
      return;
    }
    busy = true;
    try {
      console.log(`[voice-core] Записано ${(rec.durationMs / 1000).toFixed(1)}с, распознаю...`);
      const text = await transcribe(rec.path);
      if (!text) {
        console.log('[voice-core] Речь не распознана.');
        return;
      }
      console.log(`[voice-core] 📝 Распознано: "${text}"`);
      console.log('[voice-core] Отправляю в бэкенд...');
      const reply = await ask(text);
      console.log(`[voice-core] 🤖 Ответ: ${reply}`);
    } catch (err) {
      console.error('[voice-core] Ошибка:', err.response?.data?.error || err.message);
    } finally {
      cleanup(rec.path);
      busy = false;
    }
  }

  uIOhook.on('keydown', (e) => {
    // keydown автоповторяется, пока клавиша зажата — флаг recording гасит повторы
    if (e.keycode === UiohookKey.Space && e.ctrlKey && !recording) {
      recording = true;
      recorder.start();
      console.log('[voice-core] 🎤 Слушаю... (отпусти Space, чтобы закончить)');
    }
  });

  uIOhook.on('keyup', (e) => {
    // Стоп по отпусканию Space независимо от Ctrl — иначе запись зависнет,
    // если Ctrl отпустили первым.
    if (e.keycode === UiohookKey.Space && recording) {
      recording = false;
      onRelease().catch((err) => console.error('[voice-core] Ошибка:', err.message));
    }
  });

  uIOhook.start();
  console.log('[voice-core] ✅ Готов. Зажми Ctrl+Space и говори.');
}

main().catch((err) => {
  console.error('[voice-core] Не удалось запуститься:', err.message);
  process.exit(1);
});
