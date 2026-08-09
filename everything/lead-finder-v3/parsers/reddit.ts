/**
 * parsers/reddit.ts
 * Парсер комментариев Reddit через snoowrap
 *
 * Как получить credentials (бесплатно):
 *   1. https://www.reddit.com/prefs/apps → "create another app"
 *   2. Тип: "script"
 *   3. redirect uri: http://localhost
 *   4. Получишь client_id (под названием приложения) и client_secret
 *
 * .env переменные:
 *   REDDIT_CLIENT_ID=...
 *   REDDIT_CLIENT_SECRET=...
 *   REDDIT_USERNAME=твой_логин
 *   REDDIT_PASSWORD=твой_пароль
 *   REDDIT_SUBREDDIT=MachineLearning   (без r/)
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
    userAgent: `lead-finder-workshop/1.0 by u/${username}`,
    clientId,
    clientSecret,
    username,
    password,
  });

  // Берём топ-посты за неделю
  const posts = await r
    .getSubreddit(subreddit)
    .getTop({ time: "week", limit: postsLimit });

  console.log(`   📋 Загружено ${posts.length} постов, собираем комментарии...`);

  const comments: Comment[] = [];

  for (const post of posts) {
    const postUrl = `https://reddit.com${post.permalink}`;

    try {
      // Разворачиваем ветку комментариев (глубина 2, не бесконечно)
      const expanded = await post.expandReplies({ limit: commentsPerPost, depth: 1 });

      for (const c of expanded.comments.slice(0, commentsPerPost)) {
        // Snoowrap возвращает Comment | MoreComments — фильтруем
        if (!("body" in c) || !c.body || c.body === "[deleted]") continue;

        const author = c.author as { name?: string } | string;
        const authorName = typeof author === "string"
          ? author
          : (author?.name ?? "unknown");

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
    } catch {
      // Некоторые посты могут быть заблокированы
    }

    process.stdout.write(`   Комментариев: ${comments.length}...\r`);
    await new Promise((r) => setTimeout(r, 500)); // Rate limit
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
