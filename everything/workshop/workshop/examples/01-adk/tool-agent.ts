/**
 * Скелет: 1.2 — FunctionTool
 * Задание: examples/../tasks/01-adk.md
 */
import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from "@google/adk";
import { z } from "zod";
import { basename } from "node:path";

// TODO: создай инструмент получения погоды
const weatherTool = new FunctionTool({
  name: "getWeather",
  description: "", // TODO: опиши что делает инструмент
  parameters: z.object({
    city: z.string().describe("Название города"),
  }),
  execute: async ({ city }) => {
    // TODO: верни фейковые данные о погоде
    return {};
  },
});

// export — обязательно для `npx adk run <файл>` и `npx adk web`, см. hello-agent.ts
// TODO: создай агента с weatherTool
export const agent = new LlmAgent({
  name: "weather",
  model: "gemini-flash-latest",
  instruction: "", // TODO
  tools: [], // TODO: добавь weatherTool
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  // TODO: запусти с вопросом о погоде и выведи ответ
  // не забудь показать в логах когда вызвался инструмент
}

// main() — не при загрузке через adk run/web, см. hello-agent.ts
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
