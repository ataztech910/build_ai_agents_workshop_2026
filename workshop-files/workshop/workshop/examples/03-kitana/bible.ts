/**
 * Скелет: 3.4 — Библия проекта (бонус)
 * Задание: examples/../tasks/03-kitana.md
 */
import { Kitana, KitanaBible } from "@kitana-sdk/core";
import { LlmAgent, SequentialAgent } from "@google/adk/agents";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";

// ── Фейковые комментарии (те же что в 2.4) ────────────────────────────────
const FAKE_COMMENTS = [
  { author: "Иван Петров",    text: "Уже полгода пытаюсь автоматизировать отчёты" },
  { author: "Мария Сидорова", text: "Есть ли что-то чтобы сэкономить время на рутине?" },
  { author: "Николай Фролов", text: "Хочу масштабировать бизнес но не хватает людей" },
];

// ── TODO: Инициализируй Библию ─────────────────────────────────────────────
// KitanaBible читает и пишет в .kitana/bible/
const bible = new KitanaBible({
  path: ".kitana/bible",
  mission: "Найти лидов для курса по автоматизации бизнеса с ИИ",
});

// ── TODO: Создай Kitana для CLI вызовов ───────────────────────────────────
const ai = new Kitana({ providers: ["claude", "ollama"] });

// ── TODO: Агенты ──────────────────────────────────────────────────────────
// Каждый агент после работы вызывает bible.update(step, result)

async function runAnalyst(comments: typeof FAKE_COMMENTS) {
  // TODO: проверь bible.getProgress("analyst") — если уже выполнен, пропусти
  const done = await bible.getProgress("analyst");
  if (done) {
    console.log("📖 [bible] аналитик уже выполнен, пропускаем");
    return done.result;
  }

  console.log("🤖 [аналитик] работаем...");
  const result = await ai.ask(`Выбери топ-2 лида: ${JSON.stringify(comments)}`);

  // TODO: запиши результат в Библию
  await bible.update("analyst", result.text);

  return result.text;
}

async function runCopywriter(leads: string) {
  const done = await bible.getProgress("copywriter");
  if (done) {
    console.log("📖 [bible] копирайтер уже выполнен, пропускаем");
    return done.result;
  }

  // TODO: симулируй падение — раскомментируй чтобы протестировать возобновление
  // throw new Error("Симуляция падения копирайтера!");

  console.log("🤖 [копирайтер] работаем...");
  const result = await ai.ask(`Напиши офферы для лидов: ${leads}`);
  await bible.update("copywriter", result.text);
  return result.text;
}

async function main() {
  console.log("📖 Читаем Библию проекта...");
  await bible.load();

  const analysts = await runAnalyst(FAKE_COMMENTS);
  const offers   = await runCopywriter(analysts);

  console.log("\n✅ Готово!\n", offers);
  console.log("\n📁 Библия сохранена в .kitana/bible/");
}

main().catch(console.error);
