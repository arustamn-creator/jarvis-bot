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
