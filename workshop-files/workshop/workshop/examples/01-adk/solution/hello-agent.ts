/**
 * Solution: 1.1 — First LlmAgent
 * Skeleton for participants: examples/01-adk/starter/hello-agent.ts
 */
import { config } from "dotenv";
import { LlmAgent, Runner, InMemorySessionService, StreamingMode } from "@google/adk";
import { Content } from "@google/genai";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

const modelEnv = process.env.MODEL;
const model =
  modelEnv === "kitana" ? new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }) : modelEnv || "gemini-3.6-flash";

export const agent = new LlmAgent({
  name: "hello",
  model,
  instruction: "You are a friendly assistant. Answer briefly and to the point.",
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
    parts: [{ text: "Tell a very short story about a cat" }],
  };

  let sawPartial = false;
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: message,
    runConfig: { streamingMode: StreamingMode.SSE },
  })) {
    if (event.content?.parts?.[0]?.text) {
      if (event.partial) {
        sawPartial = true;
        process.stdout.write(event.content.parts[0].text);
      } else if (!sawPartial) {
        process.stdout.write(event.content.parts[0].text);
      }
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
  process.stdout.write("\n");
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
