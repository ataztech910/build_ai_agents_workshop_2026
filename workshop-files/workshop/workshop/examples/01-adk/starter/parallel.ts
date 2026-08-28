/**
 * Skeleton: 1.4 — ParallelAgent (bonus)
 * Task: examples/../tasks/01-adk.md
 */
import { config } from "dotenv";
import { LlmAgent, ParallelAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `dotenv/config`'s default .env lookup is relative to process.cwd() — fine
// for `npx tsx examples/01-adk/starter/parallel.ts` from the workshop root, but
// `adk web`/`adk run` set cwd to the agents_dir they were pointed at
// (examples/01-adk here), so the default lookup silently misses .env and
// MODEL=kitana never takes effect. Resolve relative to this file instead.
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

// Pick a model — uncomment ONE of the two return statements below. Each
// sub-agent calls pickModel() separately and gets its own instance —
// KitanaLlm/BaseLlm isn't shared between agents.
function pickModel() {
  return "gemini-3.6-flash"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
  // return new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama
}

// ParallelAgent sends the SAME message to every sub-agent — there's no way to
// give A and B different runtime input. So the topic each agent researches
// has to be baked into ITS OWN instruction, not passed in at call time.
//
// TODO: agent A — instruction should say something like "You are a research
// agent. Your topic is renewable energy. When asked to research, return 2-3
// short facts about it."
const researcherA = new LlmAgent({
  name: "researcherA",
  model: pickModel(),
  instruction: "", // TODO
});

// TODO: agent B — same shape as A, different fixed topic (e.g. space exploration)
const researcherB = new LlmAgent({
  name: "researcherB",
  model: pickModel(),
  instruction: "", // TODO
});

// export is required for `npx adk run <file>` and `npx adk web`, see hello-agent.ts
// TODO: wrap both agents in ParallelAgent — same {name, subAgents} shape as SequentialAgent
export const agent = new ParallelAgent({
  name: "parallel-research",
  subAgents: [], // TODO: [researcherA, researcherB]
});

const TRIGGER = "Research your assigned topic and report back.";

async function runOnce(target: LlmAgent | ParallelAgent) {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent: target, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: TRIGGER }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const author = event.author ?? "unknown";
      process.stdout.write(`[${author}] ${event.content.parts[0].text}\n`);
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
}

async function main() {
  console.log("\n--- sequential baseline: A, then B ---");
  console.time("sequential");
  // TODO: await runOnce(researcherA); await runOnce(researcherB);
  console.timeEnd("sequential");

  console.log("\n--- parallel: A and B at the same time ---");
  console.time("parallel");
  // TODO: await runOnce(agent);
  console.timeEnd("parallel");
}

// main() does not run when loaded via adk run/web, see hello-agent.ts
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
