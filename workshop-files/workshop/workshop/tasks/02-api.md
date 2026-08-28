
# Block 3 — Lead Finder

> ~30 min · pulling in real data, not just a stub

---

## The idea behind this block

**This isn't about which LLM answers** — you already switch model/provider
in Block 1 via `pickModel()` (the Gemini/Kitana toggle), and it still works
here.

**This is about getting REAL data from an external API into the pipeline**
— instead of a hardcoded array. `pickComments()` in the `lead-finder.ts`
skeleton is the same toggle pattern as `pickModel()`, just switching the
data source instead of the model:

- by default — `FAKE_COMMENTS`, nothing to configure
- uncomment the `fetch(DATA_PORTAL_URL + ...)` variant — pulls real data
  from the training portal (`workshop-data-portal.vercel.app`), no login or
  keys, same response shape a real parser would return
- for a real social platform — same pattern, three legitimate options in
  `lead-finder-v3/parsers/` (all official APIs, not scraping):
  - **Telegram** — `telegram-parser.ts`'s `parseChannel()`, needs your own
    `TG_API_ID`/`TG_API_HASH` from my.telegram.org and an interactive
    phone/2FA login on first run
  - **YouTube** — `parsers/youtube.ts`'s `parseYouTube()`, the official
    YouTube Data API v3, just needs a `YT_API_KEY` from Google Cloud Console
  - **Reddit** — `parsers/reddit.ts`'s `parseReddit()`, the official Reddit
    API via an OAuth "script" app (`reddit.com/prefs/apps`)

  We don't demo any of these live at the workshop (personal credentials +
  login isn't for the stage), but the code is real and working, same
  `ParseResult` shape as the portal — just point `pickComments()` at your
  own source.

**About routing/failover between providers:** there's no separate task for
this — you already see it in action here. `pickModel()` uses Kitana's
`chain` under the hood, and if one provider fails (say Claude times out on
the third agent), the router automatically switches to the next one — no
pipeline interruption, no code on your end.

---

## The outputKey pattern — how agents hand data to each other

In Block 1/2, `SequentialAgent` by default gives every next agent **the
entire accumulated history** — as the pipeline grows the prompt grows with
it, and can outrun a provider's timeout (we actually hit this on Kitana
with the third agent).

The skeleton uses a different pattern:

```text
analyst    → outputKey: "topLeads"     saves its answer to session.state["topLeads"]
copywriter → instruction: "...{topLeads}..."   reads only the field it needs
             includeContents: "none"   doesn't get the full conversation history
validator  → same idea, with {offers}
```

Specifically: `{topLeads}` in the instruction text isn't just a
placeholder. ADK substitutes it with the value of
`session.state["topLeads"]` before every call. The agent gets **only its
own field from state**, not the entire prior conversation.

This is the same strict-JSON contract you saw in 1.3 — just now between
agents via state, instead of raw text handoff.

---

## Prep

```bash
# A key is only needed if you want to run through the real Gemini API instead
# of Kitana — the data source itself (FAKE_COMMENTS / portal / real parser)
# doesn't depend on the key.
GOOGLE_GENAI_API_KEY=AIza...        # free: aistudio.google.com
```

---

## 2.1 The real case — Lead Finder pipeline

Open `examples/02-api/starter/lead-finder.ts`.

### Step 1 — break it first

Add only `analyst` to `subAgents: [analyst]` and run with an empty
`instruction`. See what the agent returns — most likely prose, not JSON.
The pipeline won't reach the end:

```bash
npx tsx examples/02-api/starter/lead-finder.ts
# → [analyst] "Sure! Here are some leads..." (prose, not JSON)
# → ⚠️  Pipeline did not complete — last agent: "analyst", not validator
```

### Step 2 — the JSON contract

Fill in the analyst's `instruction` with an explicit contract:
`"return ONLY JSON: { top_leads: [...] }"`. Run again — you should see
clean JSON instead of prose.

### Step 3 — the full pipeline

1. Write `copywriter` and `validator` with their instructions
2. Add all three to `subAgents: [analyst, copywriter, validator]`
3. Confirm the pipeline reaches the end and saves `leads_result.json`
4. Uncomment the portal in `pickComments()` and run again on real data

**Instruction reference:**

- **analyst** — takes the ICP and a list of comments, returns `{ "top_leads": [{ "author", "username", "score", "reason", "key_quote" }] }`
- **copywriter** — reads `{topLeads}` from state, writes a personalized offer for each: `{ "offers": [{ "author", "message", "hook", "cta" }] }`
- **validator** — reads `{offers}`, rejects templated ones and rewrites them: same `{ "offers": [...] }` shape plus an optional `"rewrite_note"`

**Result:** three agents process the comments in sequence, ending in
validated offers.

```bash
npx tsx examples/02-api/starter/lead-finder.ts
# → [analyst] { "top_leads": [...] } ...
# → [copywriter] { "offers": [...] } ...
# → [validator] { "offers": [...] } ...
# → 💾 Saved: leads_result.json
```

**Experiment:** change the `ICP` and run again. The agent will pick
different people out of the same comments.

> **✋ Check-in:** who has `leads_result.json` saved?
> If `⚠️ Pipeline did not complete` — most likely a JSON-contract problem in one of the agents.

Skeleton: `examples/02-api/starter/lead-finder.ts`

---

→ Next: [tasks/04-own-agent.md](./04-own-agent.md) — Block 4, write your own agent
