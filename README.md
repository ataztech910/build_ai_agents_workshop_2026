# Build AI Agents from Scratch

Workshop materials for the "Build AI Agents from Scratch" hands-on session
(GDG Linz) — building agents with Google ADK, from a single `LlmAgent`
to a multi-step pipeline that pulls in real data.

## Where to start

```bash
cd workshop-files/workshop/workshop
npm install
cp .env.example .env   # add your Gemini API key
npm run check           # verifies your setup end to end
```

Then open [`workshop-files/workshop/workshop/tasks/index.md`](workshop-files/workshop/workshop/tasks/index.md)
and follow along block by block.

## Layout

- `workshop-files/workshop/workshop/` — the workshop itself: `tasks/*.md`
  (instructions per block) and `examples/` (starter skeletons + solutions)
- `workshop-files/lead-finder-v3/` — reference-only: a standalone tool
  showing how to pull comments from real platforms (Telegram, YouTube,
  Reddit) instead of the training portal's fake data
