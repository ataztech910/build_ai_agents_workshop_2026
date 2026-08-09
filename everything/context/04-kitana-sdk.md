# CONTEXT: Kitana SDK — архитектура и roadmap

---

## Что уже опубликовано

### @kitana-sdk/server
OpenAI-compatible HTTP сервер поверх Claude CLI.

```
POST /v1/chat/completions   stream: true поддерживается
GET  /v1/models
GET  /health
```

Запуск: `npx @kitana-sdk/server` или `PORT=4141 kitana-server`  
При первом запуске: авто-установка Claude CLI + `claude auth login`

### @kitana-sdk/core
Базовый пакет. Используется внутри `@kitana-sdk/server`.  
Публичный API ещё не финализирован.

---

## Планируемая архитектура @kitana-sdk/core

```
@kitana-sdk/core
  src/
    detector.ts     — сканирует окружение
    runner.ts       — вызывает CLI через spawnSync
    failover.ts     — цепочка провайдеров
    bible.ts        — типы + I/O для .kitana/bible/
    compressor.ts   — сжатие контекста
    index.ts        — главный класс Kitana
```

---

## Публичный API (финальный вид)

```typescript
import { Kitana } from '@kitana-sdk/core'

// Минимально — всё из .env
const ai = new Kitana()

// Явная конфигурация (override .env)
const ai = new Kitana({
  providers: ['claude', 'ollama'],  // порядок = приоритет failover
  model: 'llama3.2',               // для ollama
})

const result = await ai.ask('Проанализируй этих лидов...')

result.text      // текст ответа
result.provider  // 'claude' | 'ollama' | 'gemini'
result.usage     // { totalTokens: 142 }
result.cost      // '$0.003' или 'free (CLI)' 
```

---

## .env переменные

```env
KITANA_PROVIDERS=claude,ollama    # порядок = приоритет
KITANA_MODEL=llama3.2             # для ollama
KITANA_OLLAMA_URL=http://localhost:11434
```

Приоритет конфига:
1. явный аргумент в конструкторе
2. .env
3. автодетект (detector.ts находит что есть и берёт первое)

---

## detector.ts — как работает

```typescript
// Проверяет наличие и статус каждого CLI
const checks = {
  claude: {
    version: 'claude --version',
    auth:    'claude auth status',
    models:  ['claude-sonnet-4-5', 'claude-haiku-4-5']
  },
  ollama: {
    version: 'ollama --version',
    auth:    'curl http://localhost:11434/api/tags',
    models:  // парсит из API ответа
  },
  gemini: {
    version: 'gemini --version',
    auth:    'gemini auth status',
    models:  ['gemini-2.0-flash']
  }
}
```

Zero зависимостей — только `child_process.execSync` и `fetch`.

---

## runner.ts — как работает

```typescript
// Claude CLI
spawnSync('claude', [
  '-p', prompt,
  '--output-format', 'json',
  '--system', systemPrompt  // если передан
])

// Парсит JSON ответ Claude CLI:
// {
//   result: "текст ответа",
//   total_cost_usd: 0.003,
//   modelUsage: { "claude-sonnet-4-5": { inputTokens: 100, outputTokens: 42 } }
// }

// Ollama — через HTTP API
fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({ model, prompt, stream: false })
})
```

---

## bible.ts — структура файлов

```
.kitana/
  bible/
    mission.md          — цель проекта, ICP. Пишется один раз, не меняется.
    progress.md         — лог шагов агентов. Обновляется после каждого шага.
    snapshots/
      01_parser.json    — полный результат парсера
      02_analyst.json   — топ лиды
      03_copywriter.json — офферы
```

Протокол агента:
```typescript
// Каждый агент после работы обязан вызвать:
await bible.update('analyst', result)
// Записывает в progress.md + создаёт snapshots/02_analyst.json
```

Возобновление:
```typescript
const done = await bible.getProgress('analyst')
if (done) {
  console.log('пропускаем — уже выполнено')
  return done.result
}
```

---

## compressor.ts — три режима

```typescript
// Режим 1: авто (по размеру контекст окна модели)
await compressor.compress(bible, { mode: 'auto', targetModel: 'llama3.2' })

// Режим 2: конфиг разработчика
await compressor.compress(bible, { mode: 'config', maxTokens: 4096 })

// Режим 3: агент-саммаризатор
await compressor.compress(bible, { mode: 'agent', provider: 'claude' })
```

Dense format — убирает воду, оставляет факты:
```
# было:
"The parser agent successfully extracted 47 comments from @channel between Jan-Mar 2026..."

# стало:
parser: 47 comments @channel jan-mar2026
signals: automation×12 scaling×8 nocode×6
```

Китайские иероглифы — отложено до v0.3 (нужны тесты на слабых моделях).

---

## Roadmap

### v0.1 — для воркшопа
- [ ] detector.ts
- [ ] runner.ts (claude + ollama)
- [ ] failover.ts
- [ ] Kitana класс + .env поддержка

### v0.2 — после воркшопа
- [ ] bible.ts типы + I/O
- [ ] compressor.ts авто режим
- [ ] runner.ts gemini поддержка

### v0.3 — когда есть пользователи
- [ ] compressor.ts конфиг + агент режимы
- [ ] @kitana-sdk/adk адаптер для Google ADK
- [ ] @kitana-sdk/vercel адаптер для Electron/Next.js

---

## Связь с воркшопом

На воркшопе Kitana используется через `@kitana-sdk/server`:

```bash
# Участник запускает один раз
npx @kitana-sdk/server

# ADK подключается как к OpenAI
OPENAI_BASE_URL=http://localhost:4141/v1
OPENAI_API_KEY=kitana
```

`@kitana-sdk/core` публичный API показывается в волне 3 как  
"вот как это работает под капотом".
