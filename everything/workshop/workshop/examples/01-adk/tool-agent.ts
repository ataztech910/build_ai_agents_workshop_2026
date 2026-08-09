/**
 * Скелет: 1.2 — FunctionTool
 * Задание: examples/../tasks/01-adk.md
 */
import { LlmAgent } from "@google/adk/agents";
import { FunctionTool } from "@google/adk/tools";
import { Runner } from "@google/adk/runners";
import { InMemorySessionService } from "@google/adk/sessions";
import { z } from "zod";

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

// TODO: создай агента с weatherTool
const agent = new LlmAgent({
  name: "weather",
  model: "gemini-2.0-flash",
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

main().catch(console.error);
