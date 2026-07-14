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
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { ImapFlow } = require('imapflow');
const { saveMessage, getHistory } = require('./memory');
const { callClaude, llmEvents } = require('./claude_client');
const { telegramLimiter } = require('./rate_limits');
const { markSeen } = require('./kwork_mail');
const { loadState, saveState } = require('./kwork_state');
const { buildKworkDigest } = require('./kwork_digest');
// node-telegram-bot-api's internal HTTP client (request, forever-agent) has no
// timeout by default — a half-open socket (e.g. mid setWebHook-clear-on-409
// retry) hangs the request forever, so the polling loop's own reschedule
// never fires again and the bot goes silently unresponsive with no restart.
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true,
  request: { timeout: 15000 },
});
bot.on('polling_error', (err) => {
  console.error('[Джарвис] Ошибка поллинга:', err.message);
});

process.on('SIGTERM', async () => {
  console.log('[Джарвис] SIGTERM — останавливаю поллинг...');
  await bot.stopPolling();
  process.exit(0);
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Уведомления о деградации LLM — не молча падать, слать в Telegram.
llmEvents.on('fallback', ({ reason }) => {
  bot.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `⚠️ Anthropic недоступен (${reason}), временно переключился на Groq`
  ).catch((err) => console.error('[llm] Не удалось отправить уведомление о fallback:', err.message));
});

llmEvents.on('exhausted', ({ anthropicError, groqError }) => {
  bot.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `❌ LLM полностью недоступен.\nAnthropic: ${anthropicError}\nGroq: ${groqError}`
  ).catch((err) => console.error('[llm] Не удалось отправить уведомление об отказе:', err.message));
});

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

  for (const email of digest.newEmails) {
    if (email.date) {
      const lagSec = Math.round((Date.now() - new Date(email.date).getTime()) / 1000);
      console.log(`[kwork] Письмо от ${email.date.toISOString()}, обнаружено через ${lagSec}с`);
    }
  }

  if (notifyChatId) {
    for (const message of digest.messages) {
      try {
        await bot.sendMessage(notifyChatId, message.text, {
          parse_mode: 'MarkdownV2',
          // Тихое сообщение, пока не подтверждены все 4 критерия фильтра
          disable_notification: message.silent,
        });
      } catch (err) {
        // Не даём одному проблемному сообщению заблокировать markSeen/saveState
        // для всей пачки — иначе письма так и останутся непрочитанными и будут
        // бесконечно пересчитываться при каждой проверке.
        console.error('[kwork] Не удалось отправить сообщение о заказе:', err.message);
      }
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

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

// client.idle() has no built-in timeout — a half-open TCP socket (Gmail drops
// idle IMAP connections silently sometimes) leaves it pending forever with no
// error, so the reconnect logic below never fires. Race it against a timer and
// force the socket closed if it fires, so the outer catch/reconnect always runs.
async function idleWithTimeout(client, timeoutMs) {
  let timer;
  let timedOut = false;
  try {
    await Promise.race([
      client.idle(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          client.close();
          reject(new Error('IDLE timeout — соединение не отвечает'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  return timedOut;
}

async function startKworkImapIdle(notifyChatId) {
  while (true) {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      logger: false,
    });
    let hasNewMail = false;
    let connectionDead = false;
    client.on('exists', () => { hasNewMail = true; });
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        console.log('[kwork IDLE] Подключён, начальная проверка почты...');
        await checkKworkOrders(notifyChatId);
        while (true) {
          await idleWithTimeout(client, IDLE_TIMEOUT_MS);
          // Gmail шлёт по IDLE не только реальные новые письма, но и keepalive/
          // flag-обновления — client.idle() резолвится и на них. Без фильтра
          // по 'exists' это гоняло полный checkKworkOrders() каждые ~2 сек,
          // выжигало лимит IMAP-запросов и раз в 10-20 мин рвало соединение.
          if (!hasNewMail) continue;
          hasNewMail = false;
          await checkKworkOrders(notifyChatId);
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      connectionDead = err.message === 'IDLE timeout — соединение не отвечает' || err.code === 'NoConnection';
      console.error('[kwork IDLE] Ошибка, переподключение через 30 сек:', err.message);
    } finally {
      // После таймаута сокет уже принудительно закрыт (client.close()) —
      // logout() послал бы команду по мёртвому сокету и завис бы точно так же.
      if (!connectionDead) {
        try { await client.logout(); } catch (_) {}
      }
    }
    await new Promise((r) => setTimeout(r, 30000));
  }
}

if (process.env.TELEGRAM_CHAT_ID && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  startKworkImapIdle(process.env.TELEGRAM_CHAT_ID);
  console.log('[Джарвис] 🔍 Мониторинг заказов Kwork запущен через IMAP IDLE');
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
    // exec's own err.message only echoes the command line, not why it failed —
    // stderr (e.g. "ffmpeg: not found") only surfaces via the 3rd callback arg.
    exec(`ffmpeg -i "${oggPath}" -ar 16000 -ac 1 -b:a 64k "${mp3Path}" -y`, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ffmpeg: ${err.message}\nstderr: ${stderr}`));
      } else {
        resolve(mp3Path);
      }
    });
  });
}

async function transcribeWithWhisper(mp3Path) {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(mp3Path),
    model: 'whisper-large-v3',
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
  if (!telegramLimiter.allow(chatId)) return;

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
  if (!telegramLimiter.allow(chatId)) return;

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
    // err.message alone hides the actual cause (ffmpeg stderr, Groq's parsed
    // error body) — log everything so a failure is diagnosable from logs alone.
    console.error('[voice] Полная ошибка:', err.stack || err.message);
    if (err.status || err.error) {
      console.error('[voice] Groq API ответ:', JSON.stringify({ status: err.status, error: err.error }));
    }
    await bot.sendMessage(chatId, `❌ Ошибка при обработке голосового сообщения: ${err.message}`);
  } finally {
    cleanupFiles(oggPath, mp3Path);
  }
});

// === HTTP API (вход для voice-core) ===

const express = require('express');
const crypto = require('crypto');

// Сравнение токенов постоянного времени; длины сперва сравниваем отдельно,
// иначе timingSafeEqual бросит исключение на буферах разной длины.
function tokenMatches(provided) {
  const expected = process.env.VOICE_API_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const api = express();
api.use(express.json());

api.post('/api/ask', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tokenMatches(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  const chatId = Number(process.env.TELEGRAM_CHAT_ID);
  if (!chatId) {
    return res.status(500).json({ error: 'TELEGRAM_CHAT_ID not configured' });
  }

  try {
    const reply = await askClaude(chatId, text);
    res.json({ reply });
  } catch (err) {
    console.error('[api/ask]', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
api.listen(PORT, () => {
  console.log(`[Джарвис] HTTP API слушает порт ${PORT}`);
});

// === Запуск ===

console.log('✅ Jarvis Bot запущен и ожидает сообщения...');
