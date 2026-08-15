/**
 * Скелет: 1.1 — Первый LlmAgent
 * Задание: examples/../tasks/01-adk.md
 */
import "dotenv/config";
import { LlmAgent, Runner, InMemorySessionService, StreamingMode } from "@google/adk";
import { Content } from "@google/genai";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename } from "node:path";

// MODEL=kitana в .env → идём через claude CLI/ollama-подписку (без ключей).
// Любое другое значение (или её отсутствие) → напрямую в Gemini.
const modelEnv = process.env.MODEL;
const model =
  modelEnv === "kitana" ? new KitanaLlm({ model: "auto" }) : modelEnv || "gemini-flash-latest";

// export — обязательно для `npx adk run <файл>` и `npx adk web` (adk-devtools
// импортирует файл и ищет в нём экспортированный инстанс LlmAgent/BaseAgent;
// без export падает с "AgentFileLoadingError: No @google/adk BaseAgent class
// instance found").
// TODO: создай агента
export const agent = new LlmAgent({
  name: "hello",
  model,
  instruction: "", // TODO: напиши инструкцию на русском
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });

  const session = await sessionService.createSession({
    appName: "workshop",
    userId: "user",
  });

  const message: Content = {
    role: "user",
    parts: [{ text: "" }], // TODO: задай вопрос
  };

  // TODO: запусти агента и выведи ответ
  // streamingMode: SSE — модель отдаёт ответ по кусочкам (event.partial=true),
  // а в конце ADK всегда шлёт одно финальное событие с ПОЛНЫМ текстом
  // (event.partial=false) — это его стандартный контракт, а не особенность
  // Kitana. Если печатать оба вида событий подряд, текст выведется дважды.
  // sawPartial — защита от обеих ситуаций: если стриминг реально пришёл
  // по кусочкам, финальное событие просто пропускаем; если модель/провайдер
  // стриминг не поддержала и сразу прислала один partial=false ответ —
  // печатаем его, а не молчим.
  let sawPartial = false;
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: message,
    runConfig: { streamingMode: StreamingMode.SSE },
  })) {
    if (event.content?.parts?.[0]?.text) {
      if (event.partial) {
        sawPartial = true;
        process.stdout.write(event.content.parts[0].text);
      } else if (!sawPartial) {
        process.stdout.write(event.content.parts[0].text);
      }
    } else if (event.errorMessage) {
      // Событие-ошибка (нет ключа, кончилась квота и т.п.) не содержит
      // event.content — без этой ветки такие ошибки проходят молча,
      // и вывод выглядит просто "пустым", без единой подсказки почему.
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
  // Без завершающего \n курсор остаётся в конце строки ответа, и spinner-cleanup
  // от npx (пишет прямо в терминал, минуя перехваченный stdout) стирает именно эту
  // строку при выходе — выглядит как "ответ появился и тут же исчез".
  process.stdout.write("\n");
}

// Запускаем main() всегда, КРОМЕ случая, когда файл загружает `adk run`/`adk web`
// (adk-devtools импортирует его напрямую, чтобы забрать `agent` — main() не
// должен выполниться, иначе агент отработает дважды). Сравнивать пути файла
// напрямую (import.meta.url vs process.argv[1]) ненадёжно — расходится на
// symlink'ах (например, ~/Desktop через iCloud на Mac). Надёжный признак —
// сам бинарник, которым нас запустили: у adk run/web это всегда `adk`.
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
