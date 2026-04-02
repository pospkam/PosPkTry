#!/bin/bash
set -e

# Board Meeting Diagnostic Test Runner
# Full real-time monitoring + execution diagnostics
# Usage:
#   export TOURHAB_URL="https://tourhab.ru"
#   export CRON_SECRET="your_secret"
#   export ADMIN_JWT="your_jwt"
#   ./scripts/test-board-meeting.sh

PROD_URL="${TOURHAB_URL:-https://tourhab.ru}"
CRON_SECRET="${CRON_SECRET:-}"
ADMIN_JWT="${ADMIN_JWT:-}"

if [ -z "$CRON_SECRET" ] && [ -z "$ADMIN_JWT" ]; then
  echo "❌ Error: Set CRON_SECRET or ADMIN_JWT"
  echo ""
  echo "Usage:"
  echo "  export CRON_SECRET='sk-...'"
  echo "  export ADMIN_JWT='eyJ...'"
  echo "  ./scripts/test-board-meeting.sh"
  exit 1
fi

echo ""
echo "🚀 Board Meeting Diagnostic Test Runner"
echo "=================================================="
echo ""
echo "⚙️ Configuration:"
echo "  PROD_URL: $PROD_URL"
echo "  Using: ${ADMIN_JWT:+ADMIN_JWT}${CRON_SECRET:+CRON_SECRET}"
echo ""

# ── Step 0: Preflight Check ────────────────────────────────
echo "📋 Step 0: Preflight Check (AI providers + DB)"
echo ""

if [ -n "$ADMIN_JWT" ]; then
  PREFLIGHT=$(curl -s "$PROD_URL/api/agents/board-meeting/preflight" \
    -H "Authorization: Bearer $ADMIN_JWT" 2>&1 || echo '{"status":"error"}')
else
  PREFLIGHT='{"status":"skipped","message":"JWT required for preflight"}'
fi

echo "$PREFLIGHT" | jq '.' 2>/dev/null || echo "$PREFLIGHT"
echo ""

echo ""
echo "Waiting 2s..."
sleep 2

# ── Step 1: Clear Debug Buffer ────────────────────────────
echo ""
echo "🧹 Step 1: Clear Debug Buffer"
curl -s "$PROD_URL/api/agents/board-meeting/debug?format=clear" | jq '.'

echo ""
echo "Waiting 2s..."
sleep 2

# ── Step 2: Start Live Monitor (background) ────────────────
echo ""
echo "📡 Step 2: Starting Live Monitor (background SSE stream)"
echo "  → Logs: /tmp/board-meeting-monitor.log"
echo ""

# Start monitor in background
(
  curl -s "$PROD_URL/api/agents/board-meeting/debug?format=stream" &
  MONITOR_PID=$!
  trap "kill $MONITOR_PID 2>/dev/null; echo 'Monitor stopped'" EXIT

  # Keep alive for 5 minutes
  sleep 300
) > /tmp/board-meeting-monitor.log 2>&1 &

MONITOR_PID=$!
sleep 1

# ── Step 3: Trigger Board Meeting ───────────────────────────
echo "🎯 Step 3: Trigger Board Meeting"
echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

if [ -n "$CRON_SECRET" ]; then
  echo "  Using CRON_SECRET method..."
  RESPONSE=$(curl -s "$PROD_URL/api/cron/board-meeting?secret=$CRON_SECRET" | jq '.')
else
  echo "  Using ADMIN_JWT method..."
  RESPONSE=$(curl -s -X POST "$PROD_URL/api/agents/board-meeting" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{"topic":"Diagnostic Test Run"}' | jq '.' || echo '{"error":"POST failed"}')
fi

echo "$RESPONSE"

MEETING_ID=$(echo "$RESPONSE" | jq -r '.meeting_id // .success' 2>/dev/null || echo "unknown")
echo ""
echo "  Meeting ID: $MEETING_ID"
echo ""

# ── Step 4: Poll Debug Buffer ──────────────────────────────
echo "⏳ Step 4: Polling Debug Buffer (30 seconds)"
echo ""

POLL_COUNT=0
while [ $POLL_COUNT -lt 30 ]; do
  DEBUG=$(curl -s "$PROD_URL/api/agents/board-meeting/debug" | jq '.')

  BUFFER_SIZE=$(echo "$DEBUG" | jq '.stats.buffer_size')
  EVENTS_BY_TYPE=$(echo "$DEBUG" | jq '.stats.events_by_type')

  echo "  [$((POLL_COUNT+1))/30] Buffer size: $BUFFER_SIZE | Events: $(echo "$EVENTS_BY_TYPE" | jq -c '.')"

  # Check if meeting is done
  if echo "$DEBUG" | jq -e '.events[] | select(.type=="done")' > /dev/null 2>&1; then
    echo ""
    echo "✅ Meeting completed!"
    break
  fi

  POLL_COUNT=$((POLL_COUNT + 1))
  sleep 1
done

echo ""
echo "=================================================="
echo "📊 Final Debug Report"
echo ""

curl -s "$PROD_URL/api/agents/board-meeting/debug" | jq '.stats'

echo ""
echo "📋 Last 10 Events:"
curl -s "$PROD_URL/api/agents/board-meeting/debug" | jq '.events[-10:] | .[] | {timestamp, type, stage: .data.stage, duration_ms: .data.duration_ms}'

echo ""
echo "=================================================="
echo "✨ Test Complete"
echo ""
echo "💡 Next Steps:"
echo "  1. Check errors in events"
echo "  2. Review /tmp/board-meeting-monitor.log for SSE stream"
echo "  3. Check production logs on Timeweb:"
echo "     tail -f /var/log/pospktry/app.log"
echo ""

# Cleanup
kill $MONITOR_PID 2>/dev/null || true
