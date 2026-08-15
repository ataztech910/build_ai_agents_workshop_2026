# CONTEXT: Структура репо и что нужно сделать

---

## Структура репо воркшопа

```
workshop-repo/
  tasks/
    index.md              ✅ готов — карта заданий
    01-adk.md             ✅ готов — волна 1: ADK basics
    02-api.md             ✅ готов — волна 2: API провайдеры
    03-kitana.md          ✅ готов — волна 3: Kitana
  examples/
    01-adk/
      hello-agent.ts      ✅ скелет готов
      tool-agent.ts       ✅ скелет готов
      sequential.ts       ✅ скелет готов
      parallel.ts         ❌ нужно написать
    02-api/
      claude-agent.ts     ❌ нужно написать
      gemini-agent.ts     ❌ нужно написать
      routing.ts          ✅ скелет готов
      lead-finder.ts      ✅ скелет готов (с фейковыми комментариями)
    03-kitana/
      detector.ts         ✅ скелет готов
      runner.ts           ✅ скелет готов
      failover.ts         ❌ нужно написать
      bible.ts            ✅ скелет готов
  parsers/
    types.ts              ✅ готов — единый ParseResult интерфейс
    index.ts              ✅ готов — роутер по SOURCE=
    youtube.ts            ✅ готов
    reddit.ts             ✅ готов
    instagram.ts          ✅ готов (Playwright + stealth + GraphQL перехват)
  telegram-parser.ts      ✅ готов (gramjs MTProto)
  pipeline.ts             ✅ готов — главный оркестратор
  architecture.svg        ✅ готов — схема для проектора
  package.json            ✅ готов
  .env.example            ✅ готов — 4 варианта провайдера
  TASKS.md                ✅ готов — старая версия (заменена папкой tasks/)
```

---

## Что нужно дописать в репо воркшопа

### Высокий приоритет (до воркшопа)
- [ ] `examples/01-adk/parallel.ts` — скелет для задания 1.4
- [ ] `examples/02-api/claude-agent.ts` — скелет для задания 2.1
- [ ] `examples/02-api/gemini-agent.ts` — скелет для задания 2.2
- [ ] `examples/03-kitana/failover.ts` — скелет для задания 3.3
- [ ] `scripts/check-env.ts` — скрипт проверки окружения (`npm run check`)
- [ ] `.gitignore` — session файлы, .env, leads_*.json

### Средний приоритет
- [ ] Заполненные версии всех скелетов (в отдельной ветке `solutions/`)
- [ ] `examples/02-api/lead-finder-real.ts` — версия с реальным парсером

---

## @kitana-sdk/core — что нужно написать

### Версия 0.1 (для воркшопа)

```typescript
// detector.ts
export class KitanaDetector {
  async scan(): Promise<Provider[]>
  // проверяет: which claude, ollama list, gemini --version
  // возвращает: [{ name, version, authorized, models }]
}

// runner.ts
export class KitanaRunner {
  run(provider: string, prompt: string, options?: RunOptions): RunResult
  // spawnSync('claude', ['-p', prompt, '--output-format', 'json'])
  // парсит: text, usage.totalTokens, cost (из total_cost_usd)
}

// failover.ts
export class KitanaFailover {
  constructor(providers: string[])
  async run(prompt: string): Promise<RunResult & { provider: string }>
  // пробует провайдеров по порядку, логирует переключения
}

// index.ts — главный класс
export class Kitana {
  constructor(options?: KitanaOptions)
  // options из .env если не переданы явно
  async ask(prompt: string, systemPrompt?: string): Promise<KitanaResult>
}

export interface KitanaOptions {
  providers?: string[]   // ['claude', 'ollama'] — порядок = failover
  model?: string         // для ollama
}

export interface KitanaResult {
  text: string
  provider: string       // кто ответил
  usage?: { totalTokens: number }
  cost?: string          // из claude CLI JSON
}
```

### Версия 0.2 (после воркшопа)

```
bible.ts      — типы + readBible() / updateBible() / snapshotStep()
compressor.ts — три режима: авто / конфиг / агент-саммаризатор
```

---

## Зависимости

### Репо воркшопа
```json
{
  "@google/adk": "latest",
  "@google/genai": "latest",
  "@kitana-sdk/core": "latest",
  "@kitana-sdk/server": "latest",
  "telegram": "^2.25.15",
  "snoowrap": "^1.23.0",
  "playwright": "^1.45.0",
  "playwright-extra": "^4.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2",
  "zod": "^3.23.0",
  "dotenv": "^16.0.0"
}
```

### @kitana-sdk/core
```json
{
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```
Zero зависимостей для детекции — только Node.js built-ins.

---

## .env.example (финальный)

```env
# Вариант A: Kitana Server (рекомендуется)
# npx @kitana-sdk/server  → запусти в отдельном терминале
# OPENAI_BASE_URL=http://localhost:4141/v1
# OPENAI_API_KEY=kitana
# MODEL=auto

# Вариант B: Gemini Flash (бесплатно)
# aistudio.google.com → Get API Key
# ⚠️ Лимит: 15 req/min. Если 429 — подожди 10 сек
# GOOGLE_API_KEY=AIza...
# MODEL=gemini-flash-latest

# Вариант C: Ollama (офлайн)
# ollama pull llama3.2
# OPENAI_BASE_URL=http://localhost:11434/v1
# OPENAI_API_KEY=ollama
# MODEL=llama3.2

# Вариант D: Claude API (платный)
# ANTHROPIC_API_KEY=sk-ant-...
# MODEL=claude-sonnet-4-5
```

---

## Задания воркшопа — структура

### Волна 1 — ADK basics (~35 мин)
- 1.1 Первый LlmAgent
- 1.2 FunctionTool
- 1.3 SequentialAgent
- 1.4 ParallelAgent (бонус)

### Волна 2 — API провайдеры (~35 мин)
- 2.1 Claude API
- 2.2 Gemini API + Google Search tool
- 2.3 Model Routing + failover
- 2.4 Lead Finder пайплайн (кульминация)

### Волна 3 — Kitana (~25 мин)
- 3.1 Detector — сканируем окружение
- 3.2 Runner — CLI без API ключа
- 3.3 Failover — цепочка провайдеров
- 3.4 Библия проекта (бонус)
