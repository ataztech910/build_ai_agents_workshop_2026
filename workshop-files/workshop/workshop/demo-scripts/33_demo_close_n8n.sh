#!/usr/bin/env bash
# Slide 33 — "n8n: nodes lighting up one by one" (Close)
# Thin wrapper around examples/03-closing/start-demo.sh — starts planner
# (adk web :8001), lead-finder (adk web :8000), and n8n (:5678) with the
# workflow pre-imported. Ctrl+C stops all three.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash examples/03-closing/start-demo.sh
