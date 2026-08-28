/**
 * Presenter-only demo: ADK's own model routing (RoutedLlm)
 * Not something participants build — a quick aside next to pickModel().
 *
 * This is ADK-native routing, NOT Kitana's chain (that's a separate
 * mechanism — Kitana never throws, RoutedLlm needs a thrown error to know
 * a provider failed). RoutedLlm is marked experimental in ADK; the primary
 * model here is deliberately an invalid model name so the failover fires
 * every single run, not only when a real provider happens to be down —
 * reliable for a live demo instead of hoping for a real outage on stage.
 */
import { config } from "dotenv";
import { LlmAgent, Runner, InMemorySessionService, RoutedLlm, Gemini } from "@google/adk";
import type { LlmRouter } from "@google/adk";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env") });

const primary = new Gemini({ model: "gemini-does-not-exist-404" }); // always fails
const fallback = new Gemini({ model: "gemini-3.6-flash" }); // real, working model

const router: LlmRouter = (models, request, errorContext) => {
  if (!errorContext || !errorContext.failedKeys.has("primary")) return "primary";
  return "fallback";
};

// modelName works around a real ADK bug: RoutedLlm doesn't reset
// llmRequest.model before delegating, so without this Gemini receives
// RoutedLlm's own auto-generated descriptive name and 400s.
const model = new RoutedLlm({
  models: { primary, fallback },
  router,
  modelName: "gemini-3.6-flash",
});

export const agent = new LlmAgent({
  name: "routing-demo",
  model,
  instruction: "Answer briefly and to the point.",
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "routing-demo", sessionService });
  const session = await sessionService.createSession({ appName: "routing-demo", userId: "user" });

  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: { role: "user", parts: [{ text: "What is 2+2?" }] },
  })) {
    if (event.content?.parts?.[0]?.text) {
      process.stdout.write(event.content.parts[0].text);
    } else if (event.errorMessage) {
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
  process.stdout.write("\n");
}

main().catch(console.error);
