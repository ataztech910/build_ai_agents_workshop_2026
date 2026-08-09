/**
 * Скелет: 2.3 — Model Routing + failover
 * Задание: examples/../tasks/02-api.md
 */
import { LlmAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

// ADK поддерживает model routing через конфиг модели
// При ошибке первой модели — автоматически переключается на следующую

// TODO: настрой агента с routing между Claude и Gemini
// Подсказка: используй строку модели или ModelRouter из @google/adk
const agent = new LlmAgent({
  name: "routing-agent",
  model: "", // TODO: primary модель
  instruction: "Ты полезный ассистент. Всегда указывай какую модель используешь.",
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // TODO: запусти и выведи какая модель ответила
  // Намеренно сломай первый ключ чтобы увидеть failover
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [{ text: "Привет! Какая модель со мной разговаривает?" }],
    },
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text);
    }
  }
}

main().catch(console.error);
