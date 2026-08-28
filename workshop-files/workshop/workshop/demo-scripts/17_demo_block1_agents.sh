#!/usr/bin/env bash
# Slide 17 — Block 1 hands-on (Tasks 1.1 and 1.2)
# Runs the finished SOLUTION files, not the participant starters — use
# this to show what "done" looks like, or as a working reference if a
# participant gets stuck.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "── hello-agent.ts (Task 1.1) ──────────────────────────"
npx tsx examples/01-adk/solution/hello-agent.ts

echo
echo "── tool-agent.ts (Task 1.2) ───────────────────────────"
npx tsx examples/01-adk/solution/tool-agent.ts
