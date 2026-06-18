# Jarvis Telegram Bot

Telegram-бот на Node.js с Claude AI и распознаванием голоса через OpenAI Whisper.

## Возможности

- Ответы на текстовые сообщения через Claude (claude-sonnet-4-6)
- Распознавание голосовых сообщений через Whisper API
- Поддержка контекста разговора (последние 20 сообщений)
- Команды: `/start`, `/help`, `/clear`

## Требования

- Node.js 18+
- ffmpeg (для конвертации аудио)
- Telegram Bot Token
- Anthropic API Key
- OpenAI API Key (для Whisper)

## Установка ffmpeg

**Windows:**
1. Скачайте с https://ffmpeg.org/download.html
2. Или установите через Chocolatey: `choco install ffmpeg`
3. Или через winget: `winget install ffmpeg`

**Проверить установку:** `ffmpeg -version`

## Установка и запуск

```bash
# 1. Перейти в папку
cd C:\Users\User10\jarvis-bot

# 2. Установить зависимости
npm install

# 3. Заполнить .env (см. ниже)

# 4. Запустить бота
npm start
```

## Настройка .env

Откройте файл `.env` и заполните:

```
TELEGRAM_TOKEN=ваш_токен_telegram
ANTHROPIC_API_KEY=ваш_anthropic_ключ
OPENAI_API_KEY=ваш_openai_ключ
```

Получить ключи:
- **Telegram Token** — через @BotFather в Telegram (команда /newbot)
- **Anthropic API** — https://console.anthropic.com
- **OpenAI API** — https://platform.openai.com/api-keys

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и список команд |
| `/help` | Справка |
| `/clear` | Очистить историю разговора |

## Структура проекта

```
jarvis-bot/
├── index.js      — основной код бота
├── package.json  — зависимости
├── .env          — ключи (не коммитить!)
├── .gitignore
├── tmp/          — временные аудиофайлы (создаётся автоматически)
└── README.md
```
