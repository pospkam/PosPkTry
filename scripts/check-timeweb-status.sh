#!/bin/bash

# Скрипт проверки статуса Timeweb Apps
# Использование: ./check-timeweb-status.sh YOUR_API_TOKEN

set -e

TOKEN="${1:-$TIMEWEB_TOKEN1}"

if [ -z "$TOKEN" ]; then
  echo "❌ Ошибка: Токен не указан"
  echo "Использование: $0 YOUR_API_TOKEN"
  echo "Или: export TIMEWEB_TOKEN1=your_token && $0"
  exit 1
fi

APP_ID="125051"

echo "================================================"
echo "🔍 ПРОВЕРКА TIMEWEB APPS"
echo "================================================"
echo ""

# 1. Статус приложения
echo "📊 1. СТАТУС ПРИЛОЖЕНИЯ"
echo "------------------------------------------------"
STATUS=$(curl -s "https://api.timeweb.cloud/api/v1/apps/$APP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$STATUS" | jq '{
  "Статус": .app.status,
  "Ветка": .app.branch,
  "Коммит": .app.commit_sha,
  "Время запуска": .app.start_time,
  "Framework": .app.framework
}'

echo ""

# 2. Переменные окружения
echo "⚙️  2. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ"
echo "------------------------------------------------"
ENVS=$(echo "$STATUS" | jq '.app.envs')

if [ "$ENVS" = "{}" ] || [ "$ENVS" = "null" ]; then
  echo "❌ ПРОБЛЕМА: Переменные окружения ПУСТЫЕ!"
  echo ""
  echo "Нужно добавить:"
  echo "  - NODE_ENV=production"
  echo "  - PORT=8080"
  echo "  - JWT_SECRET=kamchatour-super-secret-key-2025-production"
  echo "  - NEXTAUTH_URL=https://pospk-kamhub-70c4.twc1.net"
  echo "  - NEXT_PUBLIC_API_URL=https://pospk-kamhub-70c4.twc1.net/api"
  echo "  - SKIP_SENTRY=true"
else
  echo "✅ Переменные найдены:"
  echo "$ENVS" | jq 'to_entries | .[] | "  \(.key) = \(.value)"' -r
  
  # Проверяем обязательные переменные
  echo ""
  echo "🔍 Проверка обязательных переменных:"
  
  for var in NODE_ENV PORT JWT_SECRET; do
    VALUE=$(echo "$ENVS" | jq -r ".$var")
    if [ "$VALUE" = "null" ] || [ -z "$VALUE" ]; then
      echo "  ❌ $var - ОТСУТСТВУЕТ"
    else
      echo "  ✅ $var = $VALUE"
    fi
  done
fi

echo ""

# 3. Runtime логи
echo "📋 3. RUNTIME ЛОГИ (последние 20 строк)"
echo "------------------------------------------------"
LOGS=$(curl -s "https://api.timeweb.cloud/api/v1/apps/$APP_ID/logs?type=runtime&limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

LOG_COUNT=$(echo "$LOGS" | jq '.app_logs | length')

if [ "$LOG_COUNT" = "0" ]; then
  echo "⚠️  ЛОГИ ПУСТЫЕ - приложение не запускалось или не логирует"
else
  echo "Найдено строк: $LOG_COUNT"
  echo ""
  echo "$LOGS" | jq -r '.app_logs[] | "\(.timestamp) | \(.message)"' | tail -20
fi

echo ""

# 4. Build логи
echo "🔨 4. BUILD ЛОГИ (последние 10 строк)"
echo "------------------------------------------------"
BUILD_LOGS=$(curl -s "https://api.timeweb.cloud/api/v1/apps/$APP_ID/logs?type=build&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BUILD_COUNT=$(echo "$BUILD_LOGS" | jq '.app_logs | length')

if [ "$BUILD_COUNT" = "0" ]; then
  echo "⚠️  BUILD ЛОГИ ПУСТЫЕ"
else
  echo "Найдено строк: $BUILD_COUNT"
  echo ""
  echo "$BUILD_LOGS" | jq -r '.app_logs[] | "\(.timestamp) | \(.message)"' | tail -10
fi

echo ""

# 5. Проверка доступности сайта
echo "🌐 5. ПРОВЕРКА ДОСТУПНОСТИ"
echo "------------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://pospk-kamhub-70c4.twc1.net/api/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Сайт доступен (HTTP $HTTP_CODE)"
  curl -s "https://pospk-kamhub-70c4.twc1.net/api/health" | jq '.'
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ Сайт недоступен (HTTP 404)"
  echo "   Причина: Приложение не запустилось или неправильный маршрут"
else
  echo "❌ Сайт недоступен (HTTP $HTTP_CODE)"
fi

echo ""
echo "================================================"
echo "✅ ПРОВЕРКА ЗАВЕРШЕНА"
echo "================================================"
