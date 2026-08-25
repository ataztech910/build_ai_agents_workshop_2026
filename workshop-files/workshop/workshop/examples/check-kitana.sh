#!/usr/bin/env bash
# Verifies that Kitana (via Claude CLI) is ready to use.
# Run from the workshop root: bash examples/check-kitana.sh

set -euo pipefail

ok()  { echo "   ✓ $*"; }
fail(){ echo "   ✗ $*" >&2; }

echo ""
echo "1) Checking Claude CLI..."
if ! command -v claude &>/dev/null; then
  fail "claude not found"
  echo ""
  echo "   Install it:"
  echo "     npm install -g @anthropic-ai/claude-code"
  echo "   Then sign in:"
  echo "     claude"
  echo ""
  exit 1
fi
ok "claude $(claude --version 2>/dev/null || echo '(version unknown)')"

echo ""
echo "2) Running a test prompt..."
RESPONSE=$(claude -p "Reply with exactly the word: OK" 2>/dev/null || true)
if [[ "$RESPONSE" == *"OK"* ]]; then
  ok "Claude CLI responded: $RESPONSE"
else
  fail "Unexpected response: ${RESPONSE:-(empty)}"
  echo ""
  echo "   If you see an auth error, run 'claude' to sign in."
  echo "   Claude CLI requires a Pro, Max, Team, or Enterprise subscription."
  echo ""
  exit 1
fi

echo ""
echo "✓ Kitana is ready."
echo "  Uncomment the KitanaLlm line in pickModel() to use it."
echo ""
