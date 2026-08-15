import { LlmAgent, Runner, InMemorySessionService } from "@google/adk";
import { Content } from "@google/genai";

const agent = new LlmAgent({
  name: "hello",
  model: process.env.TEST_MODEL || "gemini-flash-latest",
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
    console.log("--- EVENT ---");
    console.log(JSON.stringify(event, null, 2));
  }
  console.log("--- DONE ---");
}

main().catch(e => console.error("ERROR:", e));
