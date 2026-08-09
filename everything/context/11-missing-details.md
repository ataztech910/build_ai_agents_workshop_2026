# CONTEXT: Детали которые не вошли в другие файлы

---

## @kitana-sdk/server — полный README

```
An OpenAI-compatible HTTP server backed by your Claude subscription.
No API keys — calls claude -p under the hood via @kitana-sdk/core.

Install:
  npm install @kitana-sdk/server

Run:
  npx @kitana-sdk/server
  # или с портом:
  PORT=4141 kitana-server

Первый запуск:
  Авто-установка Claude CLI если отсутствует
  Запрашивает claude auth login

Endpoints:
  POST /v1/chat/completions   OpenAI-compatible (stream: true поддерживается)
  GET  /v1/models             хардкоженный список моделей
  GET  /health                статус сервера + Claude CLI

Пример:
  curl -X POST http://localhost:4141/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"auto","messages":[{"role":"user","content":"say PONG"}]}'

Drop-in провайдер для:
  n8n, OpenClaw, Continue.dev, Vercel AI SDK, Google ADK через LiteLLM
  
Репо: github.com/ataztech910/kitana (integrations.md — verified setup guides)

Requirements:
  Node.js 18+
  Claude CLI subscription (Max, Pro, Team, или Enterprise)
```

**Открытый вопрос:** нужно проверить поддержку для ADK:
- `system` роль в messages array
- `stream: true` для adk web визуализации
- `tool_calls` формат для FunctionTool

---

## adk web — встроенный дебаггер

**Что умеет:**
- Визуализирует граф агентов
- Показывает шаги выполнения в реальном времени
- Отображает токены и стоимость
- Позволяет отправлять сообщения через UI

**Как запустить:**
```bash
# В корне проекта с ADK
adk web

# Открывается на localhost:8000 (или другой порт)
```

**Для воркшопа:**
- Показываешь на проекторе пока участники работают в терминале
- Два окна рядом: adk web + терминал
- Участники видят как их код работает визуально

**Открытый вопрос:** нужно ли что-то настраивать или работает из коробки?

---

## Electron приложение — будущий проект

**Концепция:**
Десктопное приложение поверх Kitana SDK.  
Пользователь не знает какой AI под капотом — Kitana детектирует что есть.

**Схема:**
```
Electron UI (React)
      ↓
Vercel AI SDK (useChat, streamText)
      ↓
@kitana-sdk/vercel  (адаптер — провайдер совместимый с Vercel AI)
      ↓
@kitana-sdk/core runner
      ↓
claude / ollama / gemini CLI
```

**Статус:** отложено до v0.3 Kitana SDK.  
Нужен `@kitana-sdk/vercel` адаптер которого ещё нет.

---

## ADK встроенные возможности (важно знать)

ADK уже умеет сам — не нужно дублировать в Kitana:
- Model Routing с автоматическим failover
- State/Memory агентов между сессиями
- Встроенные коннекторы: Claude API, Gemini API, Ollama через LiteLLM
- SequentialAgent, ParallelAgent, LoopAgent из коробки

**Поэтому граница Kitana/ADK:**
```
ADK    — оркестрация + API провайдеры (с ключами)
Kitana — CLI без ключей + детекция окружения + Библия
```

---

## Все фразы которые работают на воркшопе

```
"instruction — контракт, не подсказка"

"Вот что построим. Начнём с середины."
(при показе архитектуры)

"Kitana — прокси к вашему локальному Claude. Никаких ключей на экране."

"Модель в одном промпте идёт на компромисс по каждой задаче.
 Три агента оптимизируют каждую задачу отдельно."

"Агенты могут проверять друг друга.
 Качество растёт через итерации — как в команде людей."

"Замените фейк на парсер — и это продакшн инструмент."

"Возьми задачу из своей работы которую делаешь руками.
 Напиши агента. У тебя 15 минут."

"Назови три вещи которые делаешь руками каждую неделю и ненавидишь."
(вопрос тем кто не знает что писать)

"Что возвращает инструмент? Покажи console.log перед return."
(вопрос застрявшим на FunctionTool)

"Агент ведёт себя странно — сюда смотришь первым делом."
(при показе adk web)
```

---

## Точки синхронизации на воркшопе

Критически важные моменты когда нужно убедиться что все идут вместе:

```
1. После открытия (10 мин)
   ✓ У всех hello-agent.ts отвечает в терминале
   Если нет — чини сразу, не двигайся дальше

2. После блока 1 (35 мин)
   ✓ Двое показывают разные instruction на одних данных
   Обсуждаете почему результат разный

3. После блока 2 (65 мин)
   ✓ Двое показывают sequential агентов
   ✓ Все видели эксперимент A vs B

4. После блока 3 (95 мин)
   ✓ Двое показывают разные ICP → разные лиды ("вау" момент)
   
5. Финал (115 мин)
   ✓ 2-3 человека показывают своего агента из блока 4
```

---

## Запасной план если что-то сломалось

**Провайдер не работает:**
В каждом скелете добавить закомментированный фейковый ответ:
```typescript
// FALLBACK: раскомментируй если провайдер не работает
// return { text: '{"facts": ["факт 1", "факт 2", "факт 3"]}' }
```

**npm install не работает:**
Подготовить USB с node_modules или zip архив.

**adk web не запускается:**
Продолжать только в терминале — визуализация важна но не критична.

**Участник сильно отстаёт:**
Переключить на branch `solutions/` где все TODO заполнены.

---

## .gitignore для воркшоп репо

```gitignore
node_modules/
.env
.telegram_session
instagram_session.json
leads_*.json
.kitana/
dist/
*.js.map
```

---

## check-env.ts — скрипт проверки окружения

```typescript
// scripts/check-env.ts
// Запуск: npm run check

import { execSync } from "node:child_process";

const checks = [
  {
    name: "Node.js 18+",
    check: () => {
      const v = process.version;
      const major = parseInt(v.slice(1));
      if (major < 18) throw new Error(`Node ${v} — нужен 18+`);
      return v;
    },
  },
  {
    name: "npm install",
    check: () => {
      execSync("ls node_modules/@google/adk", { stdio: "ignore" });
      return "ok";
    },
  },
  {
    name: ".env файл",
    check: () => {
      const { existsSync } = require("fs");
      if (!existsSync(".env")) throw new Error("Нет .env — сделай: cp .env.example .env");
      return "ok";
    },
  },
  {
    name: "Провайдер",
    check: () => {
      const env = require("dotenv").config().parsed ?? {};
      if (env.OPENAI_BASE_URL) return `Kitana/Ollama → ${env.OPENAI_BASE_URL}`;
      if (env.GOOGLE_API_KEY)  return `Gemini API`;
      if (env.ANTHROPIC_API_KEY) return `Claude API`;
      throw new Error("Нет провайдера в .env — выбери вариант A/B/C/D");
    },
  },
];

console.log("\n🔍 Проверка окружения...\n");
let ok = true;
for (const { name, check } of checks) {
  try {
    const result = check();
    console.log(`  ✅ ${name}: ${result}`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${(e as Error).message}`);
    ok = false;
  }
}
console.log(ok ? "\n✅ Всё готово!\n" : "\n❌ Исправь ошибки выше\n");
process.exit(ok ? 0 : 1);
```

---

## Репо структура GitHub

```
github.com/ataztech910/kitana        — Kitana SDK (уже есть)
  packages/
    core/                             — @kitana-sdk/core
    server/                           — @kitana-sdk/server (опубликован)

github.com/ataztech910/workshop-???  — Воркшоп репо (создать)
  название не обсуждалось
```
