/**
 * Скелет: 1.3 — SequentialAgent
 * Задание: examples/../tasks/01-adk.md
 */
import { LlmAgent, SequentialAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

const topic = process.argv[2] ?? "квантовые компьютеры";

// TODO: агент-исследователь
// instruction: получает тему, возвращает ТОЛЬКО JSON { facts: string[] }
const researcher = new LlmAgent({
  name: "researcher",
  model: "gemini-2.0-flash",
  instruction: "", // TODO
});

// TODO: агент-редактор
// instruction: получает JSON с фактами, переписывает в один абзац
const editor = new LlmAgent({
  name: "editor",
  model: "gemini-2.0-flash",
  instruction: "", // TODO
});

// TODO: оберни в SequentialAgent
const pipeline = new SequentialAgent({
  name: "research-pipeline",
  subAgents: [], // TODO: [researcher, editor]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent: pipeline, appName: "workshop", sessionService });
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

main().catch(console.error);
