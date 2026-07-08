---
name: security-review
description: Проверка кода на секьюрити-проблемы через subagent перед коммитом
---

Use a subagent to review $ARGUMENTS (or the current uncommitted changes if no path is given) for security issues and report what it finds. Pay special attention to exposed API keys, bot tokens, and other secrets that could leak into commits or screenshots.
