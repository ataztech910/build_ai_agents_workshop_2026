#!/usr/bin/env bash
# Level 2: agent loop — model decides which tool to call each turn
#
# Tools available to the model:
#   write_data: <text>   — append a line to data.txt
#   read_data            — read data.txt contents
#   done: <answer>       — finish with final answer
#
# Run:  bash examples/00-raw/loop.sh
# Goal: bash examples/00-raw/loop.sh "your goal here"

GOAL="${1:-Generate 3 concrete AI agent use cases from daily work, save each one to data.txt, then read them back and write a one-line summary}"

DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_FILE="$DIR/data.txt"
rm -f "$DATA_FILE"

TOOLS='You are an agent. You have exactly 3 tools. Reply with ONE line per turn — no explanation, no extra text:
  write_data: <text>   — appends a line to data.txt
  read_data            — reads the current contents of data.txt
  done: <answer>       — finishes with your final answer'

HISTORY="Goal: $GOAL"

echo ""
echo "→ Goal: $GOAL"
echo ""

for turn in $(seq 1 10); do
  RESPONSE=$(claude -p "$TOOLS

$HISTORY

Next action:")

  echo "[$turn] $RESPONSE"

  if [[ "$RESPONSE" == done:* ]]; then
    echo ""
    echo "✓ ${RESPONSE#done: }"
    echo ""
    echo "data.txt:"
    cat "$DATA_FILE" 2>/dev/null || echo "(empty)"
    exit 0

  elif [[ "$RESPONSE" == write_data:* ]]; then
    TEXT="${RESPONSE#write_data: }"
    echo "$TEXT" >> "$DATA_FILE"
    HISTORY="$HISTORY
[turn $turn] write_data: $TEXT → saved"

  elif [[ "$RESPONSE" == "read_data" ]]; then
    CONTENT=$(cat "$DATA_FILE" 2>/dev/null || echo "(empty)")
    echo "   → $CONTENT"
    HISTORY="$HISTORY
[turn $turn] read_data → $CONTENT"

  else
    HISTORY="$HISTORY
[turn $turn] (unexpected response: $RESPONSE)"
  fi

  echo ""
done

echo "! reached max turns"
