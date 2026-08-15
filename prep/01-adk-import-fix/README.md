# Пункт 1 (+ бонусная находка) — импорт `@google/adk` и переменная окружения Gemini

Статус: ✅ починено и проверено эмпирически. Дата: 2026-08-09.

## Баг 1 — сабпуть-импорты не существуют в пакете

**Было:**
```ts
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
```

**Причина:** `package.json` пакета `@google/adk@1.6.0` объявляет `exports` только для `"."`.
Подпутей `/agents`, `/runners`, `/sessions` в опубликованном пакете нет — хотя сами файлы
`dist/esm/agents/llm_agent.js` и т.д. физически существуют, Node их не резолвит
без явного экспорта.

**Тест (`before.broken.ts`):**
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './agents' is not defined
by "exports" in .../node_modules/@google/adk/package.json
```

**Фикс:** импортировать всё из корня — `LlmAgent`, `Runner`, `InMemorySessionService`,
`SequentialAgent` реально реэкспортируются через `common.js` → корневой `index.js`.
```ts
import { LlmAgent, Runner, InMemorySessionService } from "@google/adk";
```

**Тест (`after.fixed.ts`):** импорт резолвится, код доходит до реального вызова модели.

## Баг 2 (найден при тестировании) — `.env.example` называет неверную переменную

Ошибка после фикса импорта:
```
Error: API key must be provided via constructor or GOOGLE_GENAI_API_KEY
or GEMINI_API_KEY environment variable.
```

Проверил эмпирически все три варианта имени переменной (фейковый ключ, чтобы увидеть,
на каком этапе падает):

| Переменная | Результат |
|---|---|
| `GOOGLE_API_KEY` (как в `.env.example` воркшопа) | ❌ игнорируется, та же ошибка "API key must be provided" |
| `GOOGLE_GENAI_API_KEY` | ✅ подхватывается, запрос реально отправляется в Gemini API |
| `GEMINI_API_KEY` | ✅ подхватывается, запрос реально отправляется в Gemini API |

Значит участник, который честно следует `.env.example` воркшопа и ставит
`GOOGLE_API_KEY`, после починки импорта всё равно упрётся в непонятную ошибку —
переменная просто не читается пакетом.

**Фикс:** переименовал `GOOGLE_API_KEY` → `GOOGLE_GENAI_API_KEY` во всех
5 копиях `.env.example` в репо (`workshop-files/.env.example`,
`workshop-files/workshop/.env.example`, `workshop-files/workshop/workshop/.env.example`,
`everything/.env.example`, `everything/workshop/workshop/.env.example`).

## Что применено в реальном репо

- [x] `everything/workshop/workshop/examples/01-adk/hello-agent.ts` — импорт исправлен
- [x] `workshop-files/workshop/workshop/examples/01-adk/hello-agent.ts` — импорт исправлен
- [x] 5 копий `.env.example` — `GOOGLE_API_KEY` → `GOOGLE_GENAI_API_KEY`
- [x] `npm install` прогнан в обеих затронутых копиях `workshop/workshop/` — IDE-диагностика чистая

## Что осталось непроверенным

Реальный вызов Gemini с настоящим ключом не тестировался (в этой сессии нет
валидного `GOOGLE_GENAI_API_KEY`) — проверено только до границы "запрос
реально отправляется", дальше нужен человек с ключом с aistudio.google.com.

## Как воспроизвести

```
cd prep/01-adk-import-fix
npm install
npx tsx before.broken.ts   # воспроизводит ERR_PACKAGE_PATH_NOT_EXPORTED
npx tsx after.fixed.ts     # падает на auth — импорт больше не проблема
GOOGLE_GENAI_API_KEY=<реальный_ключ> npx tsx after.fixed.ts   # должен реально ответить
```
