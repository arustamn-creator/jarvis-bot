---
name: deploy-and-verify-railway
description: Деплой jarvis-bot на Railway с проверкой — push, ожидание деплоя, логи, smoke-test. Использовать при «задеплой», «выкати на Railway», «запушь и проверь», после любого изменения index.js/kwork-модулей, которое должно уехать в прод.
---

# Деплой и проверка на Railway

Цикл, который раньше гонялся вручную десятки раз за сессию. Выполнять шаги по порядку.

## Координаты (прод)

- Проект: `lucid-courtesy`, projectId `8ee239ca-29a4-499f-8dc7-546fbfbc966d`
- Сервис: `jarvis-bot`, serviceId `8a018352-3019-4ed0-9664-50180c02a0b8`
- Домен: `https://jarvis-bot-production-90c2.up.railway.app`
- Деплой триггерится push-ем в `main` (repo `arustamn-creator/jarvis-bot`)
- `jarvis-bot-dev` — другой сервис, НЕ трогать

## Шаги

1. **Перед push:** `node --check index.js` (и изменённых модулей). Не запускать `node index.js` — 409 с продом.
2. **Push:** `git push origin main`.
3. **Дождаться деплоя:** MCP `list_deployments` с явным `project_id` — ждать статус SUCCESS нового деплоя (обычно 1–3 мин). Не поллить чаще раза в 30–60 сек.
4. **Логи:** MCP `get_logs` (или `railway logs`) — искать:
   - ошибки старта (crash, `ETELEGRAM`, `409 Conflict`);
   - строки `[kwork]` — если менялся Kwork-модуль;
   - `can't parse entities` — сломанное MarkdownV2-экранирование.
5. **Smoke-test:** если менялся Kwork-модуль — отправить боту `/kwork_check` в Telegram и проверить, что дайджест пришёл без ошибок. Если менялся общий пайплайн — обычное текстовое сообщение боту.
6. **Доложить:** статус деплоя + вывод логов + результат smoke-теста. Если что-то упало — привести точную ошибку из логов, не пересказ.

## Известные грабли

- MCP-вызовы без `project_id` падают с «No linked project» — всегда передавать явно.
- Интерактивные `railway login` / `railway link` в non-interactive среде виснут (exit 255) — использовать флаги `-p/-e/-s` или MCP.
- 409 Conflict в логах = где-то запущен второй поллер с тем же токеном (локальный запуск или Desktop-копия). Убить локальный процесс, не «чинить» код.
