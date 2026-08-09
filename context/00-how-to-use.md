# CONTEXT: Инструкция — как использовать этот контекст

---

## Как загрузить в Claude Code

1. Создай репо на GitHub
2. Положи все файлы из этой папки `_context/` в корень репо
3. Открой репо в Claude Code
4. Скажи:

```
Прочитай все файлы в _context/ и скажи что понял о проекте.
Затем продолжим с пункта [X] из _context/05-next-steps.md
```

---

## Структура контекста

```
_context/
  00-how-to-use.md         — этот файл, инструкция
  01-project-overview.md   — что строим, стек, архитектура, решения
  02-workshop-plan.md      — детальный план воркшопа по минутам
  03-repo-structure.md     — структура репо, что готово ✅ что нужно ❌
  04-kitana-sdk.md         — архитектура Kitana, API, roadmap
  05-next-steps.md         — чеклист что делать прямо сейчас
  06-code-reference.md     — ключевые куски кода (types, router, telegram, pipeline)
  07-decisions-log.md      — все решения с причинами + отклонённые варианты
  08-all-skeletons.md      — все скелеты примеров для воркшопа
  09-full-parsers.md       — полный код youtube.ts, reddit.ts, instagram.ts
  10-agent-prompts.md      — полные system prompts всех агентов
  11-missing-details.md    — kitana-server README, adk web, Electron, фразы, fallback
  12-full-pipeline.md      — полный код pipeline.ts с тремя шагами
  13-kitana-core-code.md   — полный код @kitana-sdk/core: types, detector, runner, failover, index
  14-missing-skeletons.md  — скелеты parallel.ts, claude-agent.ts, gemini-agent.ts, failover.ts
  15-workshop-readme.md    — README.md для участников + README для @kitana-sdk/core
```

---

## Два трека работы

### Трек 1 — Воркшоп репо
Приоритет: высокий (ближайший дедлайн)

Что нужно дописать:
```
examples/01-adk/parallel.ts        — скелет задания 1.4
examples/02-api/claude-agent.ts    — скелет задания 2.1
examples/02-api/gemini-agent.ts    — скелет задания 2.2
examples/03-kitana/failover.ts     — скелет задания 3.3
scripts/check-env.ts               — проверка окружения
.gitignore
README.md
```

### Трек 2 — @kitana-sdk/core v0.1
Приоритет: высокий (нужен для воркшопа)

Что писать:
```
src/detector.ts    — сканирует окружение
src/runner.ts      — spawnSync вызов CLI
src/failover.ts    — цепочка провайдеров
src/index.ts       — главный класс Kitana
```

---

## Ключевые детали которые легко забыть

**Instagram парсер:**
- Использует Playwright + stealth (без stealth блокируется)
- Перехватывает GraphQL `/graphql/query` — не DOM скрейпинг
- Сессия в `instagram_session.json`
- Для 2FA: `IG_HEADLESS=false`

**Kitana на воркшопе:**
- Участники используют `@kitana-sdk/server` (уже опубликован)
- `npx @kitana-sdk/server` → localhost:4141
- ADK подключается через `OPENAI_BASE_URL=http://localhost:4141/v1`
- `@kitana-sdk/core` показывается в волне 3 как "под капотом"

**Эксперимент "один vs три агента":**
- Центральный момент воркшопа, блок 2
- Запускаешь A (один промпт) и B (три агента) на одних данных
- Зал видит разницу качества
- Валидатор в варианте A не критикует — он сам только что написал

**"Вау" момент:**
- Блок 3, конец задания 2.4
- Двое показывают разные ICP на одних комментариях
- Зал видит что агент выбрал разных лидов

**Библия проекта:**
- Аналогия: библия сериала
- Живёт в `.kitana/bible/` — папка с md и json файлами
- `bible.ts` = только TypeScript типы и I/O, не логика
- Агент обновляет после каждого шага — это контракт, не опция
- Сжатие: dense format (не китайский — отложено до v0.3)

---

## GitHub репо

Kitana SDK уже есть: `github.com/ataztech910/kitana`  
Воркшоп репо: создать отдельно (название не обсуждалось)

---

## Открытые вопросы (нужно проверить)

1. `@kitana-sdk/server` — поддержка `system`, `stream`, `tool_calls` для ADK
2. `adk web` — работает из коробки?
3. Дата воркшопа
4. Название репо воркшопа
