# Block 4 — Build your own agent

> ~20 min · 15 min writing, 5 min showing

---

## 4.1 Write an agent for your own task

**Assignment (one sentence):**

> Take a task from your own work that you currently do by hand. Write an agent for it. 15 minutes.

---

**How to pick a task:**

- Repeating, not a one-off
- Has a clear input and expected output
- Narrow enough to fit in 15 minutes

Stuck on what to pick? Answer this: *"Three things I do by hand every week and hate doing."*
Pick one of them.

---

**What's already in your toolkit:**

- `LlmAgent` — model + instruction (enough for most tasks)
- `FunctionTool` — if the agent needs an external tool
- `SequentialAgent` — if the task splits into clear steps

**Starting point:** copy `examples/01-adk/starter/hello-agent.ts` or `tool-agent.ts` as a base and adapt it.

```bash
cp examples/01-adk/starter/hello-agent.ts examples/my-agent.ts
npx tsx examples/my-agent.ts
```

The `pickModel()` toggle works the same as everywhere else — one line to switch providers.

---

**Result:** a working agent for your real task. Not perfect — working.

---

**✋ Check-in (5 min):** 2-3 people show what they got — live, their own terminal or `adk web`.
Not about perfect code — did you manage to automate a real piece of your work?
