/**
 * Shared comment format — the same across all social platforms.
 * Analyst agents work only with this format.
 */
export interface Comment {
  author: string;       // display name
  username: string | null;  // @handle / nickname
  userId: string;       // platform-internal ID
  text: string;         // comment text
  date: string;         // ISO 8601
  sourceUrl: string | null; // link to the specific comment/post
  profileUrl: string | null; // link to the author's profile
  platform: "telegram" | "youtube" | "reddit" | "twitter" | "instagram";
}

export interface ParseResult {
  platform: Comment["platform"];
  source: string;       // URL or source identifier
  title: string;        // channel / video / subreddit name
  totalComments: number;
  comments: Comment[];
  parsedAt: string;     // ISO 8601
}
