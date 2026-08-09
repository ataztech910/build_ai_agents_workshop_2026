/**
 * parsers/instagram.ts
 * Парсер комментариев Instagram через Playwright
 *
 * Стратегия: перехватываем GraphQL запросы пока браузер скроллит комментарии.
 * Instagram в 2026 требует сессию для большинства запросов — поэтому
 * при первом запуске логинимся и сохраняем cookies в instagram_session.json.
 *
 * Установка:
 *   npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * .env переменные:
 *   IG_USERNAME=твой_логин
 *   IG_PASSWORD=твой_пароль
 *   IG_POST_URL=https://www.instagram.com/p/SHORT_CODE/
 *   IG_HEADLESS=true   (false — видно браузер, удобно для отладки)
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { Comment, ParseResult } from "./types.js";

const SESSION_FILE = "instagram_session.json";

// ─── Типы GraphQL ответа Instagram ───────────────────────────────────────────

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

// ─── Авторизация ──────────────────────────────────────────────────────────────

async function login(context: BrowserContext, username: string, password: string) {
  console.log("   🔐 Логинимся в Instagram...");
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "networkidle",
  });

  // Принимаем cookies если появился диалог
  try {
    await page.getByRole("button", { name: /allow|accept|разрешить/i })
      .first()
      .click({ timeout: 3000 });
  } catch { /* нет диалога — ок */ }

  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);

  await sleep(500 + Math.random() * 500); // человеческая пауза

  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/instagram\.com\/?$|instagram\.com\/accounts\/onetap/, {
    timeout: 15_000,
  });

  // Сохраняем cookies
  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  console.log("   ✅ Сессия сохранена в", SESSION_FILE);

  await page.close();
}

// ─── Скроллинг и перехват GraphQL ────────────────────────────────────────────

async function scrapeComments(
  page: Page,
  postUrl: string,
  limit: number
): Promise<Comment[]> {
  const comments = new Map<string, Comment>(); // deduplicate по id

  // Перехватываем все GraphQL ответы Instagram
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
    } catch { /* некоторые ответы не JSON */ }
  });

  // Открываем пост
  await page.goto(postUrl, { waitUntil: "domcontentloaded" });
  await sleep(2000);

  // Закрываем уведомления если появились
  try {
    await page.getByRole("button", { name: /not now|не сейчас/i })
      .first()
      .click({ timeout: 2000 });
  } catch { /* нет попапа — ок */ }

  // Нажимаем "Посмотреть все комментарии" если есть
  try {
    const viewAll = page.getByText(/view all \d+ comments|посмотреть все/i).first();
    await viewAll.click({ timeout: 3000 });
    await sleep(1500);
  } catch { /* комментарии уже открыты */ }

  // Скроллим комментарии пока не наберём достаточно
  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 12) + 3;

  while (comments.size < limit && scrollAttempts < maxScrolls) {
    // Ищем кнопку "Load more comments"
    try {
      const loadMore = page
        .getByRole("button", { name: /load more|ещё комментарии|загрузить ещё/i })
        .first();
      await loadMore.click({ timeout: 2000 });
    } catch {
      // Скроллим вниз чтобы триггернуть подгрузку
      await page.evaluate(() =>
        document.querySelector('[role="dialog"]')?.scrollBy(0, 800) ??
        window.scrollBy(0, 800)
      );
    }

    await sleep(1200 + Math.random() * 800); // имитируем человека
    scrollAttempts++;
    process.stdout.write(`   Комментариев: ${comments.size}...\r`);
  }

  return Array.from(comments.values()).slice(0, limit);
}

// ─── Главная функция ──────────────────────────────────────────────────────────

export async function parseInstagram(
  postUrl: string,
  username: string,
  password: string,
  options: { limit?: number; headless?: boolean } = {}
): Promise<ParseResult> {
  const { limit = 50, headless = true } = options;

  console.log(`\n📸 Instagram парсер → ${postUrl}`);
  console.log(`   Режим: ${headless ? "headless" : "с браузером"}`);

  // playwright-extra + stealth для обхода детекции
  let browser;
  try {
    const { chromium: chromiumExtra } = await import("playwright-extra");
    const StealthPlugin = await import("puppeteer-extra-plugin-stealth");
    chromiumExtra.use(StealthPlugin.default());
    browser = await (chromiumExtra as typeof chromium).launch({ headless });
  } catch {
    // Fallback: обычный playwright без stealth
    console.log("   ⚠️  playwright-extra не найден, запуск без stealth");
    browser = await chromium.launch({ headless });
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "ru-RU",
  });

  // Загружаем сохранённую сессию
  if (existsSync(SESSION_FILE)) {
    console.log("   📂 Загружаем сохранённую сессию...");
    const cookies = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
    await context.addCookies(cookies);
  } else {
    // Первый запуск — логинимся
    await login(context, username, password);
  }

  try {
    const page = await context.newPage();
    const comments = await scrapeComments(page, postUrl, limit);
    await browser.close();

    console.log(`\n   ✅ Собрано ${comments.length} комментариев`);

    // Достаём название поста из URL (short code)
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
