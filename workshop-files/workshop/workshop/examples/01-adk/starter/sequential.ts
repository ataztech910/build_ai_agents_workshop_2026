/**
 * Skeleton: 1.3 — SequentialAgent
 * Task: examples/../tasks/01-adk.md
 */
import { config } from "dotenv";
import { LlmAgent, SequentialAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `dotenv/config`'s default .env lookup is relative to process.cwd() — fine
// for `npx tsx examples/01-adk/starter/sequential.ts` from the workshop root, but
// `adk web`/`adk run` set cwd to the agents_dir they were pointed at
// (examples/01-adk here), so the default lookup silently misses .env and
// MODEL=kitana never takes effect. Resolve relative to this file instead.
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

const topic = process.argv[2] ?? "quantum computers";

// Pick a model — uncomment ONE of the two return statements below. Each
// sub-agent calls pickModel() separately and gets its own instance —
// KitanaLlm/BaseLlm isn't shared between agents.
function pickModel() {
  return "gemini-3.6-flash"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
  // return new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama
}

// TODO: researcher agent
// instruction: takes a topic, returns ONLY JSON { facts: string[] }
const researcher = new LlmAgent({
  name: "researcher",
  model: pickModel(),
  instruction: "", // TODO
});

// TODO: editor agent
// instruction: takes JSON with facts, rewrites them into one paragraph
const editor = new LlmAgent({
  name: "editor",
  model: pickModel(),
  instruction: "", // TODO
});

// export is required for `npx adk run <file>` and `npx adk web`, see hello-agent.ts
// TODO: wrap in SequentialAgent
export const agent = new SequentialAgent({
  name: "research-pipeline",
  subAgents: [], // TODO: [researcher, editor]
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
    // TODO: print each agent's response labeled with who's speaking
    if (event.content?.parts?.[0]?.text) {
      const author = event.author ?? "unknown";
      process.stdout.write(`[${author}] ${event.content.parts[0].text}\n`);
    }
  }
}

// main() does not run when loaded via adk run/web, see hello-agent.ts
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
