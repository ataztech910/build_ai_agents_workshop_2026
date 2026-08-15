# CONTEXT: Недостающие скелеты примеров

---

## examples/01-adk/parallel.ts

```typescript
/**
 * Скелет: 1.4 — ParallelAgent (бонус)
 * Задание: tasks/01-adk.md
 *
 * Цель: запустить двух независимых агентов одновременно
 * и убедиться что время выполнения ~в 2 раза меньше чем последовательно
 */
import { LlmAgent, ParallelAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

// TODO: два независимых агента-исследователя на разные темы
const researcherA = new LlmAgent({
  name:        "researcher-a",
  model:       "gemini-flash-latest",
  instruction: "", // TODO: исследует тему А, возвращает 3 факта
});

const researcherB = new LlmAgent({
  name:        "researcher-b",
  model:       "gemini-flash-latest",
  instruction: "", // TODO: исследует тему Б, возвращает 3 факта
});

// TODO: оберни в ParallelAgent
const parallel = new ParallelAgent({
  name:      "parallel-research",
  subAgents: [], // TODO: [researcherA, researcherB]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner  = new Runner({ agent: parallel, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // Замеряем время
  const start = Date.now();

  for await (const event of runner.runAsync({
    userId:     "user",
    sessionId:  session.id,
    newMessage: {
      role:  "user",
      parts: [{ text: "Исследуй обе темы параллельно" }],
    },
  })) {
    if (event.content?.parts?.[0]?.text) {
      console.log(`[${event.author}]`, event.content.parts[0].text.slice(0, 100));
    }
  }

  console.log(`\n⏱  Время: ${Date.now() - start}ms`);

  // TODO: запусти тех же двух агентов последовательно через SequentialAgent
  // и сравни время. Что быстрее и почему?
}

main().catch(console.error);
```

---

## examples/02-api/claude-agent.ts

```typescript
/**
 * Скелет: 2.1 — Claude API
 * Задание: tasks/02-api.md
 *
 * Нужен: ANTHROPIC_API_KEY в .env
 * Или:   Kitana Server запущен (OPENAI_BASE_URL=http://localhost:4141/v1)
 */
import "dotenv/config";
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

// TODO: создай агента на Claude
// Подсказка: model = "claude-sonnet-4-5"
// Если используешь Kitana Server — model = "auto" и ADK подключится через OPENAI_BASE_URL
const agent = new LlmAgent({
  name:        "claude-analyst",
  model:       "", // TODO: "claude-sonnet-4-5" или "auto" для Kitana
  instruction: "", // TODO: аналитик который сравнивает технологии
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner  = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // TODO: задай задачу которая требует рассуждений
  // Например: "Сравни плюсы и минусы TypeScript vs Python для AI агентов"
  const question = ""; // TODO

  console.log(`\n🤖 Claude отвечает на: "${question}"\n`);

  for await (const event of runner.runAsync({
    userId:     "user",
    sessionId:  session.id,
    newMessage: { role: "user", parts: [{ text: question }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text);
    }
  }

  // TODO: запусти тот же вопрос на gemini-flash-latest и сравни ответы
  // В чём разница? Что лучше для этой задачи?
  console.log("\n\n💡 Попробуй тот же вопрос на Gemini и сравни качество ответа");
}

main().catch(console.error);
```

---

## examples/02-api/gemini-agent.ts

```typescript
/**
 * Скелет: 2.2 — Gemini API + Google Search
 * Задание: tasks/02-api.md
 *
 * Нужен: GOOGLE_API_KEY в .env
 * Получи бесплатно: aistudio.google.com → Get API Key
 *
 * ⚠️  Лимит на бесплатном тире: 15 req/min
 *     Если получаешь 429 — подожди 10 сек и повтори
 */
import "dotenv/config";
import { LlmAgent } from "@google/adk/agents";
import { GoogleSearch } from "@google/adk/tools";  // встроенный инструмент ADK
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

// TODO: создай агента с Google Search инструментом
const agent = new LlmAgent({
  name:        "gemini-searcher",
  model:       "gemini-flash-latest",
  instruction: "", // TODO: агент который ищет актуальную информацию и цитирует источники
  tools:       [], // TODO: [new GoogleSearch()]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner  = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // TODO: спроси о чём-то актуальном что агент не мог знать заранее
  // Например: "Какие новые AI модели вышли в последние 2 недели?"
  const question = ""; // TODO

  console.log(`\n🔍 Gemini ищет: "${question}"\n`);

  for await (const event of runner.runAsync({
    userId:     "user",
    sessionId:  session.id,
    newMessage: { role: "user", parts: [{ text: question }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text);
    }
    // TODO: покажи когда агент вызвал Google Search инструмент
    // Подсказка: смотри на event.content?.parts — там может быть tool_use блок
  }
}

main().catch(console.error);
```

---

## examples/03-kitana/failover.ts

```typescript
/**
 * Скелет: 3.3 — Kitana failover
 * Задание: tasks/03-kitana.md
 *
 * Цель: убедиться что при падении первого провайдера
 * Kitana автоматически переключается на следующего
 */
import { Kitana } from "@kitana-sdk/core";

async function main() {
  // TODO: настрой цепочку с намеренно сломанным первым провайдером
  // Подсказка: добавь несуществующий бинарник первым
  const ai = new Kitana({
    providers: [], // TODO: ['fake-provider', 'claude', 'ollama']
  });

  console.log("🔄 Тестируем failover...\n");

  // TODO: запусти запрос и посмотри как Kitana логирует переключения
  const result = await ai.ask(
    "Скажи какой провайдер тебя запустил и почему предыдущий мог упасть"
  );

  // TODO: выведи лог переключений и финальный провайдер
  console.log(`\n✅ Ответил: ${result.provider}`);
  console.log(`   Токены: ${result.usage?.totalTokens ?? "n/a"}`);
  console.log(`\n${result.text}`);

  // TODO: эксперимент — поменяй порядок провайдеров
  // Что изменится если поставить ollama первым а claude вторым?
}

main().catch(console.error);
```

---

## Примечания по скелетам

**parallel.ts:**
`ParallelAgent` в ADK запускает subAgents одновременно.
Результаты собираются когда все завершили.
Хорошо для независимых задач — например анализ разных источников данных.

**claude-agent.ts:**
Если участник использует Kitana Server (`OPENAI_BASE_URL=localhost:4141`),
то model можно поставить `"auto"` — сервер сам решит.
Если прямой API — `"claude-sonnet-4-5"`.

**gemini-agent.ts:**
`GoogleSearch` — встроенный инструмент ADK, не нужно писать FunctionTool.
Работает только с Gemini моделями (не с Claude).
На бесплатном тире может быть медленным — предупредить участников.

**failover.ts:**
`fake-provider` бросит ошибку "not found" → Kitana поймает → попробует следующего.
В логах должно быть видно:
```
[kitana] trying: fake-provider... ❌ not found
[kitana] trying: claude... ✅
```
