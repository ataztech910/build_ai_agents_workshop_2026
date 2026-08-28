# Workshop: AI Agents from Scratch

**Stack:** Google ADK → API providers → Kitana SDK
**Format:** in-person, ~2h45, technical audience

---

**One core idea for the whole workshop:**
> Agent = model + instruction + (optionally) tools.
> Everything else is orchestration: who hands the result to whom, and in what shape.

You'll see this idea at every step — from the hello-agent to a three-link pipeline.

---

```
Intro                       ~10 min (presenter)
  What an agent is, why ADK, workshop plan

Block 1 — first agent       ~25 min
  7 min live-coding (presenter) + 18 min participants write code
  LlmAgent → FunctionTool (tasks 1.1 and 1.2)

Block 2 — pipeline          ~30 min
  10 min experiment (one agent vs several) + 5 min live-coding + 15 min participants
  SequentialAgent, (bonus: ParallelAgent) (tasks 1.3 and 1.4)

  ── BREAK 25 minutes ───────────────────────

Block 3 — Lead Finder       ~30 min
  8 min live demo (presenter) + 17 min participants + 5 min adk web
  Real data, three agents in a pipeline (task 2.1)

Block 4 — your own agent    ~20 min
  15 min writing from scratch + 5 min showing

Closing                     ~25 min (presenter)
  planner → data portal → lead-finder → n8n
  Orchestration via adk web's HTTP API, no code to write
```

Throughout every block you can switch the model to Kitana — no API key at
all, just a Claude CLI subscription or Ollama. It's one line in every
skeleton: uncomment the `KitanaLlm` variant instead of the default Gemini.

---

**For facilitators:** work from the back — let everyone go at their own
pace, and walk the room catching up anyone who's stuck. Rule of thumb: 1
facilitator per ~7 participants. Every task has a ✋ marker — a moment for
a short group check-in.

---

## Repo structure:

```
tasks/
  index.md          ← you are here
  01-adk.md         ← Block 1 and Block 2 (tasks 1.1-1.4)
  02-api.md         ← Block 3 (task 2.1)
  04-own-agent.md   ← Block 4 (task 4.1)
  03-closing.md     ← Closing (n8n), no code to write
examples/
  01-adk/
    starter/        ← skeletons for Block 1 and 2 (write here)
    solution/       ← finished agents for self-checking
  02-api/
    starter/        ← skeletons for Block 3 (write here)
    solution/       ← finished agents for self-checking
  03-closing/
    planner.ts      ← Closing demo, presenter-only, participants don't write this
```

## Rules

- Write directly in the skeleton, `examples/*/starter/FILE_NAME.ts` — fill in the TODOs in place
- Only look at `examples/*/solution/` if you've been stuck for more than 5 minutes (or don't want to solve it yourself)
- Always run with: `npx tsx examples/*/starter/FILE_NAME.ts`
- The same file also opens via `adk web examples/*/starter` — see the agent in your browser

---

→ Start with [tasks/01-adk.md](./01-adk.md)
