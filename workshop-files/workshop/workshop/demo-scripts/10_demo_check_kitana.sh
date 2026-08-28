#!/usr/bin/env bash
# Slide 10 — "Kitana — Claude CLI, no API key"
# Verifies Claude CLI is installed and responds, so pickModel()'s
# KitanaLlm branch is known-good before relying on it live.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

npm run check-kitana
