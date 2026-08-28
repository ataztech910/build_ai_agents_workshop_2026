/**
 * One command to confirm you're ready for the workshop: Node version,
 * .env present with a real key, and a live Gemini call actually works.
 * Run from the workshop root:  npm run check
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

console.log("\nChecking your workshop environment...\n");

let ok = true;

// 1. Node version
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 18) {
  console.log(`✓ Node ${process.versions.node} (>= 18 required)`);
} else {
  console.error(`✗ Node ${process.versions.node} — need 18 or newer`);
  ok = false;
}

// 2. .env exists
if (!existsSync(envPath)) {
  console.error("✗ No .env file found");
  console.error("  Fix:  cp .env.example .env   (then fill in GOOGLE_GENAI_API_KEY)\n");
  process.exit(1);
}
console.log("✓ .env exists");

// 3. Key is present and not the placeholder
config({ path: envPath });
const key = process.env.GOOGLE_GENAI_API_KEY;
if (!key || key === "AIzaSy...") {
  console.error("✗ GOOGLE_GENAI_API_KEY is missing or still the placeholder value");
  console.error("  Get a free key: aistudio.google.com → \"Get API key\"");
  console.error("  Then set GOOGLE_GENAI_API_KEY=... in .env\n");
  process.exit(1);
}
console.log("✓ GOOGLE_GENAI_API_KEY is set");

// 4. A real call actually works
console.log("\nCalling Gemini to confirm the key works...\n");

const { LlmAgent, Runner, InMemorySessionService } = await import("@google/adk");

const agent = new LlmAgent({
  name: "env-check",
  model: "gemini-3.6-flash",
  instruction: "Reply with exactly the word: OK. Nothing else.",
});

const sessionService = new InMemorySessionService();
const runner = new Runner({ agent, appName: "env-check", sessionService });
const session = await sessionService.createSession({ appName: "env-check", userId: "u" });

let response = "";
for await (const event of runner.runAsync({
  userId: "u",
  sessionId: session.id,
  newMessage: { role: "user", parts: [{ text: "Say OK" }] },
})) {
  if (event.errorMessage) {
    console.error(`✗ Gemini call failed [${event.errorCode ?? "ERROR"}]: ${event.errorMessage}`);
    console.error("  Double-check the key in .env, and that Cloud billing isn't blocking the free tier.\n");
    process.exit(1);
  }
  const text = event.content?.parts?.[0]?.text;
  if (text && !event.partial) response += text;
}

if (response.trim()) {
  console.log(`✓ Gemini responded: "${response.trim()}"\n`);
  console.log(ok ? "You're ready for the workshop." : "Fix the issues above, then re-run: npm run check");
} else {
  console.error("✗ No response received from Gemini.\n");
  process.exit(1);
}
