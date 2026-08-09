/**
 * Скелет: 3.2 — Kitana runner
 * Задание: examples/../tasks/03-kitana.md
 */
import { Kitana } from "@kitana-sdk/core";

async function main() {
  // TODO: создай Kitana с цепочкой провайдеров из .env или явно
  const ai = new Kitana({
    providers: [], // TODO: ['claude', 'ollama'] — порядок = приоритет
  });

  console.log("🤖 Отправляем запрос через Kitana...\n");

  // TODO: вызови ai.ask() и получи ответ
  const result = await ai.ask(
    "Объясни что такое ИИ агент в двух предложениях"
  );

  // TODO: выведи: провайдер, токены, текст
  console.log(`\nПровайдер: ${result.provider}`);
  console.log(`Токены:    ${result.usage?.totalTokens ?? "n/a"}`);
  console.log(`Стоимость: ${result.cost ?? "бесплатно (CLI)"}`);
  console.log(`\nОтвет:\n${result.text}`);
}

main().catch(console.error);
