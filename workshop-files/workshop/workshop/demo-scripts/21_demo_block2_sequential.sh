#!/usr/bin/env bash
# Slide 21 — Block 2 hands-on (Task 1.3 — SequentialAgent)
# Runs the finished SOLUTION file — researcher → editor pipeline.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

npx tsx examples/01-adk/solution/sequential.ts "quantum computers"
