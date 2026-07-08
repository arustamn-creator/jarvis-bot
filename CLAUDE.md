# JARVIS Bot

## Описание проекта

Telegram бот [@myJarvis_maxbot](https://t.me/myJarvis_maxbot) — персональный AI ассистент на Node.js.
Владелец: Рустам, разработчик и фрилансер из Махачкалы (Kwork, FL.ru).

Цель: автоматизация фриланс-работы, генерация маркетинговых материалов, мониторинг заказов, работа с клиентами.

---

## Стек технологий

| Компонент            | Технология           |
| ----------------------------- | ------------------------------ |
| Telegram Bot API              | `node-telegram-bot-api`      |
| AI (основной)         | `@anthropic-ai/sdk` (Claude) |
| AI (транскрипция) | `openai` (Whisper)           |
| База данных         | Supabase (PostgreSQL)          |
| Векторная БД       | ChromaDB (Python)              |
| Рантайм                | Node.js + Python               |

---

## Структура файлов

```
jarvis-bot/
├── index.js                      # Главный файл бота — Telegram handlers, askClaude
├── memory.js                     # Supabase память — saveMessage, getHistory, clearHistory
├── memory_manager.py             # ChromaDB — векторный поиск по истории
├── supabase_client.py            # Инициализация Supabase клиента (Python)
├── gen_kwork_cover_marketing.py  # Генерация сопроводительных писем для Kwork
├── gen_marketing_plan.py         # Генерация маркетинговых планов
├── tmp/                          # Временные файлы (голосовые: .ogg, .mp3)
└── .env                          # Переменные окружения
```

---

## Supabase — таблицы

### `messages` — история чатов

| Поле   | Тип      | Описание              |
| ---------- | ----------- | ----------------------------- |
| id         | uuid        | Primary key                   |
| chat_id    | bigint      | Telegram chat ID              |
| role       | text        | `user` или `assistant` |
| content    | text        | Текст сообщения |
| created_at | timestamptz | Время создания   |

### `tasks` — задачи

| Поле   | Тип      | Описание              |
| ---------- | ----------- | ----------------------------- |
| id         | uuid        | Primary key                   |
| chat_id    | bigint      | Telegram chat ID              |
| title      | text        | Название задачи |
| status     | text        | `pending`, `done`, etc.   |
| created_at | timestamptz | Время создания   |

---

## Переменные окружения (.env)

```
TELEGRAM_TOKEN=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

---

## Архитектура бота (index.js)

- `askClaude(chatId, userMessage)` — сохраняет сообщение через `saveMessage`, загружает историю через `getHistory`, отправляет в Claude
- `/start` — приветствие
- `/clear` — очистка истории через `clearHistory(chatId)`
- `/help` — справка
- `bot.on('message')` — текстовые сообщения
- `bot.on('voice')` — голосовые: скачать → ffmpeg → Whisper → Claude

---

## Сеть (обязательно читать перед сетевой отладкой)

Локальный трафик идёт через VPN-прокси с подменой TLS (MITM, sing-box/TUN). Из этого следует:

1. **TLS-ошибки локально ожидаемы** (`unable to verify the first certificate`, `SSL: UNEXPECTED_EOF_WHILE_READING`). Это не баг кода. Сетевые фичи тестировать на Railway, не локально.
2. **Node запускать с `--use-system-ca`** при локальных сетевых тестах.
3. **groq-sdk игнорирует `HTTPS_PROXY` и `httpAgent`** → сразу использовать undici `ProxyAgent`. Groq возвращает 403 из РФ — это блокировка региона, а не проблема ключа. Проверку ключа/env пропустить.
4. **Внешние API (биржи, AI-провайдеры) блокируют РФ** → тот же рецепт: undici ProxyAgent через локальный прокси.
5. Прокси-порт зависит от текущего VPN-клиента (менялся: NekoBox 2080 → sing-box 10808). Актуальный порт смотреть в `HTTPS_PROXY` env или `netstat -ano | findstr LISTEN`.

## Правила домена (нарушение = выброшенная работа)

1. **Kwork мониторить ТОЛЬКО через Gmail IMAP-письма.** Никогда не скрейпить kwork.ru (Puppeteer и т.п.) — нарушает пользовательское соглашение. Уже дважды прерывалось пользователем.
2. **Никогда не запускать `node index.js` (polling) локально** — конфликт 409 с продом на Railway по одному Telegram-токену. Тестировать только вынесенные функции без запуска бота.
3. **`jarvis-bot-dev` на Railway — другой бот, не трогать.**
4. **Рабочая копия репо — только `C:\Users\User10\jarvis-bot`.** Клоны на Desktop (`Desktop\jarvis-bot`, `Desktop\JARVIS`) — устаревшие дубликаты, в них не работать.

## Railway (деплой)

| Параметр  | Значение |
| --------- | -------- |
| Проект    | `lucid-courtesy`, projectId `8ee239ca-29a4-499f-8dc7-546fbfbc966d` |
| Сервис    | `jarvis-bot`, serviceId `8a018352-3019-4ed0-9664-50180c02a0b8` |
| Домен     | `jarvis-bot-production-90c2.up.railway.app` |

В MCP-вызовы railway всегда передавать явный `project_id` — CLI-линк может отсутствовать. Интерактивный `railway link`/`login` в non-interactive среде виснет (exit 255) — использовать флаги или MCP.

---

## Планы развития

- [ ] Агент мониторинга заказов на Kwork/FL.ru
- [ ] Агент генерации откликов на заказы
- [ ] Агент создания маркетинговых материалов
- [ ] Интеграция ChromaDB для семантического поиска по истории
- [ ] Задачи: добавить команды `/tasks`, `/add`, `/done`

---

## Скилы

Скилы лежат в `C:\skills\.claude\skills\`. Перед задачей проверять наличие подходящего скила.

### Разработка

- `frontend-design` — UI/UX
- `webapp-testing` — тестирование
- `deploy-to-vercel` — деплой
- `diagnose` — отладка
- `improve-codebase-architecture` — рефакторинг

### Агентные возможности

- `subagent-driven-development` — мульти-агент разработка
- `dispatching-parallel-agents` — параллельные агенты
- `executing-plans` — выполнение планов
- `memory-management` — управление памятью

### Маркетинг и фриланс

- `copywriting` — копирайтинг
- `seo-audit` — SEO аудит
- `cold-email` — холодные письма
- `marketing-plan` — маркетинговые планы
- `content-strategy` — контент-стратегия

### Документы

- `pdf`, `pptx`, `docx`, `xlsx`

---

## Инструкции

1. Перед любой задачей проверять наличие скила в `C:\skills\.claude\skills\<skill-name>\SKILL.md`.
2. Язык общения: русский.
3. Supabase — основное хранилище истории. Не использовать локальные массивы для conversations.
4. При работе с Python-скриптами учитывать, что они могут использовать отдельный Supabase клиент (`supabase_client.py`).
