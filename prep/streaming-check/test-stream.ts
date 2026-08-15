import "dotenv/config";
import { LlmAgent, Runner, InMemorySessionService, StreamingMode } from "@google/adk";
import { Content } from "@google/genai";
import { KitanaLlm } from "@kitana-sdk/adk";

const agent = new LlmAgent({
  name: "hello",
  model: new KitanaLlm({ model: "auto" }),
  instruction: "Отвечай кратко.",
});

async function main() {
  const sessionService = new InMemorySessionService();
  const runner = new Runner({ agent, appName: "workshop", sessionService });
  const session = await sessionService.createSession({ appName: "workshop", userId: "user" });

  const message: Content = { role: "user", parts: [{ text: "Расскажи очень короткую историю про кота" }] };

  let n = 0;
  for await (const event of runner.runAsync({
    userId: "user",
    sessionId: session.id,
    newMessage: message,
    runConfig: { streamingMode: StreamingMode.SSE },
  })) {
    n++;
    console.log(`--- event ${n} --- partial=${event.partial} turnComplete=${event.turnComplete}`);
    console.log(JSON.stringify(event.content?.parts?.[0]?.text ?? event.errorMessage ?? null));
  }
  console.log(`\ntotal events: ${n}`);
}

main().catch(console.error);
