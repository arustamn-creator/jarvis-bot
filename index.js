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
const { addTask, listTasks, completeTaskByIndex } = require('./tasks');
const { generateMarketingText } = require('./marketing');
const { callClaude, llmEvents } = require('./claude_client');
const { telegramLimiter } = require('./rate_limits');
const { markSeen } = require('./kwork_mail');
const { loadState, saveState } = require('./kwork_state');
const { buildKworkDigest } = require('./kwork_digest');
const agentRegistry = require('./agent_registry');
// Webhook вместо поллинга. Поллинг на Railway умирал при КАЖДОМ деплое:
// контейнеры перекрываются, новый ловит 409 от getUpdates старого, его цикл
// поллинга молча останавливается навсегда, затем старый контейнер убивают —
// и сообщения копятся в очереди Telegram при «живом» боте (дважды за 16.07).
// С webhook Telegram сам доставляет апдейты на публичный домен — перекрытие
// контейнеров безвредно, класса «мёртвый getUpdates» больше не существует.
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: false,
  request: { timeout: 15000 },
});

process.on('SIGTERM', () => {
  console.log('[Джарвис] SIGTERM — завершаюсь...');
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

const VOICE_REPLY_ENABLED = process.env.VOICE_REPLY_ENABLED !== 'false';

const SYSTEM_PROMPT =
  'Ты умный ассистент по имени Jarvis. ' +
  'Отвечай по существу и так подробно, как требует вопрос — короткий вопрос заслуживает короткий ответ, сложный можно разобрать по пунктам. ' +
  'Будь дружелюбным, по-русски, по делу.';

// === Claude ===

async function askClaude(chatId, userMessage) {
  agentRegistry.recordStart('chat-handler', `askClaude chatId=${chatId}`);
  try {
    await saveMessage(chatId, 'user', userMessage);

    const history = await getHistory(chatId);
    const reply = await callClaude({ system: SYSTEM_PROMPT, messages: history });

    await saveMessage(chatId, 'assistant', reply);

    agentRegistry.recordSuccess('chat-handler', `askClaude chatId=${chatId}: ok`);
    return reply;
  } catch (err) {
    agentRegistry.recordError('chat-handler', err);
    throw err;
  }
}

// === Мониторинг заказов Kwork ===

const KWORK_PROFILE =
  'Создаю современные лендинги и сайты под ключ. Специализируюсь на продающих ' +
  'страницах для B2B и малого бизнеса. Работаю с актуальными технологиями — ' +
  'адаптивная вёрстка, быстрая загрузка, интеграция с Яндекс.Метрикой и Telegram.';

const MAX_PROCESSED_IDS = 500;

// Мьютекс: /kwork_check и IDLE-цикл зовут проверку независимо — параллельный
// запуск даёт двойные уведомления и перезапись state друг у друга.
let kworkCheckActive = false;

async function checkKworkOrders(notifyChatId) {
  if (kworkCheckActive) {
    console.log('[kwork] Проверка уже идёт — пропускаю параллельный запуск');
    return { checked: 0, matched: 0, skipped: true };
  }
  kworkCheckActive = true;
  try {
    return await doCheckKworkOrders(notifyChatId);
  } finally {
    kworkCheckActive = false;
  }
}

async function doCheckKworkOrders(notifyChatId) {
  agentRegistry.recordStart('kwork-monitor', 'Проверка почты на новые заказы Kwork');
  try {
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

    if (digest.newEmails.length) {
      try {
        await markSeen(digest.newEmails.map((e) => e.uid));
      } catch (err) {
        // Уведомления уже отправлены — state ниже сохраняем в любом случае,
        // дедупликация по processedMessageIds не даст дублей при перепроверке.
        console.error('[kwork] Не удалось пометить письма прочитанными:', err.message);
      }
    }

    state.lastRun = new Date().toISOString();
    state.processedMessageIds = [...state.processedMessageIds, ...digest.newEmails.map((e) => e.messageId)].slice(-MAX_PROCESSED_IDS);
    saveState(state);

    agentRegistry.recordSuccess('kwork-monitor', `checked=${digest.checked} matched=${digest.matched}`);
    return { checked: digest.checked, matched: digest.matched };
  } catch (err) {
    agentRegistry.recordError('kwork-monitor', err);
    throw err;
  }
}

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const CHECK_TIMEOUT_MS = 5 * 60 * 1000;

// Сторож на всю проверку почты: 16.07 конвейер завис молча внутри IMAP-выборки
// на 20+ минут без единой ошибки — IDLE-цикл стоял, мониторинг был мёртв.
// Таймаут превращает любое такое зависание в ошибку → catch → переподключение.
async function checkWithTimeout(notifyChatId) {
  let timer;
  try {
    return await Promise.race([
      checkKworkOrders(notifyChatId),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`kwork check timeout — проверка не уложилась в ${CHECK_TIMEOUT_MS / 60000} мин`)),
          CHECK_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

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
      // Библиотека сама запускает IDLE при простое (autoidle). Если её IDLE
      // уже идёт, наш client.idle() видит idling=true и возвращается МГНОВЕННО
      // (imap-flow.js:2468) — цикл ниже превращается в бесконечный микротаск-
      // спин, который душит весь event loop: ни таймеров, ни HTTP, ни логов
      // (17.07: процесс завис на 9,5 часов). IDLE здесь только ручной.
      disableAutoIdle: true,
    });
    let hasNewMail = false;
    let connectionDead = false;
    client.on('exists', () => { hasNewMail = true; });
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        console.log('[kwork IDLE] Подключён, начальная проверка почты...');
        await checkWithTimeout(notifyChatId);
        // Страховка от спина: если idle() раз за разом возвращается мгновенно
        // (мёртвое соединение, гонка с библиотекой — что угодно), рвём цикл
        // ошибкой и переподключаемся, вместо того чтобы заморозить процесс.
        let instantReturns = 0;
        while (true) {
          const idleStart = Date.now();
          await idleWithTimeout(client, IDLE_TIMEOUT_MS);
          if (!client.usable) {
            throw new Error('IMAP-соединение больше не работает (usable=false)');
          }
          if (Date.now() - idleStart < 500) {
            if (++instantReturns >= 20) {
              throw new Error('IDLE спинится мгновенными возвратами — соединение сломано');
            }
          } else {
            instantReturns = 0;
          }
          // Gmail шлёт по IDLE не только реальные новые письма, но и keepalive/
          // flag-обновления — client.idle() резолвится и на них. Без фильтра
          // по 'exists' это гоняло полный checkKworkOrders() каждые ~2 сек,
          // выжигало лимит IMAP-запросов и раз в 10-20 мин рвало соединение.
          if (!hasNewMail) continue;
          hasNewMail = false;
          await checkWithTimeout(notifyChatId);
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
    const { checked, matched, skipped } = await checkKworkOrders(chatId);
    if (skipped) {
      await bot.sendMessage(chatId, 'Проверка уже идёт — подожди её результата.');
    } else if (matched === 0) {
      await bot.sendMessage(chatId, `Проверено писем: ${checked}. Подходящих заказов нет.`);
    }
  } catch (err) {
    console.error('[kwork_check]', err);
    // Отправка сообщения об ошибке сама может упасть (сеть) — не даём
    // reject'у дойти до unhandledRejection и уронить процесс.
    await bot.sendMessage(chatId, `❌ Ошибка проверки: ${err.message}`).catch(() => {});
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

  const response = await axios({ url: fileUrl, responseType: 'stream', timeout: 30000 });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    // Обрыв соединения посреди скачивания даёт ошибку на read-стриме, а не
    // на writer — без этого промис зависал навсегда и tmp-файл не убирался.
    response.data.on('error', reject);
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

// Голосом озвучиваем только обычный разговорный текст — код, логи, ссылки,
// таблицы и JSON всегда идут текстом, даже если вопрос был голосовым.
function isVoiceUnsuitable(text) {
  if (text.length > 4500) return true; // лимит Yandex SpeechKit — 5000 символов на запрос
  if (/```/.test(text)) return true;
  if (/https?:\/\//i.test(text)) return true;
  if (/^\s*\|.*\|\s*\n\s*\|[\s:-]+\|/m.test(text)) return true; // markdown-таблица

  const trimmed = text.trim();
  if (/^[{[]/.test(trimmed) && /[}\]]$/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch (_) { /* не JSON — не блокируем */ }
  }

  const logLikeLines = text.split('\n').filter((line) =>
    /^\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}|^\s*at\s+\S+\(.*:\d+:\d+\)/.test(line)
  );
  if (logLikeLines.length >= 3) return true; // листинг логов / stack trace

  return false;
}

// Yandex SpeechKit v1 отдаёт OggOpus по умолчанию — ровно формат, который
// требует Telegram sendVoice, конвертация через ffmpeg не нужна.
async function synthesizeSpeech(text) {
  const params = new URLSearchParams({
    text,
    lang: 'ru-RU',
    voice: 'filipp',
    folderId: process.env.YANDEX_FOLDER_ID,
  });

  const response = await axios.post(
    'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
    params.toString(),
    {
      headers: {
        Authorization: `Api-Key ${process.env.YANDEX_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

function cleanupFiles(...files) {
  for (const f of files) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (_) {}
  }
}

// === Команды ===

// Telegram ограничивает сообщение 4096 символами, а Claude при max_tokens
// 4096 отдаёт до ~15 000 — без нарезки длинный ответ падал 400 и пользователь
// получал «❌ Ошибка» вместо ответа.
const TG_MAX_LEN = 4096;
async function sendLong(chatId, text) {
  for (let i = 0; i < text.length; i += TG_MAX_LEN) {
    await bot.sendMessage(chatId, text.slice(i, i + TG_MAX_LEN));
  }
}

// Любой reject в async-хэндлере команды = unhandledRejection = exit(1) для
// всего процесса (см. обработчик наверху) — поэтому команды всегда в обёртке.
function safeHandler(label, handler) {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error(`[${label}] Ошибка:`, err.message);
    }
  };
}

bot.onText(/\/start/, safeHandler('start', async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '👋 Привет! Я *Jarvis* — ваш умный ИИ-ассистент.\n\n' +
    '💬 Напишите текстовое сообщение или отправьте голосовое — я отвечу!\n\n' +
    '📋 Команды:\n' +
    '/start — приветствие\n' +
    '/clear — очистить историю разговора\n' +
    '/add <текст> — добавить задачу\n' +
    '/tasks — список задач\n' +
    '/done <номер> — отметить задачу выполненной\n' +
    '/marketing <бриф> — сгенерировать текст (профиль/отклик/пост)\n' +
    '/help — помощь',
    { parse_mode: 'Markdown' }
  );
}));

bot.onText(/\/help/, safeHandler('help', async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '*Jarvis Bot — справка*\n\n' +
    'Я умею:\n' +
    '• Отвечать на любые вопросы\n' +
    '• Помогать с кодом, текстами, задачами\n' +
    '• Распознавать и понимать голосовые сообщения\n' +
    '• Запоминать контекст разговора\n' +
    '• Вести список задач (/add, /tasks, /done)\n' +
    '• Генерировать маркетинговые тексты (/marketing)\n\n' +
    'Просто напишите или скажите что-нибудь!',
    { parse_mode: 'Markdown' }
  );
}));

bot.onText(/\/clear/, safeHandler('clear', async (msg) => {
  const chatId = msg.chat.id;
  const { clearHistory } = require('./memory');
  await clearHistory(chatId);
  await bot.sendMessage(chatId, '🗑️ История разговора очищена.');
}));

// === Задачи ===

bot.onText(/^\/add(?:\s+([\s\S]+))?$/, safeHandler('add', async (msg, match) => {
  const chatId = msg.chat.id;
  const title = match[1]?.trim();
  if (!title) {
    await bot.sendMessage(chatId, 'Использование: /add <текст задачи>');
    return;
  }
  await addTask(chatId, title);
  await bot.sendMessage(chatId, `✅ Добавил в задачи: ${title}`);
}));

bot.onText(/^\/tasks$/, safeHandler('tasks', async (msg) => {
  const chatId = msg.chat.id;
  const pending = await listTasks(chatId, 'pending');
  if (!pending.length) {
    await bot.sendMessage(chatId, 'Задач нет 🎉');
    return;
  }
  const lines = pending.map((t, i) => `${i + 1}. ${t.title}`);
  await bot.sendMessage(chatId, `📋 Задачи:\n${lines.join('\n')}\n\nОтметить выполненной: /done <номер>`);
}));

bot.onText(/^\/done(?:\s+(\d+))?$/, safeHandler('done', async (msg, match) => {
  const chatId = msg.chat.id;
  const index = Number(match[1]);
  if (!index) {
    await bot.sendMessage(chatId, 'Использование: /done <номер из /tasks>');
    return;
  }
  const task = await completeTaskByIndex(chatId, index);
  if (!task) {
    await bot.sendMessage(chatId, 'Нет задачи с таким номером. Посмотри /tasks.');
    return;
  }
  await bot.sendMessage(chatId, `✅ Готово: ${task.title}`);
}));

// === Маркетинговые материалы ===

bot.onText(/^\/marketing(?:\s+([\s\S]+))?$/, safeHandler('marketing', async (msg, match) => {
  const chatId = msg.chat.id;
  const brief = match[1]?.trim();
  if (!brief) {
    await bot.sendMessage(
      chatId,
      'Использование: /marketing <бриф>\n\n' +
      'Например: /marketing отклик на заявку fl.ru — клиенту нужен Telegram-бот для записи в салон красоты'
    );
    return;
  }
  await bot.sendChatAction(chatId, 'typing');
  const text = await generateMarketingText(chatId, brief);
  await sendLong(chatId, text);
}));

// === Текстовые сообщения ===

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  if (!telegramLimiter.allow(chatId)) return;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const reply = await askClaude(chatId, msg.text);
    await sendLong(chatId, reply);
  } catch (err) {
    console.error('[text] Полная ошибка:', err);
    await bot.sendMessage(chatId, `❌ Ошибка: ${err.message}`).catch(() => {});
  }
});

// === Голосовые сообщения ===

bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  if (!telegramLimiter.allow(chatId)) return;

  let oggPath, mp3Path;

  agentRegistry.recordStart('voice-pipeline', `voice message chatId=${chatId}`);
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
      agentRegistry.recordSuccess('voice-pipeline', `chatId=${chatId}: речь не распознана`);
      return;
    }

    // Без parse_mode: транскрипция — произвольный текст, `_`/`*` в нём ломали
    // Markdown-разбор Telegram, editMessageText падал 400 и весь voice-хэндлер
    // уходил в catch без ответа пользователю.
    await bot.editMessageText(`📝 Вы сказали: «${transcribed}»\n\nОбрабатываю...`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    await bot.sendChatAction(chatId, 'typing');
    const reply = await askClaude(chatId, transcribed);

    const canSpeak = VOICE_REPLY_ENABLED && process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID && !isVoiceUnsuitable(reply);
    if (canSpeak) {
      try {
        const oggBuffer = await synthesizeSpeech(reply);
        await bot.sendVoice(chatId, oggBuffer, {}, { filename: 'reply.ogg', contentType: 'audio/ogg' });
      } catch (ttsErr) {
        console.error('[tts] Не удалось озвучить ответ, отправляю текстом:', ttsErr.stack || ttsErr.message);
        await sendLong(chatId, reply);
      }
    } else {
      await sendLong(chatId, reply);
    }

    agentRegistry.recordSuccess('voice-pipeline', `chatId=${chatId}: ok`);
  } catch (err) {
    // err.message alone hides the actual cause (ffmpeg stderr, Groq's parsed
    // error body) — log everything so a failure is diagnosable from logs alone.
    console.error('[voice] Полная ошибка:', err.stack || err.message);
    if (err.status || err.error) {
      console.error('[voice] Groq API ответ:', JSON.stringify({ status: err.status, error: err.error }));
    }
    agentRegistry.recordError('voice-pipeline', err);
    await bot.sendMessage(chatId, `❌ Ошибка при обработке голосового сообщения: ${err.message}`).catch(() => {});
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

const { createDashboardRouter, cors: dashboardCors } = require('./api/server');

const api = express();
// Открытый CORS для всего API-процесса — безопасно для /api/ask (server-to-
// server вызов от voice-core, без браузера), нужен для /api/agents* (дашборд
// с произвольного домена/локально).
api.use(dashboardCors);
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

// === Dashboard API (мониторинг агентов для внешнего фронтенда) ===
// Те же процесс и порт, что и /api/ask выше — Railway пробрасывает наружу
// только один порт на публичный домен сервиса, отдельный порт под дашборд
// снаружи недоступен.

const dashboardRunners = {
  'kwork-monitor': () => checkKworkOrders(process.env.TELEGRAM_CHAT_ID),
};

api.use(createDashboardRouter(agentRegistry, dashboardRunners));

// Статическая страница дашборда — тот же порт/процесс, что и /api/*.
api.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// === Telegram webhook ===
// Секрет пути выводится из токена — путь неугадываем без токена, плюс
// Telegram подписывает каждый запрос заголовком secret_token.
const WEBHOOK_SECRET = crypto
  .createHash('sha256')
  .update(process.env.TELEGRAM_TOKEN || '')
  .digest('hex')
  .slice(0, 32);

api.post(`/telegram/${WEBHOOK_SECRET}`, (req, res) => {
  if (req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

async function registerWebhook() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || 'jarvis-bot-production-90c2.up.railway.app';
  const url = `https://${domain}/telegram/${WEBHOOK_SECRET}`;
  await bot.setWebHook(url, { secret_token: WEBHOOK_SECRET, drop_pending_updates: false });
  console.log('[Джарвис] Webhook установлен:', `https://${domain}/telegram/<secret>`);
}

const PORT = process.env.PORT || 3000;
api.listen(PORT, () => {
  console.log(`[Джарвис] HTTP API слушает порт ${PORT}`);
  registerWebhook().catch((err) => {
    console.error('[Джарвис] Не удалось установить webhook:', err.message);
    // Без webhook бот глух — это фатально, пусть Railway перезапустит.
    process.exit(1);
  });
});

// === Запуск ===

console.log('✅ Jarvis Bot запущен и ожидает сообщения...');
