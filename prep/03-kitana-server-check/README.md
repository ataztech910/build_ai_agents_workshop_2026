# Пункт 3 (часть 1) — Kitana server: базовый запуск и round-trip

Статус: ✅ базовый сервер работает и отдаёт реальные ответы. Дата: 2026-08-09.
Осталось проверить: system-роль / `stream: true` / `tool_calls` для совместимости с ADK (часть 2, отдельно).

## Команда запуска

```
npx --yes @kitana-sdk/server@latest
```

## Баг найден и исправлен: автоустановка Claude CLI ломает старт сервера

**Симптом (воспроизведён и в изолированной песочнице, и в обычном терминале на реальной машине):**
```
Claude CLI not found. Installing @anthropic-ai/claude-code...
npm error code ENOTEMPTY
npm error syscall rename
npm error path .../node_modules/@anthropic-ai/claude-code
npm error dest .../node_modules/@anthropic-ai/.claude-code-tBF6EKaa
Automatic install failed. Install manually: npm install -g @anthropic-ai/claude-code
Kitana server not started: cannot run without Claude CLI.
```
Сервер не поднимается вообще — ни `/health`, ни что-либо другое не отвечает.

**Диагноз:** в `~/.nvm/versions/node/<version>/lib/node_modules/@anthropic-ai/` рядом с рабочей
`claude-code` лежал осиротевший temp-каталог `.claude-code-tBF6EKaa` (артефакт какой-то
прошлой неудачной переустановки, от 30 июля). npm при каждой переустановке пытается
переименовать текущую `claude-code` именно в этот путь — а он уже занят, отсюда
`ENOTEMPTY` при каждой попытке, включая внутреннюю автоустановку Kitana.

Важно: `CLAUDE_CODE_EXECPATH` (то, чем реально пользуется IDE-сессия Claude Code) указывал
на отдельный бинарник VSCode-расширения — с npm-пакетом `@anthropic-ai/claude-code`
никак не связан. Значит удаление осиротевшего temp-каталога безопасно и не могло
задеть текущую сессию.

**Фикс:**
```
rm -rf ~/.nvm/versions/node/<version>/lib/node_modules/@anthropic-ai/.claude-code-tBF6EKaa
```

**Вывод для воркшопа:** это не экзотика конкретной машины — ENOTEMPTY на глобальной
переустановке npm-пакета — известный класс проблем (обрыв прошлой установки, стейл temp-папка).
У любого участника, который раньше уже пытался ставить `claude-code` и процесс прервался,
Kitana молча ляжет на старте без внятной диагностики для пользователя (сообщение
"Automatic install failed" не объясняет, что делать при `ENOTEMPTY` конкретно).
**Нужно подготовить эту инструкцию заранее для участников** — не рассчитывать,
что "просто заработает".

## После фикса — полный успешный тест

`/health`:
```json
{"status":"ok","provider":"claude","claudeInstalled":true,"claudeLoggedIn":true,"subscriptionType":"team"}
```

`/v1/models`:
```json
{"object":"list","data":[
  {"id":"auto","object":"model"},
  {"id":"claude-sonnet-4-6","object":"model"},
  {"id":"claude-haiku-4-5-20251001","object":"model"}
]}
```
⚠️ Список захардкожен и не совпадает с тем, что реально доступно (см. ниже — `auto`
реально резолвится в `claude-sonnet-5`, которого в этом списке нет).

`/v1/chat/completions` (реальный round-trip, не мок):
```
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"скажи одно слово: PONG"}]}'
```
```json
{
  "id": "chatcmpl-1786306917978",
  "model": "claude-sonnet-5",
  "choices": [{"message": {"role": "assistant", "content": "PONG"}, "finish_reason": "stop"}],
  "usage": {"prompt_tokens": 2, "completion_tokens": 5, "total_tokens": 7}
}
```
Ответ реальный, от Claude Sonnet 5, через team-подписку — не мок.

## Решение по найденным багам (2026-08-09)

- `ENOTEMPTY` при автоустановке — эдж-кейс (нужен осиротевший temp-каталог от
  прошлой прерванной установки), большинство участников этого не встретит.
  Отложено, зафиксировано как TODO в `/Users/andrei/Desktop/branches/kitana/_sdk/kitana/TODO.md`.
- Хардкод `/v1/models` — нормально для альфа/бета-стадии, не приоритет. Тоже в TODO там же.

## Что дальше (не входит в этот тест)

- [ ] `stream: true` — реально ли стримит, или буферизует и отдаёт одним куском
- [ ] `system`-роль в messages — не потеряется ли по дороге в CLI
- [ ] `tool_calls` — работает ли для FunctionTool из ADK
- [ ] Собственно интеграция с ADK через `OPENAI_BASE_URL` (нужно сначала выяснить,
      поддерживает ли `@google/adk` такой путь нативно — вопрос из пункта 3, ещё не закрыт)
