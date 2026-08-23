/**
 * Skeleton: 2.4 — Lead Finder pipeline
 * Task: examples/../tasks/02-api.md
 */
import { config } from "dotenv";
import { LlmAgent, SequentialAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

// Models are told "return ONLY JSON" but routinely wrap it in a ```json
// fence anyway — instructions alone don't reliably stop this on any
// provider. Strip the fence before it hits leads_result.json.
function stripCodeFence(text: string): string {
  const match = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  return match ? match[1] : text;
}

// Pick a model — uncomment ONE of the two return statements below. Each
// sub-agent calls pickModel() separately and gets its own instance.
function pickModel() {
  return "gemini-flash-latest"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
  // return new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama
}

// ── Fake comments for the demo ──────────────────────────────────────────
const FAKE_COMMENTS = [
  { author: "Ivan Petrov", username: "@ivanp", text: "Been trying to automate reports for six months, still all manual — I'm exhausted" },
  { author: "Maria Sidorova", username: "@masha_biz", text: "Any recommendations for saving time on routine tasks?" },
  { author: "Alex K.", username: "@alex_dev", text: "Interesting topic, but as a developer I'd rather build it myself" },
  { author: "Olga Romanova", username: "@olga_hr", text: "We spend 3 hours a day on manual data entry at our company" },
  { author: "Dmitry Lis", username: "@dmlisenko", text: "How much does this cost? Is there a trial?" },
  { author: "Sveta Ivanova", username: "@sveta_mm", text: "Great post, love it!" },
  { author: "Nikolai Frolov", username: "@nik_ceo", text: "Want to scale the business but don't have enough people for operations" },
  { author: "Timur Asanov", username: "@timur_a", text: "Tried ChatGPT, not quite it, looking for something more specialized" },
  { author: "Katya Morozova", username: "@katya_smm", text: "Fire post 🔥" },
  { author: "Sergei Bykov", username: "@byk_sergei", text: "How exactly does this work with a CRM? Any integration with popular ones?" },
];

interface LeadComment {
  author: string;
  username: string;
  text: string;
}

const DATA_PORTAL_URL = "https://workshop-data-portal.vercel.app";

// Pick where the comments come from — uncomment ONE of the two return
// statements below. This is the actual point of this exercise: swap a fake
// array for a real external API without touching the pipeline itself.
// TODO: fetch from DATA_PORTAL_URL and map to LeadComment[] (see the
// commented-out version below for the shape)
async function pickComments(): Promise<LeadComment[]> {
  return FAKE_COMMENTS; // no network needed, always works

  // No login, no rate limits, no per-participant credentials — a small
  // Vercel API returning realistic comments in the same shape a real
  // parser would (see lead-finder-v3/telegram-parser.ts's ParseResult).
  // const res = await fetch(`${DATA_PORTAL_URL}/api/comments?channel=startups`);
  // const data = await res.json();
  // return data.comments.map((c: { author: string; username: string; text: string }) => ({
  //   author: c.author,
  //   username: c.username,
  //   text: c.text,
  // }));

  // For a real social platform instead of the portal, see
  // lead-finder-v3/telegram-parser.ts's parseChannel() — needs your own
  // TG_API_ID/TG_API_HASH from my.telegram.org and an interactive phone/2FA
  // login on first run (session is cached afterward).
}

// ── ICP — change to fit your own product ────────────────────────────────
const ICP = `
  A course on automating business operations with AI.
  Ideal customer: business owner or manager,
  complains about repetitive manual work,
  not a developer, wants a ready-made solution.
`;

// outputKey saves an agent's answer into session.state[key] instead of only
// the raw conversation history. includeContents: "none" on copywriter/
// validator means they see ONLY their own instruction (with {topLeads}/
// {offers} filled in from state) — not the full, ever-growing transcript of
// every earlier step. Keeps each prompt small no matter how long the
// pipeline gets, and avoids a real problem: with the default (every agent
// sees everything), the 3rd agent's prompt got big enough to blow past
// Kitana/claude's response timeout.

// TODO: analyst agent
// instruction: takes ICP + comments, returns ONLY JSON:
// { top_leads: [{ author, username, score, reason, key_quote }] }
const analyst = new LlmAgent({
  name: "analyst",
  model: pickModel(),
  instruction: "", // TODO
  outputKey: "topLeads",
});

// TODO: copywriter agent
// instruction: reference {topLeads} (filled in from analyst's outputKey),
// write a personalized outreach message for each:
// { offers: [{ author, message, hook, cta }] }
const copywriter = new LlmAgent({
  name: "copywriter",
  model: pickModel(),
  includeContents: "none",
  instruction: "", // TODO
  outputKey: "offers",
});

// TODO: validator agent
// instruction: reference {offers}, reject generic/templated ones and rewrite them.
// Ask for ONLY JSON back (same { offers: [...] } shape, plus an optional
// rewrite_note per rewritten offer) — without this, models tend to wrap the
// JSON in prose explaining their reasoning, which breaks leads_result.json.
const validator = new LlmAgent({
  name: "validator",
  model: pickModel(),
  includeContents: "none",
  instruction: "", // TODO
});

// TODO: wrap all three in SequentialAgent
export const agent = new SequentialAgent({
  name: "lead-finder",
  subAgents: [], // TODO: [analyst, copywriter, validator]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "lead-finder", sessionService });
  const session = await sessionService.createSession({ appName: "lead-finder", userId: "user" });

  const comments = await pickComments();
  const prompt = `
    ICP: ${ICP}
    Comments: ${JSON.stringify(comments, null, 2)}
  `;

  let finalResult = "";
  let lastAuthor = "";
  let hadError = false;

  // TODO: run the pipeline, print each agent's output as it completes
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: prompt }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const text = event.content.parts[0].text;
      console.log(`\n[${event.author}]`, text.slice(0, 100), "...");
      finalResult = text;
      lastAuthor = event.author ?? "";
    } else if (event.errorMessage) {
      hadError = true;
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }

  // Only the validator's output counts as final — if the pipeline errored
  // out before reaching it, `finalResult` holds an earlier agent's draft
  // (e.g. copywriter's un-reviewed offers). Saving that under the same
  // filename as a real result would look identical to a successful run.
  if (hadError || lastAuthor !== "validator") {
    console.error(`\n⚠️  Pipeline did not complete — last agent to respond was "${lastAuthor || "none"}", not validator. Not saving leads_result.json.`);
    return;
  }

  // TODO: save the final result to leads_result.json
  writeFileSync("leads_result.json", stripCodeFence(finalResult));
  console.log("\n💾 Saved: leads_result.json");
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
