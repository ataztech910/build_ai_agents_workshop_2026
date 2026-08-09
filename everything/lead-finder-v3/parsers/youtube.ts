/**
 * parsers/youtube.ts
 * Парсер комментариев YouTube через YouTube Data API v3
 *
 * Как получить API ключ (бесплатно):
 *   1. https://console.cloud.google.com → создай проект
 *   2. APIs & Services → Enable APIs → YouTube Data API v3
 *   3. Credentials → Create Credentials → API Key
 *
 * .env переменные:
 *   YT_API_KEY=AIza...
 *   YT_VIDEO_ID=dQw4w9WgXcQ   (ID видео из URL: youtube.com/watch?v=ID)
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
  pageInfo?: { totalResults: number };
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

  // Получаем название видео
  const videoInfo = await fetchJSON<YTVideoResponse>(
    `${BASE}/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  const videoTitle =
    videoInfo.items[0]?.snippet.title ?? videoId;
  const channelTitle =
    videoInfo.items[0]?.snippet.channelTitle ?? "";

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
        platform: "youtube",
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

    // Пауза чтобы не бить rate limit
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
