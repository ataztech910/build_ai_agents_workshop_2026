# CONTEXT: Полный код @kitana-sdk/core v0.1

Это код который нужно написать. Пока не реализован — только @kitana-sdk/server опубликован.

---

## src/types.ts

```typescript
export interface Provider {
  name:       string;
  version:    string | null;
  authorized: boolean;
  models:     string[];
  available:  boolean;
}

export interface RunOptions {
  systemPrompt?: string;
  model?:        string;
  maxTokens?:    number;
}

export interface RunResult {
  text:     string;
  provider: string;
  usage?:   { totalTokens: number; inputTokens: number; outputTokens: number };
  cost?:    string;  // "$0.003" или "free (CLI)"
  raw?:     unknown; // полный ответ провайдера
}

export interface KitanaOptions {
  providers?: string[];   // ['claude', 'ollama', 'gemini'] — порядок = failover
  model?:     string;     // для ollama
  ollamaUrl?: string;     // default: http://localhost:11434
}
```

---

## src/detector.ts

```typescript
import { execSync } from "node:child_process";
import type { Provider } from "./types.js";

export class KitanaDetector {
  async scan(): Promise<Provider[]> {
    const results: Provider[] = [];

    results.push(await this.checkClaude());
    results.push(await this.checkOllama());
    results.push(await this.checkGemini());

    return results.filter((p) => p.available);
  }

  private checkClaude(): Provider {
    try {
      const version = execSync("claude --version", { encoding: "utf-8", timeout: 3000 }).trim();

      let authorized = false;
      try {
        const status = execSync("claude auth status", { encoding: "utf-8", timeout: 3000 });
        authorized = status.includes("Logged in") || status.includes("authenticated");
      } catch { /* не авторизован */ }

      return {
        name:       "claude",
        version:    version.match(/[\d.]+/)?.[0] ?? version,
        authorized,
        models:     ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-6"],
        available:  true,
      };
    } catch {
      return { name: "claude", version: null, authorized: false, models: [], available: false };
    }
  }

  private async checkOllama(): Promise<Provider> {
    try {
      const version = execSync("ollama --version", { encoding: "utf-8", timeout: 3000 }).trim();
      const ollamaUrl = process.env.KITANA_OLLAMA_URL ?? "http://localhost:11434";

      let models: string[] = [];
      let authorized = false;
      try {
        const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
        const data = await res.json() as { models: Array<{ name: string }> };
        models = data.models.map((m) => m.name);
        authorized = true;
      } catch { /* ollama не запущен */ }

      return {
        name:      "ollama",
        version:   version.match(/[\d.]+/)?.[0] ?? version,
        authorized,
        models,
        available: true,
      };
    } catch {
      return { name: "ollama", version: null, authorized: false, models: [], available: false };
    }
  }

  private checkGemini(): Provider {
    try {
      const version = execSync("gemini --version", { encoding: "utf-8", timeout: 3000 }).trim();

      let authorized = false;
      try {
        execSync("gemini auth status", { encoding: "utf-8", timeout: 3000 });
        authorized = true;
      } catch { /* не авторизован */ }

      return {
        name:      "gemini",
        version:   version.match(/[\d.]+/)?.[0] ?? version,
        authorized,
        models:    ["gemini-2.0-flash"],
        available: true,
      };
    } catch {
      return { name: "gemini", version: null, authorized: false, models: [], available: false };
    }
  }
}
```

---

## src/runner.ts

```typescript
import { spawnSync } from "node:child_process";
import type { RunOptions, RunResult } from "./types.js";

// Формат JSON ответа Claude CLI
interface ClaudeCliResponse {
  result:          string;
  total_cost_usd:  number;
  modelUsage?:     Record<string, { inputTokens: number; outputTokens: number }>;
}

export class KitanaRunner {

  runClaude(prompt: string, options: RunOptions = {}): RunResult {
    const args = ["-p", prompt, "--output-format", "json"];
    if (options.systemPrompt) args.push("--system", options.systemPrompt);

    const result = spawnSync("claude", args, {
      encoding: "utf-8",
      timeout:  120_000,  // 2 минуты
    });

    if (result.error) throw new Error(`Claude CLI error: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`Claude CLI exited ${result.status}: ${result.stderr}`);

    let parsed: ClaudeCliResponse;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      // Claude иногда возвращает текст без JSON обёртки
      return { text: result.stdout.trim(), provider: "claude" };
    }

    // Считаем токены из modelUsage
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    for (const usage of Object.values(parsed.modelUsage ?? {})) {
      inputTokens  += usage.inputTokens;
      outputTokens += usage.outputTokens;
      totalTokens  += usage.inputTokens + usage.outputTokens;
    }

    return {
      text:     parsed.result,
      provider: "claude",
      usage:    { totalTokens, inputTokens, outputTokens },
      cost:     parsed.total_cost_usd ? `$${parsed.total_cost_usd.toFixed(4)}` : "free",
      raw:      parsed,
    };
  }

  async runOllama(prompt: string, options: RunOptions = {}): Promise<RunResult> {
    const ollamaUrl = process.env.KITANA_OLLAMA_URL ?? "http://localhost:11434";
    const model     = options.model ?? process.env.KITANA_MODEL ?? "llama3.2";

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ model, messages, stream: false }),
    });

    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      message: { content: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    const outputTokens = data.eval_count ?? 0;
    const inputTokens  = data.prompt_eval_count ?? 0;

    return {
      text:     data.message.content,
      provider: "ollama",
      usage:    { totalTokens: inputTokens + outputTokens, inputTokens, outputTokens },
      cost:     "free (local)",
      raw:      data,
    };
  }

  runGemini(prompt: string, options: RunOptions = {}): RunResult {
    const args = ["-p", prompt];
    if (options.systemPrompt) args.push("--system", options.systemPrompt);

    const result = spawnSync("gemini", args, {
      encoding: "utf-8",
      timeout:  60_000,
    });

    if (result.error) throw new Error(`Gemini CLI error: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`Gemini CLI exited ${result.status}: ${result.stderr}`);

    return {
      text:     result.stdout.trim(),
      provider: "gemini",
      cost:     "free (CLI)",
      raw:      result.stdout,
    };
  }
}
```

---

## src/failover.ts

```typescript
import { KitanaRunner } from "./runner.js";
import type { RunOptions, RunResult } from "./types.js";

export class KitanaFailover {
  private providers: string[];
  private runner:    KitanaRunner;

  constructor(providers: string[]) {
    this.providers = providers;
    this.runner    = new KitanaRunner();
  }

  async run(prompt: string, options: RunOptions = {}): Promise<RunResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      console.log(`   [kitana] trying: ${provider}...`);

      try {
        const result = await this.runProvider(provider, prompt, options);
        console.log(`   [kitana] ✅ ${provider} ответил`);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`   [kitana] ❌ ${provider} failed: ${msg}`);
        errors.push(`${provider}: ${msg}`);
      }
    }

    throw new Error(
      `Все провайдеры недоступны:\n${errors.join("\n")}`
    );
  }

  private async runProvider(
    provider: string,
    prompt: string,
    options: RunOptions
  ): Promise<RunResult> {
    switch (provider) {
      case "claude":
        return this.runner.runClaude(prompt, options);
      case "ollama":
        return this.runner.runOllama(prompt, options);
      case "gemini":
        return this.runner.runGemini(prompt, options);
      default:
        throw new Error(`Неизвестный провайдер: ${provider}`);
    }
  }
}
```

---

## src/index.ts — главный класс Kitana

```typescript
import "dotenv/config";
import { KitanaDetector } from "./detector.js";
import { KitanaFailover } from "./failover.js";
import type { KitanaOptions, RunResult } from "./types.js";

export { KitanaDetector }   from "./detector.js";
export { KitanaRunner }     from "./runner.js";
export { KitanaFailover }   from "./failover.js";
export type { Provider, RunOptions, RunResult, KitanaOptions } from "./types.js";

export class Kitana {
  private failover: KitanaFailover;

  constructor(options: KitanaOptions = {}) {
    // Приоритет: явный аргумент → .env → автодетект
    const providers = options.providers
      ?? this.parseEnvProviders()
      ?? this.autoDetect();

    this.failover = new KitanaFailover(providers);
  }

  async ask(prompt: string, systemPrompt?: string): Promise<RunResult> {
    return this.failover.run(prompt, { systemPrompt });
  }

  // Утилита для воркшопа — показывает что установлено
  static async detect() {
    const detector = new KitanaDetector();
    return detector.scan();
  }

  private parseEnvProviders(): string[] | null {
    const env = process.env.KITANA_PROVIDERS;
    if (!env) return null;
    return env.split(",").map((p) => p.trim()).filter(Boolean);
  }

  private autoDetect(): string[] {
    // Синхронная быстрая проверка — просто which
    const { execSync } = require("node:child_process");
    const candidates = ["claude", "ollama", "gemini"];
    const available: string[] = [];

    for (const p of candidates) {
      try {
        execSync(`which ${p}`, { stdio: "ignore" });
        available.push(p);
      } catch { /* не установлен */ }
    }

    if (available.length === 0) {
      throw new Error(
        "Не найден ни один AI провайдер.\n" +
        "Установи claude (claude.ai/code), ollama (ollama.com), или gemini CLI."
      );
    }

    console.log(`[kitana] автодетект: ${available.join(", ")}`);
    return available;
  }
}
```

---

## package.json для @kitana-sdk/core

```json
{
  "name": "@kitana-sdk/core",
  "version": "0.1.0",
  "description": "Run AI CLI tools locally without API keys",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types":  "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev":   "tsc --watch"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript":  "^5.0.0",
    "@types/node": "^22.0.0"
  },
  "keywords": ["claude", "ollama", "gemini", "ai", "cli", "local"],
  "license": "MIT"
}
```

---

## Пример использования

```typescript
import { Kitana, KitanaDetector } from "@kitana-sdk/core";

// Проверить что установлено
const providers = await KitanaDetector.detect();
console.table(providers);

// Простой запрос — всё из .env или автодетект
const ai = new Kitana();
const result = await ai.ask("Привет!");
console.log(result.text, result.provider, result.cost);

// Явная конфигурация
const ai2 = new Kitana({ providers: ["claude", "ollama"] });
const r = await ai2.ask("Анализируй...", "Ты аналитик данных.");
console.log(r.provider); // claude или ollama если claude упал
```

---

## Важные детали реализации

**Почему spawnSync а не spawn для Claude:**
Claude CLI блокирующий — ждёт полного ответа.
Streaming через CLI сложнее, для воркшопа не нужен.

**Почему Ollama через HTTP а не CLI:**
`ollama run` интерактивный, неудобен для программного вызова.
HTTP API чище и поддерживает JSON ответ напрямую.

**Автодетект vs явный конфиг:**
Автодетект — удобство для быстрого старта.
Явный конфиг — предсказуемость в продакшне.
На воркшопе рекомендуем явный через .env.

**Zero зависимостей:**
Только Node.js built-ins: `child_process`, `fetch` (Node 18+).
Это важно — участники не тратят время на установку.
