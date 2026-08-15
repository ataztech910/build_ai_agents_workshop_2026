# CONTEXT: Все скелеты примеров для воркшопа

---

## examples/01-adk/hello-agent.ts

```typescript
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { Content } from "@google/genai";

const agent = new LlmAgent({
  name: "hello",
  model: "gemini-flash-latest",
  instruction: "", // TODO: напиши инструкцию на русском
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });
  const message: Content = { role: "user", parts: [{ text: "" }] }; // TODO: вопрос

  for await (const event of runner.runAsync({ userId: "user", sessionId: session.id, newMessage: message })) {
    if (event.content?.parts?.[0]?.text) process.stdout.write(event.content.parts[0].text);
  }
}
main().catch(console.error);
```

---

## examples/01-adk/tool-agent.ts

```typescript
import { LlmAgent } from "@google/adk/agents";
import { FunctionTool } from "@google/adk/tools";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { z } from "zod";

const weatherTool = new FunctionTool({
  name: "getWeather",
  description: "", // TODO
  parameters: z.object({ city: z.string().describe("Название города") }),
  execute: async ({ city }) => {
    // TODO: верни фейковые данные
    return {};
  },
});

const agent = new LlmAgent({
  name: "weather",
  model: "gemini-flash-latest",
  instruction: "", // TODO
  tools: [], // TODO: [weatherTool]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });
  // TODO: запусти с вопросом о погоде
}
main().catch(console.error);
```

---

## examples/01-adk/sequential.ts

```typescript
import { LlmAgent, SequentialAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

const topic = process.argv[2] ?? "квантовые компьютеры";

const researcher = new LlmAgent({
  name: "researcher",
  model: "gemini-flash-latest",
  instruction: "", // TODO: получает тему, возвращает JSON { facts: string[] }
});

const editor = new LlmAgent({
  name: "editor",
  model: "gemini-flash-latest",
  instruction: "", // TODO: получает факты, переписывает в один абзац
});

const pipeline = new SequentialAgent({
  name: "research-pipeline",
  subAgents: [], // TODO: [researcher, editor]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent: pipeline, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  for await (const event of runner.runAsync({
    userId: "user", sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: topic }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      console.log(`[${event.author}]`, event.content.parts[0].text);
    }
  }
}
main().catch(console.error);
```

---

## examples/02-api/routing.ts

```typescript
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

const agent = new LlmAgent({
  name: "routing-agent",
  model: "", // TODO: primary модель
  instruction: "Всегда указывай какую модель используешь.",
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  for await (const event of runner.runAsync({
    userId: "user", sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: "Какая модель со мной разговаривает?" }] },
  })) {
    if (event.content?.parts?.[0]?.text) process.stdout.write(event.content.parts[0].text);
  }
}
main().catch(console.error);
```

---

## examples/02-api/lead-finder.ts

```typescript
import { LlmAgent, SequentialAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { writeFileSync } from "node:fs";

// Фейковые комментарии для демо
const FAKE_COMMENTS = [
  { author: "Иван Петров",    username: "@ivanp",     text: "Уже полгода пытаюсь автоматизировать отчёты, всё вручную — сил нет" },
  { author: "Мария Сидорова", username: "@masha_biz", text: "Подскажите, есть ли что-то чтобы сэкономить время на рутине?" },
  { author: "Алексей К.",     username: "@alex_dev",  text: "Интересная тема, но мне как разработчику проще самому написать" },
  { author: "Ольга Романова", username: "@olga_hr",   text: "Мы тратим по 3 часа в день на ручной ввод данных" },
  { author: "Дмитрий Лис",    username: "@dmlisenko",  text: "А сколько это стоит? Есть ли пробный период?" },
  { author: "Света Иванова",  username: "@sveta_mm",  text: "Классный контент, лайк!" },
  { author: "Николай Фролов", username: "@nik_ceo",   text: "Хочу масштабировать бизнес но не хватает людей на операционку" },
  { author: "Тимур Асанов",   username: "@timur_a",   text: "Пробовал ChatGPT, не то, ищу специализированное решение" },
  { author: "Катя Морозова",  username: "@katya_smm", text: "Огонь пост 🔥" },
  { author: "Сергей Быков",   username: "@byk_sergei", text: "Как это работает с CRM? Есть интеграция с AmoCRM?" },
];

const ICP = `
  Курс по автоматизации бизнеса с ИИ.
  Идеальный клиент: владелец бизнеса или менеджер,
  жалуется на рутину, не разработчик, хочет готовое решение.
`;

// TODO: Агент-аналитик
// { top_leads: [{ author, username, score, reason, key_quote }] }
const analyst = new LlmAgent({
  name: "analyst",
  model: "claude-sonnet-4-5",
  instruction: "", // TODO
});

// TODO: Агент-копирайтер
// { offers: [{ author, message, hook, cta }] }
const copywriter = new LlmAgent({
  name: "copywriter",
  model: "claude-sonnet-4-5",
  instruction: "", // TODO
});

// TODO: Агент-валидатор
// отклоняет шаблонные офферы и переписывает
const validator = new LlmAgent({
  name: "validator",
  model: "claude-sonnet-4-5",
  instruction: "", // TODO
});

const pipeline = new SequentialAgent({
  name: "lead-finder",
  subAgents: [], // TODO: [analyst, copywriter, validator]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent: pipeline, appName: "lead-finder", sessionService });
  const session = await sessionService.createSession({ appName: "lead-finder", userId: "user" });

  const prompt = `ICP: ${ICP}\nКомментарии: ${JSON.stringify(FAKE_COMMENTS, null, 2)}`;
  let finalResult = "";

  for await (const event of runner.runAsync({
    userId: "user", sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: prompt }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const text = event.content.parts[0].text;
      console.log(`\n[${event.author}]`, text.slice(0, 100), "...");
      finalResult = text;
    }
  }

  writeFileSync("leads_result.json", finalResult);
  console.log("\n💾 Сохранено: leads_result.json");
}
main().catch(console.error);
```

---

## examples/03-kitana/detector.ts

```typescript
import { KitanaDetector } from "@kitana-sdk/core";

async function main() {
  const detector = new KitanaDetector();
  const providers = await detector.scan();

  console.table(providers.map((p) => ({
    provider:   p.name,
    version:    p.version ?? "-",
    authorized: p.authorized ? "✅" : "❌",
    models:     p.models?.join(", ") ?? "-",
  })));

  const best = providers.find((p) => p.authorized);
  console.log(best ? `\n✅ Рекомендуется: ${best.name}` : "\n❌ Нет доступных провайдеров");
}
main().catch(console.error);
```

---

## examples/03-kitana/runner.ts

```typescript
import { Kitana } from "@kitana-sdk/core";

async function main() {
  const ai = new Kitana({
    providers: [], // TODO: ['claude', 'ollama']
  });

  const result = await ai.ask("Объясни что такое ИИ агент в двух предложениях");

  console.log(`\nПровайдер: ${result.provider}`);
  console.log(`Токены:    ${result.usage?.totalTokens ?? "n/a"}`);
  console.log(`Стоимость: ${result.cost ?? "бесплатно (CLI)"}`);
  console.log(`\nОтвет:\n${result.text}`);
}
main().catch(console.error);
```

---

## examples/03-kitana/bible.ts

```typescript
import { Kitana, KitanaBible } from "@kitana-sdk/core";

const FAKE_COMMENTS = [
  { author: "Иван Петров",    text: "Уже полгода пытаюсь автоматизировать отчёты" },
  { author: "Мария Сидорова", text: "Есть ли что-то чтобы сэкономить время?" },
  { author: "Николай Фролов", text: "Хочу масштабировать бизнес" },
];

const bible = new KitanaBible({
  path: ".kitana/bible",
  mission: "Найти лидов для курса по автоматизации",
});

const ai = new Kitana({ providers: ["claude", "ollama"] });

async function runAnalyst(comments: typeof FAKE_COMMENTS) {
  const done = await bible.getProgress("analyst");
  if (done) { console.log("📖 аналитик уже выполнен"); return done.result; }

  const result = await ai.ask(`Выбери топ-2 лида: ${JSON.stringify(comments)}`);
  await bible.update("analyst", result.text);
  return result.text;
}

async function runCopywriter(leads: string) {
  const done = await bible.getProgress("copywriter");
  if (done) { console.log("📖 копирайтер уже выполнен"); return done.result; }

  // Раскомментируй для теста возобновления:
  // throw new Error("Симуляция падения!");

  const result = await ai.ask(`Напиши офферы: ${leads}`);
  await bible.update("copywriter", result.text);
  return result.text;
}

async function main() {
  await bible.load();
  const leads  = await runAnalyst(FAKE_COMMENTS);
  const offers = await runCopywriter(leads);
  console.log("\n✅ Готово!\n", offers);
}
main().catch(console.error);
```
