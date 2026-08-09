/**
 * telegram-parser.ts
 * Парсер Telegram канала через gramjs (MTProto — не Bot API)
 *
 * Что умеет:
 *   - Читать посты из публичного канала
 *   - Читать комментарии к постам (discussion группа)
 *   - Сохранять сессию чтобы не логиниться каждый раз
 *
 * Получить API_ID и API_HASH:
 *   1. Зайди на https://my.telegram.org
 *   2. Раздел "API development tools"
 *   3. Создай приложение — получишь api_id и api_hash
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import * as readline from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ─── Типы ─────────────────────────────────────────────────────────────────────

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

// ─── Конфиг ───────────────────────────────────────────────────────────────────

const SESSION_FILE = ".telegram_session";

// ─── Авторизация ──────────────────────────────────────────────────────────────

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
  // Грузим сохранённую сессию если есть
  let sessionString = "";
  if (existsSync(SESSION_FILE)) {
    sessionString = readFileSync(SESSION_FILE, "utf-8").trim();
    console.log("📂 Найдена сохранённая сессия");
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => getInput("📱 Номер телефона (+7...): "),
    password: async () => getInput("🔑 Пароль 2FA (если есть): "),
    phoneCode: async () => getInput("💬 Код из Telegram: "),
    onError: (err) => console.error("Ошибка авторизации:", err),
  });

  // Сохраняем сессию — больше не нужно логиниться
  const savedSession = client.session.save() as unknown as string;
  writeFileSync(SESSION_FILE, savedSession);
  console.log("✅ Сессия сохранена в", SESSION_FILE);

  return client;
}

// ─── Парсинг канала ───────────────────────────────────────────────────────────

export async function parseChannel(
  channelUsername: string,
  apiId: number,
  apiHash: string,
  options: {
    postsLimit?: number;      // сколько последних постов смотреть
    commentsPerPost?: number; // сколько комментариев с каждого поста
  } = {}
): Promise<ParseResult> {
  const { postsLimit = 10, commentsPerPost = 20 } = options;

  // Убираем @ и https://t.me/ если передали полную ссылку
  const username = channelUsername
    .replace("https://t.me/", "")
    .replace("@", "")
    .split("/")[0];

  const client = await createClient(apiId, apiHash);

  console.log(`\n🔍 Подключаемся к каналу @${username}...`);

  try {
    // Получаем информацию о канале
    const entity = await client.getEntity(username);
    const channelTitle =
      "title" in entity ? (entity.title as string) : username;

    console.log(`📢 Канал: ${channelTitle}`);
    console.log(`📋 Забираем последние ${postsLimit} постов...\n`);

    const allComments: Comment[] = [];

    // Итерируемся по постам канала
    let postCount = 0;
    for await (const post of client.iterMessages(entity, {
      limit: postsLimit,
    })) {
      if (!post.message) continue; // пропускаем посты без текста
      postCount++;

      const preview = post.message.slice(0, 60).replace(/\n/g, " ");
      process.stdout.write(`  📄 Пост #${post.id}: "${preview}..." → `);

      try {
        // Получаем комментарии к посту
        // replyTo: post.id — это комментарии именно к этому посту
        let commentCount = 0;
        for await (const comment of client.iterMessages(entity, {
          replyTo: post.id,
          limit: commentsPerPost,
        })) {
          if (!comment.message || !comment.senderId) continue;

          // Получаем отправителя
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

        console.log(`${commentCount} комментариев`);
      } catch {
        // Комментарии могут быть отключены на посте
        console.log("комментарии недоступны");
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

    console.log(`\n✅ Готово! Собрано ${allComments.length} комментариев`);
    return result;

  } catch (err) {
    await client.disconnect();
    throw err;
  }
}

// ─── Запуск напрямую (тест) ───────────────────────────────────────────────────

// Запуск: npx tsx telegram-parser.ts
if (process.argv[1]?.endsWith("telegram-parser.ts")) {
  const API_ID = Number(process.env.TG_API_ID);
  const API_HASH = process.env.TG_API_HASH ?? "";
  const CHANNEL = process.env.TG_CHANNEL ?? "durov"; // дефолт для теста

  if (!API_ID || !API_HASH) {
    console.error("❌ Нужны переменные: TG_API_ID и TG_API_HASH");
    console.error("   Получи на https://my.telegram.org");
    process.exit(1);
  }

  parseChannel(CHANNEL, API_ID, API_HASH, {
    postsLimit: 5,
    commentsPerPost: 10,
  })
    .then((result) => {
      console.log("\n📊 Пример первых 3 комментариев:");
      result.comments.slice(0, 3).forEach((c) => {
        console.log(`  @${c.username ?? c.author}: ${c.text.slice(0, 100)}`);
      });
    })
    .catch(console.error);
}
