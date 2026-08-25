#!/usr/bin/env bash
# Level 1: single call — no ADK, no SDK, just claude -p
# Run: bash examples/00-raw/call.sh
# Run with custom prompt: bash examples/00-raw/call.sh "Your question here"

PROMPT="${1:-What is an AI agent? One sentence.}"

echo ""
echo "→ Prompt: $PROMPT"
echo ""

claude -p "$PROMPT" | tee answer.txt

echo ""
echo "→ Answer saved to answer.txt"
