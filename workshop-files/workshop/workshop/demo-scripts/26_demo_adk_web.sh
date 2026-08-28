#!/usr/bin/env bash
# Slide 26 — "Agent graph in the browser"
# Opens the Lead Finder pipeline in adk web — shows the agent graph and
# lets you run a request from the browser.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

npx adk web examples/02-api/starter
