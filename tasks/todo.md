# Kwork → Gmail → Telegram: чек-лист

- [x] 1. IMAP-доступ к Gmail + базовый ридер писем (`kwork_mail.js`, зависимость `imapflow`+`mailparser`)
- [x] 2. Парсер письма Kwork (`kwork_parser.js`)
- [x] 3. Общий клиент Claude (`claude_client.js`) + рефакторинг `askClaude` + ранжирование (`kwork_rank.js`)
- [x] 4. Состояние мониторинга (`kwork_state.js`, `memory_db/kwork_state.json`)
- [ ] 5. Сборка пайплайна + cron + Telegram + команда `/kwork_check`

Чек-поинты:
- [x] После задачи 1: подтвердить IMAP-логин с реальным паролем приложения — OK (Avast Mail Shield блокировал TLS, отключили)
- [ ] После задачи 5: откалибровать парсер на первом реальном письме Kwork

Подробности и критерии приёмки — в `tasks/plan.md`.
