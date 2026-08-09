/**
 * Единый формат комментария — одинаковый для всех соцсетей.
 * Агенты-аналитики работают только с этим форматом.
 */
export interface Comment {
  author: string;       // отображаемое имя
  username: string | null;  // @handle / никнейм
  userId: string;       // внутренний ID платформы
  text: string;         // текст комментария
  date: string;         // ISO 8601
  sourceUrl: string | null; // ссылка на конкретный комментарий/пост
  profileUrl: string | null; // ссылка на профиль автора
  platform: "telegram" | "youtube" | "reddit" | "twitter" | "instagram";
}

export interface ParseResult {
  platform: Comment["platform"];
  source: string;       // URL или идентификатор источника
  title: string;        // название канала / видео / сабреддита
  totalComments: number;
  comments: Comment[];
  parsedAt: string;     // ISO 8601
}
