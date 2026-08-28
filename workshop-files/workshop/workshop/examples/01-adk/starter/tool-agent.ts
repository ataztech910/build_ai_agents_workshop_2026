/**
 * Skeleton: 1.2 — FunctionTool
 * Task: examples/../tasks/01-adk.md
 */
import { config } from "dotenv";
import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from "@google/adk";
import { z } from "zod";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `dotenv/config`'s default .env lookup is relative to process.cwd() — fine
// for `npx tsx examples/01-adk/starter/tool-agent.ts` from the workshop root, but
// `adk web`/`adk run` set cwd to the agents_dir they were pointed at
// (examples/01-adk here), so the default lookup silently misses .env and
// MODEL=kitana never takes effect. Resolve relative to this file instead.
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

// Pick a model — uncomment ONE of the two lines below.
const model = "gemini-3.6-flash"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
// const model = new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama

// TODO: create the weather tool
const weatherTool = new FunctionTool({
  name: "getWeather",
  description: "", // TODO: describe what the tool does
  parameters: z.object({
    city: z.string().describe("City name"),
  }),
  execute: async ({ city }) => {
    // TODO: return fake weather data
    return {};
  },
});

// export is required for `npx adk run <file>` and `npx adk web`, see hello-agent.ts
// TODO: create the agent with weatherTool
export const agent = new LlmAgent({
  name: "weather",
  model,
  instruction: "", // TODO: write the agent's instruction
  tools: [], // TODO: add weatherTool
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // Same loop shape as hello-agent.ts — reuse it here.
  // TODO: replace the empty string with a weather question
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: "" }] }, // TODO: ask about the weather
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text + "\n");
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
}

// main() does not run when loaded via adk run/web, see hello-agent.ts
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
