/**
 * Lead Finder Pipeline v2
 * Воркшоп: мультиагентный поиск клиентов — 5 соцсетей + Claude Agent SDK
 *
 * Запуск:
 *   cp .env.example .env   → выбери SOURCE и заполни нужные ключи
 *   npm start
 */

import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { runParser } from "./parsers/index.js";
import type { ParseResult } from "./parsers/index.js";
import { writeFileSync } from "node:fs";

// ─── ICP — меняй под свой продукт ─────────────────────────────────────────

const ICP = `
  Мы продаём курс по автоматизации бизнеса с помощью ИИ.
  Идеальный клиент:
  - Владелец малого/среднего бизнеса или фрилансер
  - Жалуется на рутину, нехватку времени, хочет масштабироваться
  - Интересуется технологиями, но не является разработчиком
  - Задаёт вопросы, активно обсуждает
`;

const OFFER_TONE = process.env.OFFER_TONE ?? "дружелюбный";

// ─── Утилита: запуск Claude агента ────────────────────────────────────────

async function runAgent(name: string, prompt: string, systemPrompt: string): Promise<string> {
  console.log(`\n${"─".repeat(54)}`);
  console.log(`🤖  ${name}`);
  console.log(`${"─".repeat(54)}`);

  let result = "";

  for await (const msg of query({
    prompt,
    options: {
      systemPrompt,
      maxTurns: 3,
      permissionMode: "bypassPermissions",
    },
  })) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
          result += block.text;
        }
      }
    }
    if (msg.type === "result") console.log(`\n\n✅ ${name} завершил`);
  }

  return result;
}

// ─── Шаг 2: Агент-аналитик ────────────────────────────────────────────────

async function stepAnalyze(parsed: ParseResult): Promise<string> {
  const platformLabel: Record<string, string> = {
    telegram: "Telegram канал",
    youtube:  "YouTube видео",
    reddit:   "Reddit сабреддит",
    twitter:  "X/Twitter поиск",
    instagram: "Instagram пост",
  };

  const digest = parsed.comments
    .map((c) => `[${c.author}${c.username ? " " + c.username : ""}]: ${c.text.slice(0, 200)}`)
    .join("\n");

  return runAgent(
    "Аналитик лидов",
    `
      Источник: ${platformLabel[parsed.platform] ?? parsed.platform} — ${parsed.title}
      Комментариев проанализировано: ${parsed.totalComments}

      ICP (идеальный клиент):
      ${ICP}

      Комментарии:
      ${digest}

      Выбери топ-5 потенциальных клиентов.
    `,
    `
      Ты агент-аналитик лидов. Оцениваешь комментарии из соцсетей
      и находишь людей, максимально совпадающих с ICP.

      Критерии оценки (1–10):
      - Релевантность: боли и интересы совпадают с ICP
      - Намерение: вопросы о ценах, сроках, "как начать"
      - Активность: глубина и количество комментариев

      Отвечай ТОЛЬКО валидным JSON, без лишнего текста:
      {
        "top_leads": [
          {
            "author": "имя",
            "username": "@handle или null",
            "score": 8,
            "reason": "почему подходит (1–2 предложения)",
            "pain_points": ["боль 1", "боль 2"],
            "key_quote": "дословная цитата из комментария",
            "contact_url": "ссылка на профиль или null"
          }
        ]
      }
    `
  );
}

// ─── Шаг 3: Агент-копирайтер ──────────────────────────────────────────────

async function stepCopywrite(leadsJson: string): Promise<string> {
  return runAgent(
    "Копирайтер",
    `Напиши персональный оффер для каждого лида.\nДанные лидов:\n${leadsJson}`,
    `
      Ты агент-копирайтер. Пишешь персональные офферы для потенциальных клиентов.

      Правила:
      - Цитируй key_quote — покажи что читал их слова
      - Сначала боль, потом решение, никакого "хочу предложить"
      - Тон: ${OFFER_TONE}
      - Длина: 3–4 предложения
      - Адаптируй стиль к платформе: в Telegram и Instagram — неформально,
        в LinkedIn и Reddit — профессиональнее

      Отвечай ТОЛЬКО валидным JSON:
      {
        "offers": [
          {
            "author": "имя",
            "username": "@handle или null",
            "contact_url": "ссылка",
            "platform": "telegram/youtube/...",
            "hook": "первая фраза-зацепка",
            "message": "полный текст оффера",
            "cta": "призыв к действию"
          }
        ]
      }
    `
  );
}

// ─── Финальный вывод ──────────────────────────────────────────────────────

interface Offer {
  author: string;
  username: string | null;
  contact_url: string | null;
  platform: string;
  hook: string;
  message: string;
  cta: string;
}

function printReport(data: { offers: Offer[] }): void {
  console.log("\n" + "═".repeat(60));
  console.log("  📋 ПЕРСОНАЛЬНЫЕ ОФФЕРЫ");
  console.log("═".repeat(60));

  data.offers.forEach((o, i) => {
    const handle = o.username ?? o.author;
    console.log(`\n${i + 1}. ${handle}  [${o.platform}]`);
    if (o.contact_url) console.log(`   🔗 ${o.contact_url}`);
    console.log(`   💬 ${o.hook}`);
    console.log(`   ${o.message}`);
    console.log(`   👉 ${o.cta}`);
  });

  console.log("\n" + "═".repeat(60));
}

function extractJSON(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSON не найден в ответе агента");
  return JSON.parse(m[0]);
}

// ─── Главный пайплайн ─────────────────────────────────────────────────────

async function main() {
  const source = process.env.SOURCE ?? "telegram";
  console.log(`\n🚀 Lead Finder  |  источник: ${source.toUpperCase()}  |  тон: ${OFFER_TONE}`);

  // 1. Парсим
  const parsed = await runParser();

  // 2. Анализируем
  const leadsRaw   = await stepAnalyze(parsed);
  const leadsData  = extractJSON(leadsRaw);

  // 3. Офферы
  const offersRaw  = await stepCopywrite(leadsRaw);
  const offersData = extractJSON(offersRaw) as { offers: Offer[] };

  // Вывод
  printReport(offersData);

  // Сохраняем
  const file = `leads_${source}_${Date.now()}.json`;
  writeFileSync(file, JSON.stringify({ source, parsed, leads: leadsData, offers: offersData }, null, 2));
  console.log(`\n💾 Сохранено: ${file}`);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
