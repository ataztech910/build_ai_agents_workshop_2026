/**
 * parsers/instagram.ts
 * Parses Instagram comments via Playwright
 *
 * Strategy: intercept GraphQL requests while the browser scrolls comments.
 * As of 2026 Instagram requires a session for most requests — so on the
 * first run we log in and save cookies to instagram_session.json.
 *
 * Install:
 *   npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * .env vars:
 *   IG_USERNAME=your_login
 *   IG_PASSWORD=your_password
 *   IG_POST_URL=https://www.instagram.com/p/SHORT_CODE/
 *   IG_HEADLESS=true   (false — shows the browser, handy for debugging)
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { Comment, ParseResult } from "./types.js";

const SESSION_FILE = "instagram_session.json";

// ─── Instagram GraphQL response types ───────────────────────────────────────

interface IGEdge<T> {
  node: T;
}

interface IGComment {
  id: string;
  text: string;
  created_at: number;
  owner: {
    username: string;
    id: string;
    profile_pic_url: string;
  };
}

interface IGCommentsPage {
  edges: IGEdge<IGComment>[];
  page_info?: { has_next_page: boolean; end_cursor: string };
  count?: number;
}

// ─── Authorization ────────────────────────────────────────────────────────────

async function login(context: BrowserContext, username: string, password: string) {
  console.log("   🔐 Logging into Instagram...");
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "networkidle",
  });

  // Accept cookies if a dialog shows up
  try {
    await page.getByRole("button", { name: /allow|accept/i })
      .first()
      .click({ timeout: 3000 });
  } catch { /* no dialog — fine */ }

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);

  await sleep(500 + Math.random() * 500); // human-like pause

  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/instagram\.com\/?$|instagram\.com\/accounts\/onetap/, {
    timeout: 15_000,
  });

  // Save cookies
  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  console.log("   ✅ Session saved to", SESSION_FILE);

  await page.close();
}

// ─── Scrolling and GraphQL interception ──────────────────────────────────────

async function scrapeComments(
  page: Page,
  postUrl: string,
  limit: number
): Promise<Comment[]> {
  const comments = new Map<string, Comment>(); // dedupe by id

  // Intercept every Instagram GraphQL response
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("graphql/query") && !url.includes("api/v1/media")) return;
    if (!response.ok()) return;

    try {
      const json = await response.json() as {
        data?: {
          shortcode_media?: {
            edge_media_to_parent_comment?: IGCommentsPage;
            edge_media_to_comment?: IGCommentsPage;
          };
        };
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
    } catch { /* some responses aren't JSON */ }
  });

  // Open the post
  await page.goto(postUrl, { waitUntil: "domcontentloaded" });
  await sleep(2000);

  // Dismiss notification prompts if they show up
  try {
    await page.getByRole("button", { name: /not now/i })
      .first()
      .click({ timeout: 2000 });
  } catch { /* no popup — fine */ }

  // Click "View all comments" if present
  try {
    const viewAll = page.getByText(/view all \d+ comments/i).first();
    await viewAll.click({ timeout: 3000 });
    await sleep(1500);
  } catch { /* comments already open */ }

  // Scroll comments until we've collected enough
  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 12) + 3;

  while (comments.size < limit && scrollAttempts < maxScrolls) {
    // Look for a "Load more comments" button
    try {
      const loadMore = page
        .getByRole("button", { name: /load more/i })
        .first();
      await loadMore.click({ timeout: 2000 });
    } catch {
      // Scroll down to trigger loading more
      await page.evaluate(() =>
        document.querySelector('[role="dialog"]')?.scrollBy(0, 800) ??
        window.scrollBy(0, 800)
      );
    }

    await sleep(1200 + Math.random() * 800); // mimic a human
    scrollAttempts++;
    process.stdout.write(`   Comments: ${comments.size}...\r`);
  }

  return Array.from(comments.values()).slice(0, limit);
}

// ─── Main function ─────────────────────────────────────────────────────────

export async function parseInstagram(
  postUrl: string,
  username: string,
  password: string,
  options: { limit?: number; headless?: boolean } = {}
): Promise<ParseResult> {
  const { limit = 50, headless = true } = options;

  console.log(`\n📸 Instagram parser → ${postUrl}`);
  console.log(`   Mode: ${headless ? "headless" : "with browser"}`);

  // playwright-extra + stealth to dodge detection
  let browser;
  try {
    const { chromium: chromiumExtra } = await import("playwright-extra");
    const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
    chromiumExtra.use(StealthPlugin.default());
    browser = await (chromiumExtra as typeof chromium).launch({ headless });
  } catch {
    // Fallback: plain playwright without stealth
    console.log("   ⚠️  playwright-extra not found, running without stealth");
    browser = await chromium.launch({ headless });
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  // Load a saved session
  if (existsSync(SESSION_FILE)) {
    console.log("   📂 Loading saved session...");
    const cookies = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
    await context.addCookies(cookies);
  } else {
    // First run — log in
    await login(context, username, password);
  }

  try {
    const page = await context.newPage();
    const comments = await scrapeComments(page, postUrl, limit);
    await browser.close();

    console.log(`\n   ✅ Collected ${comments.length} comments`);

    // Pull the post's short code out of the URL
    const shortCode = postUrl.match(/\/p\/([^/]+)/)?.[1] ?? "unknown";

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
