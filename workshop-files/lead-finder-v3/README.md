# Lead Finder v3 — AI Agents Workshop

Four sources, one pipeline. Change `SOURCE=` in `.env` — everything else works the same.

## Sources

| SOURCE | Library | What you need | Difficulty |
|---|---|---|---|
| `telegram` | gramjs (MTProto) | API ID + Hash at [my.telegram.org](https://my.telegram.org) | ⭐ |
| `youtube` | YouTube Data API v3 | API Key at [console.cloud.google.com](https://console.cloud.google.com) | ⭐ |
| `reddit` | snoowrap | App credentials at [reddit.com/prefs/apps](https://reddit.com/prefs/apps) | ⭐⭐ |
| `instagram` | Playwright + stealth | Instagram account login/password | ⭐⭐ |

> Twitter/X removed — paid since February 2026 (~$100/mo).
>
> **Instagram is not recommended for the workshop.** Telegram/YouTube/Reddit are official APIs.
> Instagram isn't an official API — logging in with your own password + intercepting GraphQL +
> `puppeteer-extra-plugin-stealth` to dodge anti-bot detection — this violates Instagram's
> terms of service. The code works and stays in the repo, but we don't demo it on stage or
> present it as a recommended option.

---

## Quick start

```bash
# 1. Dependencies
npm install
npm run install-browsers   # downloads Chromium for Playwright

# 2. Claude Code (subscription tokens, not the API)
npm install -g @anthropic-ai/claude-code
claude login

# 3. Config
cp .env.example .env
# Pick a SOURCE= and fill in that block

# 4. Run
npm start

# Parser only (no Claude):
npm run parse-only
```

---

## How the Instagram parser works

> ⚠️ See the warning above — not recommended for the workshop, violates Instagram's ToS.

Playwright opens a real Chromium browser, logs into Instagram, and intercepts GraphQL requests while scrolling through comments.

```
Playwright (Chromium + stealth)
  → login → instagram.com/p/POST/
  → scroll comments
  → intercept GraphQL /graphql/query → extract JSON
  → build Comment[]
```

**First run** — Playwright will ask you to wait while it logs in. The session is saved to `instagram_session.json`, no need to log in again.

**If you have 2FA** — run with `IG_HEADLESS=false` in `.env`, a visible browser opens, enter the code manually.

**Stealth** — `playwright-extra` + `puppeteer-extra-plugin-stealth` disguise the browser as a regular user. Without stealth, Instagram blocks headless Chromium quickly.

---

## Project structure

```
pipeline.ts              — orchestrator (analyst + copywriter)
parsers/
  index.ts               — router based on SOURCE=
  types.ts               — shared Comment / ParseResult format
  youtube.ts             — YouTube Data API v3
  reddit.ts              — snoowrap
  instagram.ts           — Playwright + GraphQL interception
telegram-parser.ts       — gramjs (Telegram)
.env.example             — config template
instagram_session.json   — Instagram session (don't commit!)
.telegram_session        — Telegram session (don't commit!)
```

---

## Workshop tasks

**1 — Switch source**
Change `SOURCE=` in `.env`. Compare lead quality — which audience is "hotter"?

**2 — Set the ICP**
In `pipeline.ts` find the `ICP` constant and describe your real customer.

**3 — Change the tone**
`OFFER_TONE=expert` or `OFFER_TONE=direct`.

**4 — Add a validator**
After the copywriter, add `stepValidate()` — it rejects templated offers.

**5 — Parallel analysis**
Replace the sequential `stepAnalyze()` with `Promise.all()` over the comments.

---

## Gitignore

```
.env
instagram_session.json
.telegram_session
leads_*.json
node_modules/
```
