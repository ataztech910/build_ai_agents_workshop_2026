#!/usr/bin/env bash
# Slide 4, Level 1 — single call, no loop, no tools.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash examples/00-raw/call.sh
echo
bash examples/00-raw/call.sh "What is an AI agent?"
