/**
 * Lead Finder Pipeline v2
 * Workshop: multi-agent lead finder — 5 social platforms + Claude Agent SDK
 *
 * Run:
 *   cp .env.example .env   → pick a SOURCE and fill in the needed keys
 *   npm start
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { runParser } from "./parsers/index.js";
import type { ParseResult } from "./parsers/index.js";
import { writeFileSync } from "node:fs";

// ─── ICP — adapt to your own product ───────────────────────────────────────

const ICP = `
  We sell a course on automating business operations with AI.
  Ideal customer:
  - Small/medium business owner or freelancer
  - Complains about routine work, lack of time, wants to scale
  - Interested in technology, but not a developer
  - Asks questions, actively engages in discussion
`;

const OFFER_TONE = process.env.OFFER_TONE ?? "friendly";

// ─── Utility: run a Claude agent ────────────────────────────────────────────

async function runAgent(name: string, prompt: string, systemPrompt: string): Promise<string> {
  console.log(`\n${"─".repeat(54)}`);
  console.log(`🤖  ${name}`);
  console.log(`${"─".repeat(54)}`);

  let result = "";

  for await (const msg of query({
    prompt,
    options: {
      systemPrompt,
      maxTurns: 3,
      permissionMode: "bypassPermissions",
    },
  })) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
          result += block.text;
        }
      }
    }
    if (msg.type === "result") console.log(`\n\n✅ ${name} finished`);
  }

  return result;
}

// ─── Step 2: Lead analyst agent ─────────────────────────────────────────────

async function stepAnalyze(parsed: ParseResult): Promise<string> {
  const platformLabel: Record<string, string> = {
    telegram: "Telegram channel",
    youtube:  "YouTube video",
    reddit:   "Reddit subreddit",
    twitter:  "X/Twitter search",
    instagram: "Instagram post",
  };

  const digest = parsed.comments
    .map((c) => `[${c.author}${c.username ? " " + c.username : ""}]: ${c.text.slice(0, 200)}`)
    .join("\n");

  return runAgent(
    "Lead analyst",
    `
      Source: ${platformLabel[parsed.platform] ?? parsed.platform} — ${parsed.title}
      Comments analyzed: ${parsed.totalComments}

      ICP (ideal customer):
      ${ICP}

      Comments:
      ${digest}

      Pick the top 5 potential leads.
    `,
    `
      You are a lead-analyst agent. You evaluate social media comments
      and find people who best match the ICP.

      Scoring criteria (1–10):
      - Relevance: pain points and interests match the ICP
      - Intent: questions about pricing, timelines, "how do I get started"
      - Activity: depth and volume of comments

      Respond with ONLY valid JSON, no extra text:
      {
        "top_leads": [
          {
            "author": "name",
            "username": "@handle or null",
            "score": 8,
            "reason": "why they fit (1–2 sentences)",
            "pain_points": ["pain 1", "pain 2"],
            "key_quote": "verbatim quote from the comment",
            "contact_url": "profile link or null"
          }
        ]
      }
    `
  );
}

// ─── Step 3: Copywriter agent ───────────────────────────────────────────────

async function stepCopywrite(leadsJson: string): Promise<string> {
  return runAgent(
    "Copywriter",
    `Write a personalized offer for each lead.\nLead data:\n${leadsJson}`,
    `
      You are a copywriter agent. You write personalized offers for potential customers.

      Rules:
      - Quote key_quote — show you actually read their words
      - Pain first, then the solution — never "I'd like to offer"
      - Tone: ${OFFER_TONE}
      - Length: 3–4 sentences
      - Adapt style to the platform: casual on Telegram and Instagram,
        more professional on LinkedIn and Reddit

      Respond with ONLY valid JSON:
      {
        "offers": [
          {
            "author": "name",
            "username": "@handle or null",
            "contact_url": "link",
            "platform": "telegram/youtube/...",
            "hook": "opening hook line",
            "message": "full offer text",
            "cta": "call to action"
          }
        ]
      }
    `
  );
}

// ─── Final output ────────────────────────────────────────────────────────────

interface Offer {
  author: string;
  username: string | null;
  contact_url: string | null;
  platform: string;
  hook: string;
  message: string;
  cta: string;
}

function printReport(data: { offers: Offer[] }): void {
  console.log("\n" + "═".repeat(60));
  console.log("  📋 PERSONALIZED OFFERS");
  console.log("═".repeat(60));

  data.offers.forEach((o, i) => {
    const handle = o.username ?? o.author;
    console.log(`\n${i + 1}. ${handle}  [${o.platform}]`);
    if (o.contact_url) console.log(`   🔗 ${o.contact_url}`);
    console.log(`   💬 ${o.hook}`);
    console.log(`   ${o.message}`);
    console.log(`   👉 ${o.cta}`);
  });

  console.log("\n" + "═".repeat(60));
}

function extractJSON(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON found in the agent's response");
  return JSON.parse(m[0]);
}

// ─── Main pipeline ───────────────────────────────────────────────────────────

async function main() {
  const source = process.env.SOURCE ?? "telegram";
  console.log(`\n🚀 Lead Finder  |  source: ${source.toUpperCase()}  |  tone: ${OFFER_TONE}`);

  // 1. Parse
  const parsed = await runParser();

  // 2. Analyze
  const leadsRaw   = await stepAnalyze(parsed);
  const leadsData  = extractJSON(leadsRaw);

  // 3. Offers
  const offersRaw  = await stepCopywrite(leadsRaw);
  const offersData = extractJSON(offersRaw) as { offers: Offer[] };

  // Print
  printReport(offersData);

  // Save
  const file = `leads_${source}_${Date.now()}.json`;
  writeFileSync(file, JSON.stringify({ source, parsed, leads: leadsData, offers: offersData }, null, 2));
  console.log(`\n💾 Saved: ${file}`);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
