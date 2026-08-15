# CONTEXT: README.md воркшопа (для участников)

Это файл который участники видят первым когда клонируют репо.

---

## README.md

```markdown
# AI Agents Workshop
### Build AI Agents from Scratch — Google ADK + Kitana SDK

Hands-on воркшоп: от первого LlmAgent до полного мультиагентного пайплайна за 2 часа.

---

## Быстрый старт

### 1. Клонируй репо

git clone <repo-url> workshop
cd workshop
npm install

### 2. Проверь окружение

npm run check

### 3. Настрой провайдера

cp .env.example .env

Открой `.env` и выбери один вариант:

**Вариант A — Kitana Server (рекомендуется)**
Нужна подписка Claude Pro/Max. Запусти в отдельном терминале:

npx @kitana-sdk/server

Раскомментируй в .env:
OPENAI_BASE_URL=http://localhost:4141/v1
OPENAI_API_KEY=kitana
MODEL=auto

**Вариант B — Gemini Flash (бесплатно)**
Получи ключ: aistudio.google.com → Get API Key

GOOGLE_API_KEY=AIza...
MODEL=gemini-flash-latest

⚠️ Лимит: 15 req/min. Если 429 — подожди 10 сек.

**Вариант C — Ollama (офлайн)**
Установи: ollama.com → затем: ollama pull llama3.2

OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
MODEL=llama3.2

### 4. Проверь что всё работает

npx tsx examples/01-adk/hello-agent.ts

Должен увидеть ответ агента в терминале. Если работает — ты готов.

---

## Структура репо

tasks/
  index.md        ← карта всех заданий, читай сюда
  01-adk.md       ← волна 1: ADK basics
  02-api.md       ← волна 2: API провайдеры
  03-kitana.md    ← волна 3: Kitana SDK

examples/
  01-adk/         ← скелеты для волны 1
  02-api/         ← скелеты для волны 2
  03-kitana/      ← скелеты для волны 3

src/              ← пиши свой код сюда
parsers/          ← парсеры соцсетей (Telegram, YouTube, Reddit, Instagram)
pipeline.ts       ← готовый Lead Finder пайплайн

---

## Задания

Открой tasks/index.md — там карта всего воркшопа.

Правила:
- Пиши код в src/
- В examples/ смотри только если завис больше 5 минут
- Запуск: npx tsx src/твой-файл.ts

---

## Lead Finder — готовый пайплайн

Если хочешь запустить готовый пайплайн поиска лидов:

cp .env.example .env
# настрой SOURCE= (telegram/youtube/reddit/instagram)
# заполни credentials нужного источника
npm start

---

## Требования

- Node.js 18+
- Один из провайдеров: Claude подписка / Google API key / Ollama

---

## Вопросы

Задавай ведущему или смотри в tasks/index.md.
```

---

## Дополнительно: README для @kitana-sdk/core (когда опубликуем)

```markdown
# @kitana-sdk/core

Run any local AI CLI without API keys. Auto-detects claude, ollama, gemini.
Failover chain: if one provider fails, tries the next.

## Install

npm install @kitana-sdk/core

## Usage

import { Kitana } from '@kitana-sdk/core'

// Auto-detect what's installed
const ai = new Kitana()

// Or specify providers (order = failover priority)
const ai = new Kitana({ providers: ['claude', 'ollama'] })

const result = await ai.ask('Hello!')
console.log(result.text)      // response text
console.log(result.provider)  // who answered: 'claude' | 'ollama' | 'gemini'
console.log(result.cost)      // '$0.003' or 'free (local)'

## Detect what's installed

import { KitanaDetector } from '@kitana-sdk/core'
const providers = await KitanaDetector.detect()
console.table(providers)

## .env config

KITANA_PROVIDERS=claude,ollama   # order = failover priority
KITANA_MODEL=llama3.2            # for ollama
KITANA_OLLAMA_URL=http://localhost:11434

## Requirements

- Node.js 18+
- At least one of: claude CLI, ollama, gemini CLI

## Part of Kitana SDK

- @kitana-sdk/core    — this package
- @kitana-sdk/server  — OpenAI-compatible HTTP server (published)
```
