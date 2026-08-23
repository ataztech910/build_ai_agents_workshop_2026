/**
 * Solution: 2.4 — Lead Finder pipeline
 * Skeleton for participants: examples/02-api/starter/lead-finder.ts
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

function pickModel() {
  // return "gemini-flash-latest";
  return new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } });
}

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
// statements below. This is the actual point of wave 2: swap a fake array
// for a real external API without touching the pipeline itself.
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

const ICP = `
  A course on automating business operations with AI.
  Ideal customer: business owner or manager,
  complains about repetitive manual work,
  not a developer, wants a ready-made solution.
`;

// outputKey + includeContents: "none" instead of the SequentialAgent default
// (each agent sees the FULL running conversation, growing with every step).
// analyst's answer gets saved to session.state.topLeads; copywriter and
// validator each see ONLY their own instruction — with {topLeads}/{offers}
// filled in from state — not the raw text of every prior turn. Keeps the
// prompt small regardless of how many steps the pipeline has, and is what
// actually fixed the Kitana/claude timeout on the 3rd agent (see 02-api.md).
const analyst = new LlmAgent({
  name: "analyst",
  model: pickModel(),
  instruction: `Given an ICP and a list of social media comments, pick the top 3 leads that best match
the ICP. Return ONLY JSON: { "top_leads": [{ "author": "", "username": "", "score": 0-100, "reason": "", "key_quote": "" }] }.
No markdown, no explanation outside the JSON.`,
  outputKey: "topLeads",
});

const copywriter = new LlmAgent({
  name: "copywriter",
  model: pickModel(),
  includeContents: "none",
  instruction: `Top leads: {topLeads}

Write one short, personalized outreach message per lead, referencing their key_quote. Return ONLY JSON:
{ "offers": [{ "author": "", "message": "", "hook": "", "cta": "" }] }. No markdown, no explanation.`,
  outputKey: "offers",
});

const validator = new LlmAgent({
  name: "validator",
  model: pickModel(),
  includeContents: "none",
  instruction: `Draft offers: {offers}

Reject any message that reads generic/templated (could apply to anyone) and rewrite it to reference
the lead's specific situation. Return ONLY JSON, no prose before or after:
{ "offers": [{ "author": "", "message": "", "hook": "", "cta": "", "rewrite_note": "only if rewritten, one line explaining why" }] }`,
});

export const agent = new SequentialAgent({
  name: "lead-finder",
  subAgents: [analyst, copywriter, validator],
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

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: prompt }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const text = event.content.parts[0].text;
      console.log(`\n[${event.author}]`, text.slice(0, 200), "...");
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

  writeFileSync("leads_result.json", stripCodeFence(finalResult));
  console.log("\n💾 Saved: leads_result.json");
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
