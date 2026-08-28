# Closing — Real Conditions (n8n)

> ~25-30 min · presenter demo, participants don't write code

The final moment of the workshop: what you built today gets embedded into
a real process — not just answering in a chat, but working as links in an
automation chain orchestrated by n8n.

Three links, each either already built today or built once ahead of time
(not during the workshop):

```
[planner]  → decides which channel to scan (new agent, presenter-only)
    ↓
[data portal]  → returns real comments from the chosen channel (Block 3)
    ↓
[lead-finder]  → analyst → copywriter → validator (Block 3, already built)
    ↓
[n8n: Split Out → Sort → Set]  → groups and formats the final list
```

`planner` and `lead-finder` are two independent ADK agents behind two HTTP
endpoints. n8n calls both in sequence and processes the result between
them — no new TypeScript to write, all orchestration lives in n8n.

---

## Prep (before the workshop, not in front of participants)

Two `adk web` servers on different ports — the planner and Lead Finder
live in different folders, and `adk web` only serves files one level deep
inside the directory you point it at:

```bash
# Terminal 1
npx adk web examples/03-closing --port 8001
# → serves "planner"

# Terminal 2
npx adk web examples/02-api/solution --port 8000
# → serves "lead-finder"
```

Verify (swap `s1` for anything unique to the session):

```bash
curl -X POST http://localhost:8001/apps/planner/users/u1/sessions/s1 -d '{}'
curl -X POST http://localhost:8001/run -H "Content-Type: application/json" -d '{
  "appName": "planner", "userId": "u1", "sessionId": "s1",
  "newMessage": { "role": "user", "parts": [{ "text": "A course on automating business operations with AI, for small business owners drowning in manual admin work." }] }
}'
# → {"channel": "smallbiz", "reason": "..."}
```

`planner.ts` is a presenter-only agent (not something participants built):
given a business description, it picks one of three channels on the
training portal (`startups` / `smallbiz` / `productivity`). Same skeleton
as everywhere else — `pickModel()` toggle, Gemini by default. See
`examples/03-closing/planner.ts`.

**n8n — no Docker, via npx:**

```bash
npx n8n
# → http://localhost:5678
```

**Import the ready-made workflow** — no need to wire up 12 nodes by hand:
`examples/03-closing/n8n-workflow.json` → in n8n: Workflows → Import from
File → pick this file.

Verified live end to end: `npx n8n import:workflow --input=...`, then
`npx n8n execute --id=workshop-closing-demo-001` — a real run through both
`adk web` servers and the portal, reached the end
(`status: success`, `lastNodeExecuted: "Format Result"`), correctly
sorted and formatted offers on output. One gotcha from that run: the
exported JSON initially failed to import without a top-level `id` on the
workflow itself (not just on the nodes) — `SQLITE_CONSTRAINT:
NOT NULL constraint failed: workflow_entity.id` — already fixed in the
file.

---

## The n8n workflow — what each node does (if you're editing the import, or building it by hand)

**1. Manual Trigger** — "New business description"

**2. Set — `businessDescription`**
A text field with the business description/ICP (same idea as the `ICP`
participants use in `lead-finder.ts`), e.g.:
```
A course on automating business operations with AI, for small business
owners drowning in manual admin work.
```

**3. HTTP Request — create planner session**
`POST http://localhost:8001/apps/planner/users/u1/sessions/s1`, body `{}`

**4. HTTP Request — call planner**
`POST http://localhost:8001/run`
```json
{
  "appName": "planner",
  "userId": "u1",
  "sessionId": "s1",
  "newMessage": { "role": "user", "parts": [{ "text": "={{ $('Set').item.json.businessDescription }}" }] }
}
```

**5. Set/Code — extract `channel`**
The response arrives as an array of events; the text is at
`{{ $json[0].content.parts[0].text }}`, as a JSON string (may be wrapped
in a ```json fence — the planner adds it sometimes too, same as every
other agent today). Simple expression to pull out `channel`:
```js
JSON.parse($json[0].content.parts[0].text.replace(/```json\n?|```/g, '')).channel
```

**6. HTTP Request — fetch comments from the portal**
`GET https://workshop-data-portal.vercel.app/api/comments?channel={{ $json.channel }}`

**7. Set/Code — build the lead-finder prompt**
```js
`ICP: ${$('Set').item.json.businessDescription}\nComments: ${JSON.stringify($json.comments)}`
```

**8. HTTP Request — create lead-finder session**
`POST http://localhost:8000/apps/lead-finder/users/u1/sessions/s2`, body `{}`

**9. HTTP Request — call lead-finder**
`POST http://localhost:8000/run`
```json
{
  "appName": "lead-finder",
  "userId": "u1",
  "sessionId": "s2",
  "newMessage": { "role": "user", "parts": [{ "text": "={{ $json.prompt }}" }] }
}
```

**10. Code — parse the final offers**
Same code-fence-stripping idea as `stripCodeFence()` in `lead-finder.ts`:
```js
const text = $json[($json.length ?? 1) - 1].content.parts[0].text;
const clean = text.replace(/```json\n?|```/g, '').trim();
return JSON.parse(clean).offers.map(o => ({ json: o }));
```
This node's output is already one n8n item per offer (return array) — no
separate Split Out node needed.

**11. Sort — by `author`**
No numeric score survives into the final `offers` shape (only `analyst`'s
intermediate `top_leads` has `score`) — sort alphabetically by `author`.

**12. Set — final display**
Format each item into one readable block (or write to a Table/Sheet — skip
the real integration on stage, same reasoning as the single-agent version of
this demo: no live logins in front of the room).

---

## What we show live (5 final minutes out of 25-30)

1. Both `adk web` servers are already up and warmed up — open n8n, click
   **Execute Workflow**
2. The room watches the nodes light up one by one: planner picks a
   channel → the portal returns data → lead-finder runs its 3 agents →
   n8n sorts and formats the result
3. Show the final list — the exact same mechanics participants just wrote
   by hand, now running without a single human click

**Line to say:** *"None of this is new code — planner is the same
`LlmAgent` as everything today, lead-finder is what you just built. What's
new here is n8n, which calls both agents over HTTP and processes the
result between them."*

**Question for the room:** what would you automate first, if you had a
pipeline like this behind an HTTP endpoint?

## Quick round (in whatever time is left)

One question per person, short: *"What surprised you?"*

---

→ Done! Back to the general discussion.
