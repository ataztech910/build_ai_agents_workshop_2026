/**
 * parsers/reddit.ts
 * Parses Reddit comments via snoowrap
 *
 * How to get credentials (free):
 *   1. https://www.reddit.com/prefs/apps → "create another app"
 *   2. Type: "script"
 *   3. redirect uri: http://localhost
 *   4. You'll get a client_id (under the app's name) and client_secret
 *
 * .env vars:
 *   REDDIT_CLIENT_ID=...
 *   REDDIT_CLIENT_SECRET=...
 *   REDDIT_USERNAME=your_login
 *   REDDIT_PASSWORD=your_password
 *   REDDIT_SUBREDDIT=MachineLearning   (without r/)
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

  console.log(`\n🤖 Reddit parser → r/${subreddit}`);

  const r = new Snoowrap({
    userAgent: `lead-finder-workshop/1.0 by u/${username}`,
    clientId,
    clientSecret,
    username,
    password,
  });

  // Fetch the top posts of the week
  const posts = await r
    .getSubreddit(subreddit)
    .getTop({ time: "week", limit: postsLimit });

  console.log(`   📋 Loaded ${posts.length} posts, collecting comments...`);

  const comments: Comment[] = [];

  for (const post of posts) {
    const postUrl = `https://reddit.com${post.permalink}`;

    try {
      // Expand the comment thread (depth 2, not unlimited)
      const expanded = await post.expandReplies({ limit: commentsPerPost, depth: 1 });

      for (const c of expanded.comments.slice(0, commentsPerPost)) {
        // Snoowrap returns Comment | MoreComments — filter it
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
      // Some posts may be locked
    }

    process.stdout.write(`   Comments: ${comments.length}...\r`);
    await new Promise((r) => setTimeout(r, 500)); // Rate limit
  }

  console.log(`\n   ✅ Collected ${comments.length} comments`);

  return {
    platform:      "reddit",
    source:        `https://reddit.com/r/${subreddit}`,
    title:         `r/${subreddit} — top of the week`,
    totalComments: comments.length,
    comments,
    parsedAt:      new Date().toISOString(),
  };
}
