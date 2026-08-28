/**
 * Closing demo: source planner
 * Task: examples/../tasks/03-closing.md
 *
 * Presenter-only agent, not something participants build. Picks which of
 * the training portal's channels to pull leads from, given a business
 * description — the "model decides what's next" step in front of the
 * already-built Lead Finder pipeline (examples/02-api/solution/lead-finder.ts).
 */
import { config } from "dotenv";
import { LlmAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env") });

function pickModel() {
  // return "gemini-3.6-flash"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
  return new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama
}

export const agent = new LlmAgent({
  name: "planner",
  model: pickModel(),
  instruction: `Given a short business description, pick ONE channel to pull leads from. Return ONLY JSON, no markdown:
{ "channel": "startups" | "smallbiz" | "productivity", "reason": "one line" }

Channels:
- startups: Startup Founders Chat — founders, scaling problems, ops bottlenecks
- smallbiz: Small Business Owners — day-to-day operations, online stores, order handling
- productivity: Productivity & Ops Talk — ops teams, workflow optimization, hiring paperwork`,
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "planner", sessionService });
  const session = await sessionService.createSession({ appName: "planner", userId: "user" });

  const businessDescription =
    process.argv[2] ??
    "A course on automating business operations with AI, for small business owners drowning in manual admin work.";

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: businessDescription }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      console.log(`[planner] ${event.content.parts[0].text}`);
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
