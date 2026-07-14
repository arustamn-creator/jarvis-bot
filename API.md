# Dashboard API

HTTP API для внешнего дашборда мониторинга (веб + мобильный PWA). Поднимается
в том же процессе, что и Telegram-бот (`index.js`), но на отдельном порту —
не конфликтует ни с ботом (Telegram polling), ни с HTTP API voice-core
(`PORT`, по умолчанию 3000).

- Порт: переменная окружения `DASHBOARD_API_PORT`, по умолчанию `3001`.
- Авторизация: заголовок `Authorization: Bearer <DASHBOARD_API_TOKEN>` на всех
  эндпоинтах. Без токена или с неверным токеном — `401 {"error": "unauthorized"}`.
- CORS: `Access-Control-Allow-Origin: *` — можно ходить с любого домена/локально.
- Реализация: `agent_registry.js` (in-memory реестр статусов/логов агентов) +
  `api/server.js` (Express-роуты).

## Агенты

"Агенты" — это реальные фоновые процессы бота, а не отдельный AI-router:

| id               | Что это                                                          | Ручной запуск |
| ---------------- | ----------------------------------------------------------------- | ------------- |
| `chat-handler`   | Обработка текстовых/голосовых сообщений через `askClaude`          | нет (event-driven) |
| `kwork-monitor`  | Мониторинг заказов Kwork через Gmail IMAP IDLE                    | да |
| `voice-pipeline` | Голосовые сообщения: скачивание → ffmpeg → Whisper → Claude        | нет (event-driven) |

Для агентов без ручного запуска `POST /api/agents/:id/run` возвращает `400`.

## Эндпоинты

### `GET /api/system`

Сводка по системе.

```bash
curl -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  http://localhost:3001/api/system
```

На Railway порт `DASHBOARD_API_PORT` не выставлен наружу автоматически —
как и `PORT` для основного voice-core API, нужен отдельный публичный домен
через Railway → Settings → Networking → Generate Domain, привязанный к этому
порту, либо доступ изнутри той же приватной сети Railway.

```json
{
  "totalAgents": 3,
  "activeAgents": 1,
  "uptimeSeconds": 5423,
  "serverTime": "2026-07-14T18:32:10.123Z"
}
```

### `GET /api/agents`

Список всех агентов.

```bash
curl -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  http://localhost:3001/api/agents
```

```json
[
  {
    "id": "kwork-monitor",
    "name": "Kwork Monitor",
    "description": "Мониторинг заказов Kwork через Gmail IMAP IDLE, дайджест новых заказов в Telegram",
    "schedule": "IMAP IDLE (постоянное соединение), переподключение через 30с при обрыве",
    "runnable": true,
    "status": "idle",
    "lastRun": "2026-07-14T18:20:00.000Z",
    "lastError": null
  }
]
```

`status` — одно из `active` / `idle` / `error`.

### `GET /api/agents/:id`

Детали одного агента + последние 20 строк логов.

```bash
curl -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  http://localhost:3001/api/agents/kwork-monitor
```

```json
{
  "id": "kwork-monitor",
  "name": "Kwork Monitor",
  "description": "...",
  "schedule": "...",
  "runnable": true,
  "status": "idle",
  "lastRun": "2026-07-14T18:20:00.000Z",
  "lastError": null,
  "logs": [
    { "timestamp": "2026-07-14T18:20:00.000Z", "level": "info", "message": "checked=4 matched=1" }
  ]
}
```

Неизвестный `id` → `404 {"error": "agent not found"}`.

### `GET /api/agents/:id/logs?limit=50`

Последние N событий агента (по умолчанию 50, максимум 200).

```bash
curl -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  "http://localhost:3001/api/agents/kwork-monitor/logs?limit=20"
```

```json
[
  { "timestamp": "2026-07-14T18:19:59.000Z", "level": "info", "message": "kwork-monitor: запуск" },
  { "timestamp": "2026-07-14T18:20:00.000Z", "level": "info", "message": "checked=4 matched=1" }
]
```

Неизвестный `id` → `404 {"error": "agent not found"}`.

### `POST /api/agents/:id/run`

Ручной запуск агента (использует ту же функцию, что и внутренняя логика бота,
без дублирования — например, для `kwork-monitor` дёргается тот же
`checkKworkOrders`, что вызывается из IMAP IDLE-цикла и команды `/kwork_check`).

```bash
curl -X POST -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  http://localhost:3001/api/agents/kwork-monitor/run
```

```json
{ "ok": true, "result": { "checked": 4, "matched": 1 } }
```

- Неизвестный `id` → `404 {"error": "agent not found"}`
- Агент без поддержки ручного запуска (`chat-handler`, `voice-pipeline`) →
  `400 {"error": "agent does not support manual run"}`
- Ошибка при выполнении → `500 {"ok": false, "error": "..."}`

## Переменные окружения

| Переменная            | Обязательна | Значение по умолчанию | Описание |
| ---------------------- | ----------- | ---------------------- | -------- |
| `DASHBOARD_API_TOKEN`  | да          | —                       | Bearer-токен для авторизации. Сгенерировать: `openssl rand -hex 32` |
| `DASHBOARD_API_PORT`   | нет         | `3001`                  | Порт dashboard API |
