/**
 * Скелет: 1.1 — Первый LlmAgent
 * Задание: examples/../tasks/01-adk.md
 */
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { Content } from "@google/genai";

// TODO: создай агента
const agent = new LlmAgent({
  name: "hello",
  model: "gemini-2.0-flash",
  instruction: "", // TODO: напиши инструкцию на русском
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });

  const session = await sessionService.createSession({
    appName: "workshop",
    userId: "user",
  });

  const message: Content = {
    role: "user",
    parts: [{ text: "" }], // TODO: задай вопрос
  };

  // TODO: запусти агента и выведи ответ
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: message,
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text);
    }
  }
}

main().catch(console.error);
