/**
 * Скелет: 2.4 — Lead Finder пайплайн
 * Задание: examples/../tasks/02-api.md
 */
import { LlmAgent, SequentialAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { writeFileSync } from "node:fs";

// ── Фейковые комментарии для демо ─────────────────────────────────────────
const FAKE_COMMENTS = [
  { author: "Иван Петров",    username: "@ivanp",    text: "Уже полгода пытаюсь автоматизировать отчёты, всё вручную — сил нет" },
  { author: "Мария Сидорова", username: "@masha_biz", text: "Подскажите, есть ли что-то чтобы сэкономить время на рутине?" },
  { author: "Алексей К.",     username: "@alex_dev",  text: "Интересная тема, но мне как разработчику проще самому написать" },
  { author: "Ольга Романова", username: "@olga_hr",   text: "Мы в компании тратим по 3 часа в день на ручной ввод данных" },
  { author: "Дмитрий Лис",    username: "@dmlisenko",  text: "А сколько это стоит? Есть ли пробный период?" },
  { author: "Света Иванова",  username: "@sveta_mm",  text: "Классный контент, лайк!" },
  { author: "Николай Фролов", username: "@nik_ceo",   text: "Хочу масштабировать бизнес но не хватает людей на операционку" },
  { author: "Тимур Асанов",   username: "@timur_a",   text: "Пробовал ChatGPT, не то, ищу что-то более специализированное" },
  { author: "Катя Морозова",  username: "@katya_smm", text: "Огонь пост 🔥" },
  { author: "Сергей Быков",   username: "@byk_sergei", text: "Как именно это работает с CRM? Есть интеграция с AmoCRM?" },
];

// ── ICP — меняй под свой продукт ──────────────────────────────────────────
const ICP = `
  Курс по автоматизации бизнеса с ИИ.
  Идеальный клиент: владелец бизнеса или менеджер,
  жалуется на рутину и ручной труд,
  не разработчик, хочет готовое решение.
`;

// ── TODO: Агент-аналитик ──────────────────────────────────────────────────
// instruction: получает ICP + комментарии, возвращает JSON топ-3 лидов
// { top_leads: [{ author, username, score, reason, key_quote }] }
const analyst = new LlmAgent({
  name: "analyst",
  model: "claude-sonnet-4-5", // или gemini-flash-latest
  instruction: "", // TODO
});

// ── TODO: Агент-копирайтер ────────────────────────────────────────────────
// instruction: получает топ-3, пишет персональный оффер для каждого
// { offers: [{ author, message, hook, cta }] }
const copywriter = new LlmAgent({
  name: "copywriter",
  model: "claude-sonnet-4-5",
  instruction: "", // TODO
});

// ── TODO: Агент-валидатор ─────────────────────────────────────────────────
// instruction: проверяет офферы, отклоняет шаблонные и переписывает
const validator = new LlmAgent({
  name: "validator",
  model: "claude-sonnet-4-5",
  instruction: "", // TODO
});

// ── TODO: SequentialAgent ─────────────────────────────────────────────────
const pipeline = new SequentialAgent({
  name: "lead-finder",
  subAgents: [], // TODO: [analyst, copywriter, validator]
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent: pipeline, appName: "lead-finder", sessionService });
  const session = await sessionService.createSession({ appName: "lead-finder", userId: "user" });

  const prompt = `
    ICP: ${ICP}
    Комментарии: ${JSON.stringify(FAKE_COMMENTS, null, 2)}
  `;

  let finalResult = "";

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: prompt }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      const text = event.content.parts[0].text;
      console.log(`\n[${event.author}]`, text.slice(0, 100), "...");
      finalResult = text;
    }
  }

  // TODO: сохрани финальный результат в leads_result.json
  writeFileSync("leads_result.json", finalResult);
  console.log("\n💾 Сохранено: leads_result.json");
}

main().catch(console.error);
