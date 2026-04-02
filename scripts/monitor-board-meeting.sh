#!/bin/bash

# Live Production Status Monitor
# Отслеживает статус board meeting на prod в реальном времени

PROD_URL="${TOURHAB_URL:-https://tourhab.ru}"
ADMIN_JWT="${ADMIN_JWT:-}"

if [ -z "$ADMIN_JWT" ]; then
  echo "⚠️ ADMIN_JWT не установлен"
  echo "Попытаюсь читать debug endpoint без авторизации..."
  JWT_HEADER=""
else
  JWT_HEADER="-H \"Authorization: Bearer $ADMIN_JWT\""
fi

echo ""
echo "🔴 LIVE PRODUCTION MONITOR"
echo "=================================================="
echo "URL: $PROD_URL"
echo "Started: $(date)"
echo ""

LAST_EVENT_COUNT=0
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  # Получи статус
  if [ -n "$ADMIN_JWT" ]; then
    DEBUG=$(curl -s "$PROD_URL/api/agents/board-meeting/debug" \
      -H "Authorization: Bearer $ADMIN_JWT" 2>&1)
  else
    DEBUG=$(curl -s "$PROD_URL/api/agents/board-meeting/debug" 2>&1)
  fi

  # Парс статуса
  BUFFER_SIZE=$(echo "$DEBUG" | jq '.stats.buffer_size' 2>/dev/null || echo "null")
  EVENTS=$(echo "$DEBUG" | jq '.stats.events_by_type' 2>/dev/null || echo "{}")

  if [ "$BUFFER_SIZE" != "null" ] && [ "$BUFFER_SIZE" != "" ]; then
    # Есть данные
    AGENT_DONE=$(echo "$EVENTS" | jq '.agent_done // 0' 2>/dev/null || echo "0")
    OBSERVER_DONE=$(echo "$EVENTS" | jq '.observer_done // 0' 2>/dev/null || echo "0")
    PROPOSALS=$(echo "$EVENTS" | jq '.proposal // 0' 2>/dev/null || echo "0")
    DONE=$(echo "$EVENTS" | jq '.done // 0' 2>/dev/null || echo "0")
    DEBUG_MSGS=$(echo "$EVENTS" | jq '.debug // 0' 2>/dev/null || echo "0")

    # Покажи прогресс
    printf "⏱  %3ds | 📊 Events: %d | " $ELAPSED $BUFFER_SIZE

    if [ "$AGENT_DONE" != "0" ]; then
      printf "✓ Agents: %s " "$AGENT_DONE"
    fi

    if [ "$OBSERVER_DONE" != "0" ]; then
      printf "✓ Observers: %s " "$OBSERVER_DONE"
    fi

    if [ "$PROPOSALS" != "0" ]; then
      printf "✓ Proposals: %s " "$PROPOSALS"
    fi

    if [ "$DONE" != "0" ]; then
      printf "✓ DONE"
      echo ""
      echo ""
      echo "=================================================="
      echo "✅ BOARD MEETING COMPLETED"
      echo "=================================================="

      # Покажи финальный отчет
      if [ -n "$ADMIN_JWT" ]; then
        echo ""
        echo "📊 Final Statistics:"
        curl -s "$PROD_URL/api/agents/board-meeting/debug" \
          -H "Authorization: Bearer $ADMIN_JWT" | jq '.stats, .events[-5:]'
      fi

      break
    fi

    echo ""

  else
    # Нет доступа или ошибка
    if [ $ELAPSED -lt 5 ]; then
      printf "⏱  %3ds | ⏳ Waiting for data...\n" $ELAPSED
    else
      printf "⏱  %3ds | ⚠️  No data yet (check auth/url)\n" $ELAPSED
    fi
  fi

  # Таймаут после 5 минут
  if [ $ELAPSED -gt 300 ]; then
    echo ""
    echo "❌ TIMEOUT: No completion after 5 minutes"
    break
  fi

  sleep 1
done

echo ""
echo "Monitor stopped at: $(date)"
