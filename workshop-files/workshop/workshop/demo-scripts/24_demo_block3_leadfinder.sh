#!/usr/bin/env bash
# Slide 24 — "What we're watching" (Block 3 live demo)
# Step 1: run on FAKE_COMMENTS (default state, no edits needed).
# Step 2/3: NOT automated on purpose — uncommenting the portal fetch in
# pickComments() is a multi-line edit; doing it live in the editor is
# safer on stage than a sed toggle that could leave the file broken
# mid-demo. This script pauses and tells you exactly what to do.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "── Step 1 · FAKE_COMMENTS (default) ───────────────────"
npx tsx examples/02-api/solution/lead-finder.ts
echo
cat leads_result.json
echo

echo "── Step 2 ──────────────────────────────────────────────"
echo "Now open examples/02-api/solution/lead-finder.ts, in pickComments():"
echo "  - comment out:   return FAKE_COMMENTS;"
echo "  - uncomment the fetch(DATA_PORTAL_URL...) block below it"
echo
read -p "Press Enter once that's done, to run Step 3..." _

echo
echo "── Step 3 · same command, real data from the portal ───"
npx tsx examples/02-api/solution/lead-finder.ts
echo
cat leads_result.json
