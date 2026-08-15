# CONTEXT: Полный код всех файлов

---

## parsers/types.ts

```typescript
export interface Comment {
  author: string;
  username: string | null;
  userId: string;
  text: string;
  date: string;         // ISO 8601
  sourceUrl: string | null;
  profileUrl: string | null;
  platform: "telegram" | "youtube" | "reddit" | "instagram";
}

export interface ParseResult {
  platform: Comment["platform"];
  source: string;
  title: string;
  totalComments: number;
  comments: Comment[];
  parsedAt: string;
}
```

---

## parsers/index.ts — роутер

```typescript
import "dotenv/config";
import type { ParseResult } from "./types.js";

export type { ParseResult, Comment } from "./types.js";

export async function runParser(): Promise<ParseResult> {
  const source = (process.env.SOURCE ?? "telegram").toLowerCase();
  console.log(`\n🔌 Источник: ${source.toUpperCase()}`);

  switch (source) {
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
      return { ...result, platform: "telegram" };
    }
    case "youtube": {
      const { parseYouTube } = await import("./youtube.js");
      return parseYouTube(
        requireEnv("YT_VIDEO_ID"),
        requireEnv("YT_API_KEY"),
        Number(process.env.COMMENTS_LIMIT ?? "100")
      );
    }
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
        `Неизвестный SOURCE="${source}". Допустимые: telegram, youtube, reddit, instagram`
      );
  }
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Не задана переменная: ${key}`);
  return val;
}
```

---

## telegram-parser.ts

```typescript
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SESSION_FILE = ".telegram_session";

async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => { rl.question(prompt, (a) => { rl.close(); resolve(a.trim()); }); });
}

async function createClient(apiId: number, apiHash: string): Promise<TelegramClient> {
  let sessionString = "";
  if (existsSync(SESSION_FILE)) {
    sessionString = readFileSync(SESSION_FILE, "utf-8").trim();
    console.log("📂 Найдена сохранённая сессия");
  }
  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => getInput("📱 Номер телефона (+7...): "),
    password:    async () => getInput("🔑 Пароль 2FA: "),
    phoneCode:   async () => getInput("💬 Код из Telegram: "),
    onError:     (err) => console.error("Ошибка:", err),
  });
  const saved = client.session.save() as unknown as string;
  writeFileSync(SESSION_FILE, saved);
  return client;
}

export async function parseChannel(
  channelUsername: string,
  apiId: number,
  apiHash: string,
  options: { postsLimit?: number; commentsPerPost?: number } = {}
) {
  const { postsLimit = 10, commentsPerPost = 20 } = options;
  const username = channelUsername.replace("https://t.me/", "").replace("@", "").split("/")[0];
  const client = await createClient(apiId, apiHash);

  const entity = await client.getEntity(username);
  const channelTitle = "title" in entity ? (entity.title as string) : username;
  const allComments = [];

  for await (const post of client.iterMessages(entity, { limit: postsLimit })) {
    if (!post.message) continue;
    try {
      for await (const comment of client.iterMessages(entity, { replyTo: post.id, limit: commentsPerPost })) {
        if (!comment.message || !comment.senderId) continue;
        const sender = comment.sender;
        let authorName = "Unknown", username_ = null;
        if (sender && "firstName" in sender) {
          authorName = [sender.firstName, sender.lastName].filter(Boolean).join(" ");
          username_ = sender.username ?? null;
        }
        allComments.push({
          author: authorName, username: username_,
          userId: comment.senderId.toString(),
          text: comment.message,
          date: new Date(comment.date * 1000).toISOString(),
          postId: post.id,
          profileUrl: username_ ? `https://t.me/${username_}` : null,
        });
      }
    } catch { /* комментарии отключены */ }
  }

  await client.disconnect();
  return {
    platform: "telegram" as const,
    source: `https://t.me/${username}`,
    channelTitle,
    totalPosts: postsLimit,
    comments: allComments,
    parsedAt: new Date().toISOString(),
  };
}
```

---

## parsers/instagram.ts — ключевые детали

Стратегия: Playwright + `playwright-extra` + `puppeteer-extra-plugin-stealth`.  
Instagram требует логин в 2026. Сессия сохраняется в `instagram_session.json`.

Ключевой момент — перехват GraphQL:
```typescript
page.on("response", async (response) => {
  const url = response.url();
  if (!url.includes("graphql/query") && !url.includes("api/v1/media")) return;
  
  const json = await response.json();
  const commentsPage =
    json?.data?.shortcode_media?.edge_media_to_parent_comment ??
    json?.data?.shortcode_media?.edge_media_to_comment;

  if (!commentsPage?.edges) return;
  for (const { node } of commentsPage.edges) {
    comments.set(node.id, {
      platform: "instagram",
      author: node.owner.username,
      username: `@${node.owner.username}`,
      userId: node.owner.id,
      text: node.text,
      date: new Date(node.created_at * 1000).toISOString(),
      sourceUrl: postUrl,
      profileUrl: `https://www.instagram.com/${node.owner.username}/`,
    });
  }
});
```

Stealth подключается так:
```typescript
try {
  const { chromium: chromiumExtra } = await import("playwright-extra");
  const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
  chromiumExtra.use(StealthPlugin.default());
  browser = await chromiumExtra.launch({ headless });
} catch {
  browser = await chromium.launch({ headless }); // fallback
}
```

---

## pipeline.ts — главный оркестратор

```typescript
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { runParser } from "./parsers/index.js";
import { writeFileSync } from "node:fs";

const ICP = `
  Курс по автоматизации бизнеса с ИИ.
  Идеальный клиент: владелец бизнеса или менеджер,
  жалуется на рутину, не разработчик, хочет готовое решение.
`;

const OFFER_TONE = process.env.OFFER_TONE ?? "дружелюбный";

async function runAgent(name: string, prompt: string, systemPrompt: string): Promise<string> {
  console.log(`\n${"─".repeat(54)}\n🤖  ${name}\n${"─".repeat(54)}`);
  let result = "";
  for await (const msg of query({
    prompt,
    options: { systemPrompt, maxTurns: 3, permissionMode: "bypassPermissions" },
  })) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") { process.stdout.write(block.text); result += block.text; }
      }
    }
  }
  return result;
}

// Шаги: stepAnalyze() → stepCopywrite() → printReport()
// Каждый агент возвращает JSON, следующий получает его как часть промпта
```

---

## .env.example — финальный

```env
# SOURCE: telegram | youtube | reddit | instagram
SOURCE=telegram
OFFER_TONE=дружелюбный
POSTS_LIMIT=10
COMMENTS_PER_POST=20
COMMENTS_LIMIT=100

# Вариант A: Kitana Server (рекомендуется)
# npx @kitana-sdk/server
# OPENAI_BASE_URL=http://localhost:4141/v1
# OPENAI_API_KEY=kitana
# MODEL=auto

# Вариант B: Gemini Flash (бесплатно, 15 rpm)
# GOOGLE_API_KEY=AIza...
# MODEL=gemini-flash-latest

# Вариант C: Ollama (офлайн)
# OPENAI_BASE_URL=http://localhost:11434/v1
# OPENAI_API_KEY=ollama
# MODEL=llama3.2

# Вариант D: Claude API
# ANTHROPIC_API_KEY=sk-ant-...
# MODEL=claude-sonnet-4-5

# Telegram
TG_API_ID=12345678
TG_API_HASH=abcdef...
TG_CHANNEL=channel_name

# YouTube
YT_API_KEY=AIzaSy...
YT_VIDEO_ID=dQw4w9WgXcQ

# Reddit
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=логин
REDDIT_PASSWORD=пароль
REDDIT_SUBREDDIT=entrepreneur

# Instagram
IG_USERNAME=логин
IG_PASSWORD=пароль
IG_POST_URL=https://www.instagram.com/p/SHORT_CODE/
IG_HEADLESS=true
```

---

## package.json — воркшоп репо

```json
{
  "name": "ai-agents-workshop",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start":             "npx tsx pipeline.ts",
    "parse-only":        "npx tsx parsers/index.ts",
    "install-browsers":  "npx playwright install chromium",
    "check":             "npx tsx scripts/check-env.ts"
  },
  "dependencies": {
    "@google/adk":                    "latest",
    "@google/genai":                  "latest",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "@kitana-sdk/core":               "latest",
    "@kitana-sdk/server":             "latest",
    "telegram":                       "^2.25.15",
    "snoowrap":                       "^1.23.0",
    "playwright":                     "^1.45.0",
    "playwright-extra":               "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "zod":                            "^3.23.0",
    "dotenv":                         "^16.0.0"
  },
  "devDependencies": {
    "tsx":             "^4.0.0",
    "@types/node":     "^22.0.0",
    "@types/snoowrap": "^1.23.0",
    "typescript":      "^5.0.0"
  }
}
```
