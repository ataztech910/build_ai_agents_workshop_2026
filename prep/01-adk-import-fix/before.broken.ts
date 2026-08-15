/**
 * Точная копия оригинального скелета из репо (сабпуть-импорты).
 * Цель: воспроизвести баг перед тем, как чинить.
 */
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { Content } from "@google/genai";

const agent = new LlmAgent({
  name: "hello",
  model: "gemini-flash-latest",
  instruction: "Отвечай кратко на русском.",
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
    parts: [{ text: "Привет, как дела?" }],
  };

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
