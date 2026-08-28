/**
 * Skeleton: 1.1 — First LlmAgent
 * Task: examples/../tasks/01-adk.md
 */
import { config } from "dotenv";
import { LlmAgent, Runner, InMemorySessionService, StreamingMode } from "@google/adk";
import { Content } from "@google/genai";
import { KitanaLlm } from "@kitana-sdk/adk";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `dotenv/config`'s default .env lookup is relative to process.cwd() — fine
// for `npx tsx examples/01-adk/starter/hello-agent.ts` from the workshop root, but
// `adk web`/`adk run` set cwd to the agents_dir they were pointed at
// (examples/01-adk here), so the default lookup silently misses .env and
// MODEL=kitana never takes effect. Resolve relative to this file instead.
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

// Pick a model — uncomment ONE of the two lines below.
const model = "gemini-3.6-flash"; // ADK default — needs GOOGLE_GENAI_API_KEY in .env
// const model = new KitanaLlm({ model: "auto", models: { ollama: process.env.OLLAMA_MODEL } }); // Kitana — no API key, uses your Claude CLI subscription or Ollama

// export is required for `npx adk run <file>` and `npx adk web` (adk-devtools
// imports the file and looks for an exported LlmAgent/BaseAgent instance;
// without export it fails with "AgentFileLoadingError: No @google/adk BaseAgent
// class instance found").
//
// TODO: create the agent — this is the recipe for ANY LlmAgent, not just this one:
//   name         — unique identifier (shows up in logs/adk web)
//   model        — already wired above (Gemini or Kitana, via MODEL in .env)
//   instruction  — system prompt: what the agent IS and how it should behave.
//                  A contract, not a suggestion — see the experiment at the
//                  end of Wave 1 (remove it and see what changes).
//   tools        — optional: FunctionTool[] the agent is allowed to call
//                  (see examples/01-adk/starter/tool-agent.ts for that piece).
// Every agent you build today — this one, the weather one, the multi-agent
// pipeline — is this same shape with different values.
export const agent = new LlmAgent({
  name: "hello",
  model,
  instruction: "", // TODO: write the agent's instruction (in Russian — that's what we'll ask it in)
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
    parts: [{ text: "" }], // TODO: ask a question
  };

  // TODO: run the agent and print the answer
  // streamingMode: SSE — the model streams the answer in chunks (event.partial=true),
  // and at the end ADK always sends one final event with the FULL text
  // (event.partial=false) — that's its standard contract, not a Kitana quirk.
  // Printing both kinds of events would print the text twice.
  // sawPartial guards both cases: if streaming really did arrive in chunks,
  // the final event is simply skipped; if the model/provider didn't support
  // streaming and sent one partial=false answer right away — print it instead
  // of staying silent.
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
      // An error event (missing key, quota exhausted, etc.) has no
      // event.content — without this branch such errors pass silently
      // and the output just looks "empty", with no clue why.
      console.error(`❌ [${event.errorCode ?? "ERROR"}] ${event.errorMessage}`);
    }
  }
  // Without a trailing \n the cursor stays at the end of the answer line, and
  // npx's own spinner cleanup (writes straight to the terminal, bypassing the
  // captured stdout) wipes exactly that line on exit — looks like "the answer
  // appeared and then vanished".
  process.stdout.write("\n");
}

// Run main() always, EXCEPT when the file is loaded by `adk run`/`adk web`
// (adk-devtools imports it directly just to grab `agent` — main() must not
// run then, or the agent would fire twice). Comparing file paths directly
// (import.meta.url vs process.argv[1]) is unreliable — it diverges across
// symlinks (e.g. ~/Desktop synced via iCloud on Mac). The reliable signal is
// the binary we were actually launched with — for adk run/web that's always `adk`.
const isRunViaAdkCli = Boolean(process.argv[1]) && basename(process.argv[1]!) === "adk";
if (!isRunViaAdkCli) {
  main().catch(console.error);
}
