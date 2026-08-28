/**
 * telegram-parser.ts
 * Parses a Telegram channel via gramjs (MTProto — not the Bot API)
 *
 * What it does:
 *   - Reads posts from a public channel
 *   - Reads comments on posts (discussion group)
 *   - Saves the session so you don't have to log in every time
 *
 * Get API_ID and API_HASH:
 *   1. Go to https://my.telegram.org
 *   2. "API development tools" section
 *   3. Create an app — you'll get api_id and api_hash
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Comment {
  author: string;
  username: string | null;
  userId: string;
  text: string;
  date: string;
  postId: number;
  profileUrl: string | null;
}

export interface ParseResult {
  source: string;
  channelTitle: string;
  totalPosts: number;
  comments: Comment[];
  parsedAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SESSION_FILE = ".telegram_session";

// ─── Authorization ────────────────────────────────────────────────────────────

async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createClient(apiId: number, apiHash: string): Promise<TelegramClient> {
  // Load a saved session if one exists
  let sessionString = "";
  if (existsSync(SESSION_FILE)) {
    sessionString = readFileSync(SESSION_FILE, "utf-8").trim();
    console.log("📂 Found a saved session");
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => getInput("📱 Phone number (international format, e.g. +43...): "),
    password: async () => getInput("🔑 2FA password (if enabled): "),
    phoneCode: async () => getInput("💬 Code from Telegram: "),
    onError: (err) => console.error("Auth error:", err),
  });

  // Save the session — no need to log in again after this
  const savedSession = client.session.save() as unknown as string;
  writeFileSync(SESSION_FILE, savedSession);
  console.log("✅ Session saved to", SESSION_FILE);

  return client;
}

// ─── Channel parsing ──────────────────────────────────────────────────────────

export async function parseChannel(
  channelUsername: string,
  apiId: number,
  apiHash: string,
  options: {
    postsLimit?: number;      // how many recent posts to look at
    commentsPerPost?: number; // how many comments per post
  } = {}
): Promise<ParseResult> {
  const { postsLimit = 10, commentsPerPost = 20 } = options;

  // Strip @ and https://t.me/ if a full link was passed in
  const username = channelUsername
    .replace("https://t.me/", "")
    .replace("@", "")
    .split("/")[0];

  const client = await createClient(apiId, apiHash);

  console.log(`\n🔍 Connecting to channel @${username}...`);

  try {
    // Fetch the channel's info
    const entity = await client.getEntity(username);
    const channelTitle =
      "title" in entity ? (entity.title as string) : username;

    console.log(`📢 Channel: ${channelTitle}`);
    console.log(`📋 Fetching the latest ${postsLimit} posts...\n`);

    const allComments: Comment[] = [];

    // Iterate over the channel's posts
    let postCount = 0;
    for await (const post of client.iterMessages(entity, {
      limit: postsLimit,
    })) {
      if (!post.message) continue; // skip posts with no text
      postCount++;

      const preview = post.message.slice(0, 60).replace(/\n/g, " ");
      process.stdout.write(`  📄 Post #${post.id}: "${preview}..." → `);

      try {
        // Fetch the post's comments
        // replyTo: post.id — comments specifically on this post
        let commentCount = 0;
        for await (const comment of client.iterMessages(entity, {
          replyTo: post.id,
          limit: commentsPerPost,
        })) {
          if (!comment.message || !comment.senderId) continue;

          // Get the sender
          const sender = comment.sender;
          let authorName = "Unknown";
          let username_: string | null = null;

          if (sender && "firstName" in sender) {
            authorName = [sender.firstName, sender.lastName]
              .filter(Boolean)
              .join(" ");
            username_ = sender.username ?? null;
          } else if (sender && "title" in sender) {
            authorName = sender.title as string;
          }

          allComments.push({
            author: authorName,
            username: username_,
            userId: comment.senderId.toString(),
            text: comment.message,
            date: new Date(comment.date * 1000).toISOString(),
            postId: post.id,
            profileUrl: username_
              ? `https://t.me/${username_}`
              : null,
          });

          commentCount++;
        }

        console.log(`${commentCount} comments`);
      } catch {
        // Comments may be disabled on this post
        console.log("comments unavailable");
      }
    }

    await client.disconnect();

    const result: ParseResult = {
      source: `https://t.me/${username}`,
      channelTitle,
      totalPosts: postCount,
      comments: allComments,
      parsedAt: new Date().toISOString(),
    };

    console.log(`\n✅ Done! Collected ${allComments.length} comments`);
    return result;

  } catch (err) {
    await client.disconnect();
    throw err;
  }
}

// ─── Run directly (test) ───────────────────────────────────────────────────

// Run: npx tsx telegram-parser.ts
if (process.argv[1]?.endsWith("telegram-parser.ts")) {
  const API_ID = Number(process.env.TG_API_ID);
  const API_HASH = process.env.TG_API_HASH ?? "";
  const CHANNEL = process.env.TG_CHANNEL ?? "durov"; // default for testing

  if (!API_ID || !API_HASH) {
    console.error("❌ Required env vars: TG_API_ID and TG_API_HASH");
    console.error("   Get them at https://my.telegram.org");
    process.exit(1);
  }

  parseChannel(CHANNEL, API_ID, API_HASH, {
    postsLimit: 5,
    commentsPerPost: 10,
  })
    .then((result) => {
      console.log("\n📊 First 3 comments as an example:");
      result.comments.slice(0, 3).forEach((c) => {
        console.log(`  @${c.username ?? c.author}: ${c.text.slice(0, 100)}`);
      });
    })
    .catch(console.error);
}
