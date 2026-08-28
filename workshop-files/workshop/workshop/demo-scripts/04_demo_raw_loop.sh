#!/usr/bin/env bash
# Slide 4, Level 2 — agent loop: model decides → tool → result back → repeat → done.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash examples/00-raw/loop.sh
