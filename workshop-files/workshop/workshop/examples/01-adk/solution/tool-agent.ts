/**
 * Solution: 1.2 — FunctionTool
 * Skeleton for participants: examples/01-adk/starter/tool-agent.ts
 */
import { config } from "dotenv";
import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from "@google/adk";
import { z } from "zod";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

const modelEnv = process.env.MODEL;
const model =
  modelEnv === "kitana" ? new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }) : modelEnv || "gemini-3.6-flash";

const weatherTool = new FunctionTool({
  name: "getWeather",
  description: "Returns the current weather for the given city",
  parameters: z.object({
    city: z.string().describe("City name"),
  }),
  execute: async ({ city }) => {
    console.log(`[tool called] getWeather({ city: "${city}" })`);
    return { city, tempC: 18, condition: "cloudy" };
  },
});

export const agent = new LlmAgent({
  name: "weather",
  model,
  instruction: "Answer weather questions using the getWeather tool.",
  tools: [weatherTool],
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: "What's the weather in Moscow?" }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text + "\n");
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
}

const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
