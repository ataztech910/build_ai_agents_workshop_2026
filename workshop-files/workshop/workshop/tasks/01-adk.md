# Block 1 & 2 — Google ADK basics
> ~55 min total (Block 1 ~25 min, Block 2 ~30 min) · no API keys required · ADK only

---

## 1.1 Your first LlmAgent

**Steps:**

1. Open `examples/01-adk/starter/hello-agent.ts`
2. Run it **as-is first** — `instruction` is empty, so is the question. Note what you see in the terminal.

```bash
npx tsx examples/01-adk/starter/hello-agent.ts
# → empty output, or a generic "Hi, how can I help?"
```

3. Fill in `instruction` — what the agent can do, how it should behave
4. Fill in `parts[{ text: "..." }]` — ask it something specific
5. Run again and compare. Instruction is a contract, not a hint.

**Result:** the agent answers your question in the terminal.

```bash
npx tsx examples/01-adk/starter/hello-agent.ts
# → agent: "Hi! I'm your first ADK agent..."
```

> **✋ Check-in:** who got a reply? For anyone with an empty output or an error — let's look at it together.

Skeleton: `examples/01-adk/starter/hello-agent.ts`

---

## 1.2 FunctionTool — an agent with a tool

**Steps:**

1. Open `examples/01-adk/starter/tool-agent.ts`
2. Fill in `description` and `execute` on `weatherTool` — return fake weather data
3. Write the `instruction` — tell the agent to use the tool for weather questions
4. Add `weatherTool` to `tools: []`
5. Fill in `main()`: copy the loop structure from `hello-agent.ts` (it's the same), ask about a city

**Result:** `[tool called] getWeather({ city: "Moscow" })` shows up in the logs.

```bash
npx tsx examples/01-adk/starter/tool-agent.ts
# → [tool called] getWeather({ city: "Moscow" })
# → agent: "It's 18°C and cloudy in Moscow right now"
```

**Break it, then fix it:** remove `weatherTool` from `tools: []` and run again.
The agent will still answer — but it'll make the data up instead of calling the tool.
Put the tool back: that's the difference between "the agent knows" and "the agent calls".

> **✋ Check-in:** who has `[tool called]` in their logs? Without it, the tool isn't wired up.

Skeleton: `examples/01-adk/starter/tool-agent.ts`

---

## 1.3 SequentialAgent — two agents in a chain

**Steps:**

1. Open `examples/01-adk/starter/sequential.ts`
2. Write the **researcher agent**: takes a topic, returns **strict JSON** `{ "facts": ["...", "...", "..."] }` — no surrounding text, JSON only
3. Write the **editor agent**: takes the facts, rewrites them into one paragraph
4. Add both to `subAgents: []`
5. Run with the topic `"quantum computers"`

**Result:** the facts print first in the terminal, then the finished paragraph.

```bash
npx tsx examples/01-adk/starter/sequential.ts "quantum computers"
# → [researcher] { "facts": [...] }
# → [editor] "Quantum computers use..."
```

**Notice:** the researcher returns strictly-formatted JSON — the editor depends
on that contract. If the researcher returns prose instead of JSON, the editor
gets garbage. This exact principle — agent A hands off strict JSON, agent B
reads a specific field from it — is the foundation for Block 3.

> **✋ Check-in:** who has BOTH agents in their output — `[researcher]` and `[editor]`?

Skeleton: `examples/01-adk/starter/sequential.ts`

---

## 1.4 ParallelAgent — bonus ⚡

**Steps:**

1. Open `examples/01-adk/starter/parallel.ts`
2. Fill in agent A and agent B — each with its own **fixed** topic in `instruction`

> Why is the topic fixed in the instruction instead of passed in at runtime?
> `ParallelAgent` sends the **same** request to all sub-agents at once —
> there's no mechanism to give A one thing and B another at runtime. The
> topic has to be part of the agent's own contract.

3. Add both to `subAgents: []`
4. Uncomment the three lines in `main()` — sequential run, then parallel run
5. Compare the time with `console.time`

**Result:** both agents run at the same time, the time difference is noticeable.

> On Gemini and Kitana/claude — real parallelism (network calls). On Ollama
> (a local model) there's no speedup — one physical GPU/CPU serves both
> requests one after another anyway, that's expected, not a bug.

Skeleton: `examples/01-adk/starter/parallel.ts`

---

→ Next: [tasks/02-api.md](./02-api.md) — and don't forget the 25-minute break first
