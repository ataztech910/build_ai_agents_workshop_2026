/**
 * Скелет: 3.1 — Kitana detector
 * Задание: examples/../tasks/03-kitana.md
 */
import { KitanaDetector } from "@kitana-sdk/core";

async function main() {
  const detector = new KitanaDetector();

  console.log("🔍 Сканируем окружение...\n");

  // TODO: вызови detector.scan()
  const providers = await detector.scan();

  // TODO: выведи таблицу:
  // provider | version | authorized | models
  console.table(
    providers.map((p) => ({
      provider:   p.name,
      version:    p.version ?? "-",
      authorized: p.authorized ? "✅ yes" : "❌ no",
      models:     p.models?.join(", ") ?? "-",
    }))
  );

  // TODO: выведи рекомендацию — какой провайдер использовать первым
  const best = providers.find((p) => p.authorized);
  if (best) {
    console.log(`\n✅ Рекомендуемый провайдер: ${best.name}`);
  } else {
    console.log("\n❌ Нет доступных провайдеров. Установи claude или ollama.");
  }
}

main().catch(console.error);
