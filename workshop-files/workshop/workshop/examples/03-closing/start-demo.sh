#!/usr/bin/env bash
# Closing demo — starts everything needed for the n8n pipeline demo:
#   - adk web for planner (port 8001)
#   - adk web for lead-finder (port 8000)
#   - n8n (port 5678)
# Run this once BEFORE the workshop starts, so everything is warm by Close.
# Ctrl+C stops all three cleanly.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSHOP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/.demo-logs"
mkdir -p "$LOG_DIR"

PIDS=()

cleanup() {
  echo ""
  echo "Stopping demo services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "Stopped."
}
trap cleanup EXIT INT TERM

cd "$WORKSHOP_ROOT"

echo "Starting planner (adk web, :8001)..."
npx adk web examples/03-closing --port 8001 > "$LOG_DIR/planner.log" 2>&1 &
PIDS+=($!)

echo "Starting lead-finder (adk web, :8000)..."
npx adk web examples/02-api/solution --port 8000 > "$LOG_DIR/lead-finder.log" 2>&1 &
PIDS+=($!)

echo "Importing n8n workflow (safe to re-run — re-imports the same workflow id)..."
npx n8n import:workflow --input="$SCRIPT_DIR/n8n-workflow.json" > "$LOG_DIR/n8n-import.log" 2>&1 || \
  echo "⚠️  n8n import failed — check $LOG_DIR/n8n-import.log (workflow may already be there, that's fine)"

echo "Starting n8n (:5678)..."
npx n8n start > "$LOG_DIR/n8n.log" 2>&1 &
PIDS+=($!)

echo ""
echo "Waiting for adk web servers to come up..."
for i in $(seq 1 30); do
  planner_ok=$(curl -s http://localhost:8001/list-apps 2>/dev/null | grep -c planner || true)
  leadfinder_ok=$(curl -s http://localhost:8000/list-apps 2>/dev/null | grep -c lead-finder || true)
  if [ "$planner_ok" -gt 0 ] && [ "$leadfinder_ok" -gt 0 ]; then
    break
  fi
  sleep 1
done

if [ "$planner_ok" -eq 0 ] || [ "$leadfinder_ok" -eq 0 ]; then
  echo "⚠️  adk web didn't come up in time — check $LOG_DIR/planner.log / lead-finder.log"
else
  echo "✅ planner   → http://localhost:8001  ($(curl -s http://localhost:8001/list-apps))"
  echo "✅ lead-finder → http://localhost:8000  ($(curl -s http://localhost:8000/list-apps))"
fi

echo ""
echo "n8n is starting in the background — first boot can take ~10-20s."
echo "Once it's up: http://localhost:5678"
echo "  Workflow 'Closing Demo — Lead Pipeline' is already imported."
echo "  Open it, click 'Execute Workflow' once now to warm it up / verify."
echo ""
echo "Everything is running. Press Ctrl+C to stop planner, lead-finder, and n8n."
echo ""

wait
