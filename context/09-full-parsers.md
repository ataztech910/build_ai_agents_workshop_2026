# CONTEXT: Полный код парсеров YouTube и Reddit

---

## parsers/youtube.ts

```typescript
/**
 * Парсер комментариев YouTube через YouTube Data API v3
 *
 * Как получить API ключ (бесплатно):
 *   1. https://console.cloud.google.com → создай проект
 *   2. APIs & Services → Enable APIs → YouTube Data API v3
 *   3. Credentials → Create Credentials → API Key
 *
 * Лимит: 10,000 units/день бесплатно (~100 запросов комментариев)
 */

import type { Comment, ParseResult } from "./types.js";

const BASE = "https://www.googleapis.com/youtube/v3";

interface YTCommentSnippet {
  topLevelComment: {
    snippet: {
      authorDisplayName: string;
      authorChannelId?: { value: string };
      authorChannelUrl?: string;
      textOriginal: string;
      publishedAt: string;
    };
  };
}

interface YTResponse {
  items: Array<{ snippet: YTCommentSnippet; id: string }>;
  nextPageToken?: string;
}

interface YTVideoResponse {
  items: Array<{ snippet: { title: string; channelTitle: string } }>;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube API error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function parseYouTube(
  videoId: string,
  apiKey: string,
  limit = 100
): Promise<ParseResult> {
  console.log(`\n📺 YouTube парсер → видео: ${videoId}`);

  const videoInfo = await fetchJSON<YTVideoResponse>(
    `${BASE}/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  const videoTitle   = videoInfo.items[0]?.snippet.title ?? videoId;
  const channelTitle = videoInfo.items[0]?.snippet.channelTitle ?? "";
  console.log(`   🎬 "${videoTitle}" (${channelTitle})`);

  const comments: Comment[] = [];
  let pageToken: string | undefined;

  while (comments.length < limit) {
    const maxResults = Math.min(100, limit - comments.length);
    let url =
      `${BASE}/commentThreads?part=snippet&videoId=${videoId}` +
      `&maxResults=${maxResults}&order=relevance&key=${apiKey}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const data = await fetchJSON<YTResponse>(url);

    for (const item of data.items) {
      const s = item.snippet.topLevelComment.snippet;
      const channelId = s.authorChannelId?.value;

      comments.push({
        platform:   "youtube",
        author:     s.authorDisplayName,
        username:   null,
        userId:     channelId ?? item.id,
        text:       s.textOriginal,
        date:       s.publishedAt,
        sourceUrl:  `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`,
        profileUrl: s.authorChannelUrl ?? (channelId
          ? `https://www.youtube.com/channel/${channelId}`
          : null),
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    await new Promise((r) => setTimeout(r, 200));
    process.stdout.write(`   Загружено: ${comments.length}...\r`);
  }

  console.log(`\n   ✅ Собрано ${comments.length} комментариев`);

  return {
    platform:      "youtube",
    source:        `https://www.youtube.com/watch?v=${videoId}`,
    title:         `${videoTitle} (${channelTitle})`,
    totalComments: comments.length,
    comments,
    parsedAt:      new Date().toISOString(),
  };
}
```

---

## parsers/reddit.ts

```typescript
/**
 * Парсер комментариев Reddit через snoowrap
 *
 * Как получить credentials (бесплатно):
 *   1. https://www.reddit.com/prefs/apps → "create another app"
 *   2. Тип: "script"
 *   3. redirect uri: http://localhost
 *   4. Получишь client_id (под названием) и client_secret
 */

import Snoowrap from "snoowrap";
import type { Comment, ParseResult } from "./types.js";

export async function parseReddit(
  subreddit: string,
  clientId: string,
  clientSecret: string,
  username: string,
  password: string,
  options: { postsLimit?: number; commentsPerPost?: number } = {}
): Promise<ParseResult> {
  const { postsLimit = 10, commentsPerPost = 20 } = options;

  console.log(`\n🤖 Reddit парсер → r/${subreddit}`);

  const r = new Snoowrap({
    userAgent:    `lead-finder-workshop/1.0 by u/${username}`,
    clientId,
    clientSecret,
    username,
    password,
  });

  // Топ-посты за неделю
  const posts = await r
    .getSubreddit(subreddit)
    .getTop({ time: "week", limit: postsLimit });

  console.log(`   📋 Загружено ${posts.length} постов...`);

  const comments: Comment[] = [];

  for (const post of posts) {
    try {
      const expanded = await post.expandReplies({ limit: commentsPerPost, depth: 1 });

      for (const c of expanded.comments.slice(0, commentsPerPost)) {
        if (!("body" in c) || !c.body || c.body === "[deleted]") continue;

        const author = c.author as { name?: string } | string;
        const authorName = typeof author === "string" ? author : (author?.name ?? "unknown");

        comments.push({
          platform:   "reddit",
          author:     authorName,
          username:   `u/${authorName}`,
          userId:     c.id,
          text:       c.body,
          date:       new Date(c.created_utc * 1000).toISOString(),
          sourceUrl:  `https://reddit.com${c.permalink}`,
          profileUrl: `https://reddit.com/user/${authorName}`,
        });
      }
    } catch { /* пост заблокирован */ }

    process.stdout.write(`   Комментариев: ${comments.length}...\r`);
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n   ✅ Собрано ${comments.length} комментариев`);

  return {
    platform:      "reddit",
    source:        `https://reddit.com/r/${subreddit}`,
    title:         `r/${subreddit} — топ недели`,
    totalComments: comments.length,
    comments,
    parsedAt:      new Date().toISOString(),
  };
}
```

---

## parsers/instagram.ts — полный код

```typescript
/**
 * Парсер Instagram через Playwright + stealth
 * Перехватывает GraphQL запросы пока браузер скроллит комментарии.
 *
 * ⚠️  Для воркшопа: использовать запасной аккаунт, не основной
 * ⚠️  Лимит 50 комментариев за раз — безопасно
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { Comment, ParseResult } from "./types.js";

const SESSION_FILE = "instagram_session.json";

interface IGComment {
  id: string;
  text: string;
  created_at: number;
  owner: { username: string; id: string; };
}

interface IGCommentsPage {
  edges: Array<{ node: IGComment }>;
}

// ── Авторизация ───────────────────────────────────────────────────────────

async function login(context: BrowserContext, username: string, password: string) {
  console.log("   🔐 Логинимся в Instagram...");
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle" });

  try {
    await page.getByRole("button", { name: /allow|accept|разрешить/i }).first().click({ timeout: 3000 });
  } catch { /* нет диалога */ }

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await sleep(500 + Math.random() * 500);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/instagram\.com\/?$|instagram\.com\/accounts\/onetap/, { timeout: 15_000 });

  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  console.log("   ✅ Сессия сохранена");
  await page.close();
}

// ── Скроллинг + перехват GraphQL ──────────────────────────────────────────

async function scrapeComments(page: Page, postUrl: string, limit: number): Promise<Comment[]> {
  const comments = new Map<string, Comment>();

  // Перехватываем GraphQL ответы
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("graphql/query") && !url.includes("api/v1/media")) return;
    if (!response.ok()) return;

    try {
      const json = await response.json() as {
        data?: { shortcode_media?: {
          edge_media_to_parent_comment?: IGCommentsPage;
          edge_media_to_comment?: IGCommentsPage;
        }};
      };

      const commentsPage =
        json?.data?.shortcode_media?.edge_media_to_parent_comment ??
        json?.data?.shortcode_media?.edge_media_to_comment;

      if (!commentsPage?.edges) return;

      for (const { node } of commentsPage.edges) {
        if (!node.text) continue;
        comments.set(node.id, {
          platform:   "instagram",
          author:     node.owner.username,
          username:   `@${node.owner.username}`,
          userId:     node.owner.id,
          text:       node.text,
          date:       new Date(node.created_at * 1000).toISOString(),
          sourceUrl:  postUrl,
          profileUrl: `https://www.instagram.com/${node.owner.username}/`,
        });
      }
    } catch { /* не JSON */ }
  });

  await page.goto(postUrl, { waitUntil: "domcontentloaded" });
  await sleep(2000);

  try {
    await page.getByRole("button", { name: /not now|не сейчас/i }).first().click({ timeout: 2000 });
  } catch { /* нет попапа */ }

  try {
    await page.getByText(/view all \d+ comments|посмотреть все/i).first().click({ timeout: 3000 });
    await sleep(1500);
  } catch { /* уже открыты */ }

  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 12) + 3;

  while (comments.size < limit && scrollAttempts < maxScrolls) {
    try {
      await page.getByRole("button", { name: /load more|ещё комментарии/i }).first().click({ timeout: 2000 });
    } catch {
      await page.evaluate(() =>
        document.querySelector('[role="dialog"]')?.scrollBy(0, 800) ?? window.scrollBy(0, 800)
      );
    }
    await sleep(1200 + Math.random() * 800);
    scrollAttempts++;
    process.stdout.write(`   Комментариев: ${comments.size}...\r`);
  }

  return Array.from(comments.values()).slice(0, limit);
}

// ── Главная функция ────────────────────────────────────────────────────────

export async function parseInstagram(
  postUrl: string,
  username: string,
  password: string,
  options: { limit?: number; headless?: boolean } = {}
): Promise<ParseResult> {
  const { limit = 50, headless = true } = options;
  console.log(`\n📸 Instagram парсер → ${postUrl}`);

  let browser;
  try {
    const { chromium: chromiumExtra } = await import("playwright-extra");
    const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
    chromiumExtra.use(StealthPlugin.default());
    browser = await (chromiumExtra as typeof chromium).launch({ headless });
  } catch {
    console.log("   ⚠️  stealth не найден, запуск без него");
    browser = await chromium.launch({ headless });
  }

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
    viewport:  { width: 1280, height: 900 },
    locale:    "ru-RU",
  });

  if (existsSync(SESSION_FILE)) {
    const cookies = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
    await context.addCookies(cookies);
  } else {
    await login(context, username, password);
  }

  try {
    const page = await context.newPage();
    const comments = await scrapeComments(page, postUrl, limit);
    await browser.close();

    const shortCode = postUrl.match(/\/p\/([^/]+)/)?.[1] ?? "unknown";
    console.log(`\n   ✅ Собрано ${comments.length} комментариев`);

    return {
      platform:      "instagram",
      source:        postUrl,
      title:         `Instagram post /${shortCode}/`,
      totalComments: comments.length,
      comments,
      parsedAt:      new Date().toISOString(),
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}
```
