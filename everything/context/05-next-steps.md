# CONTEXT: Что делать дальше — чеклист

---

## Прямо сейчас (переезд в Claude Code)

- [ ] Создать репо на GitHub
- [ ] Загрузить все файлы из этого чата (см. список ниже)
- [ ] Открыть в Claude Code и продолжить

---

## Файлы которые уже готовы (из этого чата)

### Воркшоп
```
tasks/index.md
tasks/01-adk.md
tasks/02-api.md
tasks/03-kitana.md
examples/01-adk/hello-agent.ts
examples/01-adk/tool-agent.ts
examples/01-adk/sequential.ts
examples/02-api/routing.ts
examples/02-api/lead-finder.ts
examples/03-kitana/detector.ts
examples/03-kitana/runner.ts
examples/03-kitana/bible.ts
package.json
.env.example
architecture.svg
```

### Парсеры
```
parsers/types.ts
parsers/index.ts
parsers/youtube.ts
parsers/reddit.ts
parsers/instagram.ts
telegram-parser.ts
pipeline.ts
```

---

## Что написать в Claude Code (приоритет)

### 1. Скелеты которых не хватает
```
examples/01-adk/parallel.ts
examples/02-api/claude-agent.ts
examples/02-api/gemini-agent.ts
examples/03-kitana/failover.ts
```

### 2. Вспомогательные файлы репо
```
scripts/check-env.ts   — проверка окружения перед воркшопом
.gitignore
README.md              — для участников (как клонировать и запустить)
```

### 3. @kitana-sdk/core v0.1
```
src/detector.ts
src/runner.ts
src/failover.ts
src/index.ts
```

### 4. Проверить что @kitana-sdk/server поддерживает
- [ ] `system` роль в messages (ADK передаёт instruction как system)
- [ ] `stream: true` (нужен для adk web)
- [ ] `tool_calls` (для FunctionTool в ADK)

---

## Фразы которые работают на воркшопе

> "instruction — контракт, не подсказка"

> "Модель в одном промпте идёт на компромисс по каждой задаче.  
>  Три агента оптимизируют каждую задачу отдельно."

> "Агенты могут проверять друг друга. Качество растёт через итерации."

> "Замените фейк на парсер — и это продакшн инструмент."

> "Назови три вещи которые делаешь руками каждую неделю и ненавидишь."  
> (вопрос тем кто не знает что писать в блоке 4)

---

## Открытые вопросы

1. **@kitana-sdk/server** — поддерживает ли `system`, `stream`, `tool_calls`?  
   Нужно проверить для совместимости с ADK.

2. **adk web** — нужно ли что-то настраивать или работает из коробки?

3. **Дата воркшопа** — не обсуждалась. Влияет на приоритеты.

4. **Репо** — один монорепо (воркшоп + kitana) или раздельные?  
   Предложение: раздельные — `workshop-repo` и `kitana` (уже есть на ataztech910).
