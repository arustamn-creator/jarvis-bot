require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('[Джарвис] Критическая ошибка (uncaughtException):', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Джарвис] Критическая ошибка (unhandledRejection):', reason);
  process.exit(1);
});

const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const { saveMessage, getHistory } = require('./memory');
const { callClaude } = require('./claude_client');
const { markSeen } = require('./kwork_mail');
const { loadState, saveState } = require('./kwork_state');
const { buildKworkDigest } = require('./kwork_digest');
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true
});
// node-telegram-bot-api сам перехватывает ошибки поллинга (например, шторм
// 409 Conflict от второго инстанса) и не бросает их дальше как необработанное
// исключение — процесс остаётся жив, но бесполезен. Считаем ошибки подряд и
// сами завершаем процесс, чтобы Railway увидел крах и перезапустил контейнер.
const MAX_CONSECUTIVE_POLLING_ERRORS = 10;
let consecutivePollingErrors = 0;

bot.on('polling_error', (err) => {
  consecutivePollingErrors += 1;
  console.error(`[Джарвис] Ошибка поллинга (${consecutivePollingErrors}/${MAX_CONSECUTIVE_POLLING_ERRORS}): ${err.message}`);
  if (consecutivePollingErrors >= MAX_CONSECUTIVE_POLLING_ERRORS) {
    console.error('[Джарвис] Слишком много ошибок поллинга подряд — выхожу, чтобы Railway перезапустил контейнер.');
    process.exit(1);
  }
});

bot.on('message', () => {
  consecutivePollingErrors = 0;
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT =
  'Ты умный ассистент по имени Jarvis. ' +
  'Отвечай по существу и так подробно, как требует вопрос — короткий вопрос заслуживает короткий ответ, сложный можно разобрать по пунктам. ' +
  'Будь дружелюбным, по-русски, по делу.';

// === Claude ===

async function askClaude(chatId, userMessage) {
  await saveMessage(chatId, 'user', userMessage);

  const history = await getHistory(chatId);
  const reply = await callClaude({ system: SYSTEM_PROMPT, messages: history });

  await saveMessage(chatId, 'assistant', reply);

  return reply;
}

// === Мониторинг заказов Kwork ===

const KWORK_PROFILE =
  'Создаю современные лендинги и сайты под ключ. Специализируюсь на продающих ' +
  'страницах для B2B и малого бизнеса. Работаю с актуальными технологиями — ' +
  'адаптивная вёрстка, быстрая загрузка, интеграция с Яндекс.Метрикой и Telegram.';

const MAX_PROCESSED_IDS = 500;

async function checkKworkOrders(notifyChatId) {
  const state = loadState();
  const digest = await buildKworkDigest(KWORK_PROFILE, state.processedMessageIds);

  if (notifyChatId) {
    for (const text of digest.messages) {
      await bot.sendMessage(notifyChatId, text, { parse_mode: 'Markdown' });
    }
  }

  for (const email of digest.newEmails) {
    await markSeen(email.uid);
  }

  state.lastRun = new Date().toISOString();
  state.processedMessageIds = [...state.processedMessageIds, ...digest.newEmails.map((e) => e.messageId)].slice(-MAX_PROCESSED_IDS);
  saveState(state);

  return { checked: digest.checked, matched: digest.matched };
}

if (process.env.TELEGRAM_CHAT_ID) {
  cron.schedule(
    '0 * * * *',
    () => checkKworkOrders(process.env.TELEGRAM_CHAT_ID).catch((err) => console.error('[kwork] Ошибка мониторинга:', err)),
    { timezone: 'Europe/Moscow' }
  );
  console.log('[Джарвис] 🔍 Мониторинг заказов Kwork запланирован: каждый час');
}

bot.onText(/\/kwork_check/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, '🔍 Проверяю почту на новые заказы...');
    const { checked, matched } = await checkKworkOrders(chatId);
    if (matched === 0) {
      await bot.sendMessage(chatId, `Проверено писем: ${checked}. Подходящих заказов нет.`);
    }
  } catch (err) {
    console.error('[kwork_check]', err);
    await bot.sendMessage(chatId, `❌ Ошибка проверки: ${err.message}`);
  }
});

// === Работа с файлами ===

const TMP_DIR = path.join(__dirname, 'tmp');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

async function downloadTelegramFile(fileId) {
  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;
  const destPath = path.join(TMP_DIR, `voice_${fileId}.ogg`);

  const response = await axios({ url: fileUrl, responseType: 'stream' });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return destPath;
}

function convertOggToMp3(oggPath) {
  const mp3Path = oggPath.replace('.ogg', '.mp3');
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${oggPath}" -ar 16000 -ac 1 -b:a 64k "${mp3Path}" -y`, (err) => {
      if (err) {
        reject(new Error(`ffmpeg: ${err.message}`));
      } else {
        resolve(mp3Path);
      }
    });
  });
}

async function transcribeWithWhisper(mp3Path) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(mp3Path),
    model: 'whisper-1',
    language: 'ru',
  });
  return transcription.text;
}

function cleanupFiles(...files) {
  for (const f of files) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (_) {}
  }
}

// === Команды ===

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '👋 Привет! Я *Jarvis* — ваш умный ИИ-ассистент.\n\n' +
    '💬 Напишите текстовое сообщение или отправьте голосовое — я отвечу!\n\n' +
    '📋 Команды:\n' +
    '/start — приветствие\n' +
    '/clear — очистить историю разговора\n' +
    '/help — помощь',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '*Jarvis Bot — справка*\n\n' +
    'Я умею:\n' +
    '• Отвечать на любые вопросы\n' +
    '• Помогать с кодом, текстами, задачами\n' +
    '• Распознавать и понимать голосовые сообщения\n' +
    '• Запоминать контекст разговора\n\n' +
    'Просто напишите или скажите что-нибудь!',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;
  const { clearHistory } = require('./memory');
  await clearHistory(chatId);
  await bot.sendMessage(chatId, '🗑️ История разговора очищена.');
});

// === Текстовые сообщения ===

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const reply = await askClaude(chatId, msg.text);
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error('[text] Полная ошибка:', err);
    await bot.sendMessage(chatId, `❌ Ошибка: ${err.message}`);
  }
});

// === Голосовые сообщения ===

bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  let oggPath, mp3Path;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const statusMsg = await bot.sendMessage(chatId, '🎤 Распознаю голосовое сообщение...');

    ensureTmpDir();

    oggPath = await downloadTelegramFile(msg.voice.file_id);
    mp3Path = await convertOggToMp3(oggPath);

    const transcribed = await transcribeWithWhisper(mp3Path);

    if (!transcribed || !transcribed.trim()) {
      await bot.editMessageText('⚠️ Не удалось распознать речь. Попробуйте ещё раз.', {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    await bot.editMessageText(`📝 Вы сказали: _"${transcribed}"_\n\nОбрабатываю...`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    });

    await bot.sendChatAction(chatId, 'typing');
    const reply = await askClaude(chatId, transcribed);
    await bot.sendMessage(chatId, reply);

  } catch (err) {
    console.error('[voice]', err.message);
    await bot.sendMessage(chatId, '❌ Ошибка при обработке голосового сообщения.');
  } finally {
    cleanupFiles(oggPath, mp3Path);
  }
});

// === Запуск ===

console.log('✅ Jarvis Bot запущен и ожидает сообщения...');
