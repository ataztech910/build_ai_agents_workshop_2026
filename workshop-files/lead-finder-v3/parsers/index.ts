/**
 * parsers/index.ts
 * Router — picks a parser based on SOURCE= in .env
 *
 * SOURCE= telegram | youtube | reddit | instagram
 */

import "dotenv/config";
import type { ParseResult } from "./types.js";

export type { ParseResult, Comment } from "./types.js";

export async function runParser(): Promise<ParseResult> {
  const source = (process.env.SOURCE ?? "telegram").toLowerCase();
  console.log(`\n🔌 Source: ${source.toUpperCase()}`);

  switch (source) {

    // ── Telegram ──────────────────────────────────────────────────────────
    case "telegram": {
      const { parseChannel } = await import("../telegram-parser.js");
      const result = await parseChannel(
        requireEnv("TG_CHANNEL"),
        Number(requireEnv("TG_API_ID")),
        requireEnv("TG_API_HASH"),
        {
          postsLimit:      Number(process.env.POSTS_LIMIT ?? "10"),
          commentsPerPost: Number(process.env.COMMENTS_PER_POST ?? "20"),
        }
      );
      // telegram-parser.ts has its own ParseResult/Comment shape
      // (channelTitle/totalPosts, comments missing sourceUrl/platform) —
      // map it into the shared shape every other parser and pipeline.ts
      // actually use.
      return {
        platform: "telegram",
        source: result.source,
        title: result.channelTitle,
        totalComments: result.comments.length,
        comments: result.comments.map((c) => ({
          ...c,
          sourceUrl: result.source,
          platform: "telegram" as const,
        })),
        parsedAt: result.parsedAt,
      };
    }

    // ── YouTube ───────────────────────────────────────────────────────────
    case "youtube": {
      const { parseYouTube } = await import("./youtube.js");
      return parseYouTube(
        requireEnv("YT_VIDEO_ID"),
        requireEnv("YT_API_KEY"),
        Number(process.env.COMMENTS_LIMIT ?? "100")
      );
    }

    // ── Reddit ────────────────────────────────────────────────────────────
    case "reddit": {
      const { parseReddit } = await import("./reddit.js");
      return parseReddit(
        requireEnv("REDDIT_SUBREDDIT"),
        requireEnv("REDDIT_CLIENT_ID"),
        requireEnv("REDDIT_CLIENT_SECRET"),
        requireEnv("REDDIT_USERNAME"),
        requireEnv("REDDIT_PASSWORD"),
        {
          postsLimit:      Number(process.env.POSTS_LIMIT ?? "10"),
          commentsPerPost: Number(process.env.COMMENTS_PER_POST ?? "20"),
        }
      );
    }

    // ── Instagram (Playwright) ────────────────────────────────────────────
    case "instagram": {
      const { parseInstagram } = await import("./instagram.js");
      return parseInstagram(
        requireEnv("IG_POST_URL"),
        requireEnv("IG_USERNAME"),
        requireEnv("IG_PASSWORD"),
        {
          limit:    Number(process.env.COMMENTS_LIMIT ?? "50"),
          headless: process.env.IG_HEADLESS !== "false",
        }
      );
    }

    default:
      throw new Error(
        `Unknown SOURCE="${source}". ` +
        `Allowed: telegram, youtube, reddit, instagram`
      );
  }
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// Test the parser directly: npx tsx parsers/index.ts
if (process.argv[1]?.endsWith("index.ts")) {
  runParser()
    .then((r) => {
      console.log(`\n📊 ${r.totalComments} comments from "${r.title}"`);
      r.comments.forEach((c) => {
        console.log(`  [${c.platform}] ${c.username ?? c.author}: ${c.text.slice(0, 80)}`);
      });
    })
    .catch((e) => { console.error("❌", e.message); process.exit(1); });
}
