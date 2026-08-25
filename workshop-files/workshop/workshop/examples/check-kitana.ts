/**
 * Verifies that KitanaLlm (Claude CLI backend) is installed and authenticated.
 * Run from the workshop root:  npx tsx examples/check-kitana.ts
 */
import { config } from "dotenv";
import { LlmAgent, Runner, InMemorySessionService } from "@google/adk";
import { KitanaLlm } from "@kitana-sdk/adk";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

console.log("\nChecking Kitana (KitanaLlm → Claude CLI)...\n");

const model = new KitanaLlm({ model: "auto" });

const agent = new LlmAgent({
  name: "kitana-check",
  model,
  instruction: "Reply with exactly the word: OK. Nothing else.",
});

const sessionService = new InMemorySessionService();
const runner = new Runner({ agent, appName: "kitana-check", sessionService });

const session = await sessionService.createSession({
  appName: "kitana-check",
  userId: "u",
});

let response = "";
for await (const event of runner.runAsync({
  userId: "u",
  sessionId: session.id,
  newMessage: { role: "user", parts: [{ text: "Say OK" }] },
})) {
  if (event.errorMessage) {
    console.error(`\n✗ Agent error [${event.errorCode ?? "ERROR"}]: ${event.errorMessage}`);
    console.error("  Make sure Claude CLI is installed and signed in:");
    console.error("    npm install -g @anthropic-ai/claude-code");
    console.error("    claude  (opens browser)\n");
    process.exit(1);
  }
  const text = event.content?.parts?.[0]?.text;
  if (text && !event.partial) response += text;
}

if (response.trim()) {
  console.log(`✓ KitanaLlm responded: "${response.trim()}"\n`);
  console.log("✓ Kitana is ready.");
  console.log("  Uncomment the KitanaLlm line in pickModel() to switch provider.\n");
} else {
  console.error("✗ No response received. Check your Claude CLI setup.\n");
  process.exit(1);
}
