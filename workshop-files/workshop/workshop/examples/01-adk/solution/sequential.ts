/**
 * Solution: 1.3 — SequentialAgent
 * Skeleton for participants: examples/01-adk/starter/sequential.ts
 */
import { config } from "dotenv";
import { LlmAgent, SequentialAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

const topic = process.argv[2] ?? "quantum computers";

const modelEnv = process.env.MODEL;
function pickModel() {
  return modelEnv === "kitana" ? new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }) : modelEnv || "gemini-flash-latest";
}

const researcher = new LlmAgent({
  name: "researcher",
  model: pickModel(),
  instruction:
    'Take the topic and return ONLY JSON in the shape { "facts": ["...", "...", "..."] } — three short facts. No markdown, no explanation.',
});

const editor = new LlmAgent({
  name: "editor",
  model: pickModel(),
  instruction: "Take the JSON with facts (in the previous message) and rewrite them into one connected paragraph.",
});

export const agent = new SequentialAgent({
  name: "research-pipeline",
  subAgents: [researcher, editor],
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  console.log(`\n📚 Topic: ${topic}\n`);

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: topic }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const author = event.author ?? "unknown";
      process.stdout.write(`[${author}] ${event.content.parts[0].text}\n`);
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
