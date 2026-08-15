/**
 * Скелет: 1.3 — SequentialAgent
 * Задание: examples/../tasks/01-adk.md
 */
import { LlmAgent, SequentialAgent, Runner, InMemorySessionService } from "@google/adk";
import { basename } from "node:path";

const topic = process.argv[2] ?? "квантовые компьютеры";

// TODO: агент-исследователь
// instruction: получает тему, возвращает ТОЛЬКО JSON { facts: string[] }
const researcher = new LlmAgent({
  name: "researcher",
  model: "gemini-flash-latest",
  instruction: "", // TODO
});

// TODO: агент-редактор
// instruction: получает JSON с фактами, переписывает в один абзац
const editor = new LlmAgent({
  name: "editor",
  model: "gemini-flash-latest",
  instruction: "", // TODO
});

// export — обязательно для `npx adk run <файл>` и `npx adk web`, см. hello-agent.ts
// TODO: оберни в SequentialAgent
export const agent = new SequentialAgent({
  name: "research-pipeline",
  subAgents: [], // TODO: [researcher, editor]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  console.log(`\n📚 Тема: ${topic}\n`);

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: topic }] },
  })) {
    // TODO: выводи ответы агентов с пометкой кто говорит
    if (event.content?.parts?.[0]?.text) {
      const author = event.author ?? "unknown";
      process.stdout.write(`[${author}] ${event.content.parts[0].text}\n`);
    }
  }
}

// main() — не при загрузке через adk run/web, см. hello-agent.ts
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
