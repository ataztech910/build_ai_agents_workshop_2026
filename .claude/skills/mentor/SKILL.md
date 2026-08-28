---
name: mentor
description: Presenter's live mentoring cheat-sheet for the "Build AI Agents from Scratch" GDG Linz workshop — setup checklist, check-in hints for stuck participants, and fixes for known live-demo failure modes. Use whenever the user (the presenter) asks for setup help, a hint for a stuck participant, or how to unblock a broken demo during or before the workshop.
user-invocable: true
---

# Workshop mentor cheat-sheet

You are helping the PRESENTER run this workshop live, not a participant.
Answer whatever specific question they ask (setup, "what's the hint for
task 1.2", "slide 24 demo won't run", timing) using the reference below —
don't dump the whole file back at them, pull out just what's relevant.

Repo root for all paths below: `workshop-files/workshop/workshop/` (code)
and `slides-app/` (slides + `speech-ru.md`, sibling repo at
`/Users/andrei/Desktop/branches/slides-app`).

---

## Full environment setup (from zero)

Walk through this top to bottom for a fresh machine — presenter's or a
participant's. Steps 1-3 are required for everything today; 4 and 5 are
optional (only needed if you or a participant wants the Kitana path
instead of Gemini, or wants to run the Close n8n demo).

### 1. Prerequisites

- **Node.js 18+** (this repo was built/tested on Node 24 — anything 18+
  should work). Check: `node --version`.
- **git**, to clone the repo.

### 2. Clone and install

```bash
git clone https://github.com/ataztech910/build_ai_agents_workshop_2026
cd build_ai_agents_workshop_2026/workshop-files/workshop/workshop
npm install
```

`npm install` pulls in `@google/adk`, `@kitana-sdk/adk`, `zod`, `dotenv`,
`tsx`, and the `adk` CLI (`npx adk web` / `npx adk run`) — nothing else to
install separately for the TypeScript track.

### 3. Gemini (the default provider — do this even if you also want Kitana)

```bash
cp .env.example .env
```

Then in the browser: **aistudio.google.com** → sign in with any Google
account → left sidebar "Get API key" → "Create API key" → pick any
project, **do not enable Cloud billing on it** (one click permanently
drops you out of the free tier). Paste the key into `.env` as
`GOOGLE_GENAI_API_KEY=...` — note the exact variable name, `@google/adk`
does not read `GOOGLE_API_KEY`.

Verify — one command checks Node version, `.env`, the key, and makes a
real Gemini call:

```bash
npm run check
# → ✓ Node ... / ✓ .env exists / ✓ GOOGLE_GENAI_API_KEY is set
# → ✓ Gemini responded: "OK"
# → You're ready for the workshop.
```

If this fails with a 503 on `gemini-flash-latest`-style errors, see
"Known live-demo failure modes" below — the code is already pinned to
`gemini-3.6-flash`, which is the fix for that specific outage.

### 4. Kitana (optional — Claude CLI subscription or Ollama, no API key)

Only needed if you want to demo/use the `KitanaLlm` branch of any
`pickModel()`. Two independent backends, Kitana tries Claude CLI first
and falls back to Ollama:

**Claude CLI path** (needs a Claude.ai Pro/Max/Team/Enterprise plan — Free
has no CLI access):
```bash
npm install -g @anthropic-ai/claude-code
claude   # run once, opens a browser, sign in
npm run check-kitana   # verifies the CLI responds
```

**Ollama path** (fully local, no account at all):
```bash
# install Ollama separately (ollama.com), then:
ollama pull llama3.2
```
If Kitana's Ollama fallback errors with `404 Not Found`, you don't have
the default model pulled — either pull `llama3.2`, or set
`OLLAMA_MODEL=<whatever you have>` in `.env` (check what's installed with
`ollama list`).

To actually use Kitana in a given file: open it, comment out the
`return "gemini-3.6-flash";` line in `pickModel()`, uncomment the
`KitanaLlm` line below it. Same pattern in every file — nothing else to
configure.

### 5. n8n (optional — only for the Close block's live demo)

No separate install step — `examples/03-closing/start-demo.sh` runs
`npx n8n start` itself, which downloads n8n on first run (slow — do this
once well before Close, not live).

### Presenter-specific extras

- Warm up before going live: `npm run check` once to confirm the Gemini
  key actually works before participants arrive.
- For Close: run `examples/03-closing/start-demo.sh` once ahead of
  time — first n8n boot is slow, don't do it live.
- Speech notes: `slides-app/speech-ru.md` (gitignored, not in the repo
  history — local only). Full Russian narration, split by block, with
  jokes and demo cues already placed.
- `lead-finder-v3/` (sibling dir, separate tool, own `package.json`) is
  reference-only — not part of the participant flow. Its own setup
  (`npm install`, `.env` from its own `.env.example`) is documented in
  `lead-finder-v3/README.md` if you want to actually demo a real social
  parser outside the workshop.

---

## Check-in hints (from the task docs, don't improvise different ones)

- **Task 1.1 (hello-agent):** "Who got a reply? For anyone with an empty
  output or an error — let's look at it together."
- **Task 1.2 (tool-agent):** look for `[tool called]` in the console output
  — without it, the model answered from its own knowledge instead of
  actually calling the tool (usually a vague `description` on the tool).
- **Task 1.3 (sequential):** confirm BOTH `[researcher]` and `[editor]`
  show up in the output — if only one, the `SequentialAgent`'s
  `subAgents` array is probably still empty or wrong order.
- **Task 2.1 (Lead Finder):** who has `leads_result.json` saved? If
  `⚠️ Pipeline did not complete` — almost always a JSON-contract problem in
  one agent's instruction (prose instead of strict JSON breaks the next
  agent's `{placeholder}`).
- **Task 4.1 (own agent):** 2-3 people show live, terminal or `adk web`.
  Frame it as "did it automate something real", not code quality.

---

## Known live-demo failure modes (already hit these once — don't re-debug from scratch)

- **Gemini `503 UNAVAILABLE` on `gemini-flash-latest`:** that alias was
  overloaded on Google's side; the code already defaults to the pinned
  `gemini-3.6-flash`, which worked when tested. If 503s resume even on the
  pinned model, that's a genuine Google outage, not a bug — fall back to
  Kitana for a live demo (`pickModel()` → uncomment the `KitanaLlm` line)
  or just wait a few minutes.
- **Model wraps JSON in a ```json fence:** `lead-finder.ts` already strips
  this (`stripCodeFence()`) — if you see raw fenced output in
  `leads_result.json` on an unmodified file, something regressed, don't
  assume it's expected.
- **A pipeline agent crashes with `Context variable not found`:** this
  means an earlier agent in the chain failed (provider hiccup, etc.) and
  the next agent's `{outputKey}` placeholder had nothing to resolve.
  `lead-finder.ts` already catches this and prints "Pipeline did not
  complete" instead of a raw stack trace — if a bare stack trace shows up
  instead, the file was reverted past that fix.
- **`.telegram_session` / real social parsers:** don't demo these live —
  intentionally not part of the plan (personal login/2FA required, not
  reliable on stage). If a participant asks, point at
  `lead-finder-v3/README.md`.
- **Kitana ToS nuance, if asked:** Kitana (CLI-subscription auth, no API
  key) is fine for a participant's own personal scripts — "ordinary
  individual use" per Anthropic's Claude Code docs. It's not meant to be
  pitched as an unconditionally-sanctioned free lunch — if someone asks
  about shipping a *product* that routes other people's requests through
  their own subscriptions, that's the scenario Anthropic's docs say should
  use API-key auth instead. Don't overclaim "no restrictions at all."

---

## Where the real content lives (don't duplicate it here, point at it)

- Full task instructions: `workshop-files/workshop/workshop/tasks/*.md`
- Full RU narration with jokes, block by block: `slides-app/speech-ru.md`
- Slide source (to check exact current wording/order):
  `slides-app/src/slides/exampleSlides.tsx`
- Timing/gap tracking from event-prep: `context/23-event-ad-gaps.md`
