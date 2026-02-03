#!/bin/bash
# Деплой на Timeweb Cloud через API
# Использование: ./scripts/deploy.sh

set -e

echo "🚀 Деплой Kamhub на Timeweb Cloud"

# Проверка токена
if [ -z "$TIMEWEB_API_TOKEN" ]; then
  if [ -f ".env.mcp" ]; then
    export TIMEWEB_API_TOKEN=$(grep TIMEWEB_API_TOKEN .env.mcp | cut -d= -f2)
  fi
fi

if [ -z "$TIMEWEB_API_TOKEN" ]; then
  echo "❌ TIMEWEB_API_TOKEN не установлен"
  exit 1
fi

APP_ID="151757"
API_URL="https://api.timeweb.cloud/api/v1/apps/$APP_ID"

# Проверка статуса
echo "📊 Проверка статуса..."
STATUS=$(curl -s -H "Authorization: Bearer $TIMEWEB_API_TOKEN" "$API_URL" | jq -r '.app.status')
echo "   Текущий статус: $STATUS"

if [ "$STATUS" = "deploy" ]; then
  echo "⏳ Деплой уже в процессе"
  exit 0
fi

# Запуск деплоя
echo "🔄 Запуск деплоя..."
RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TIMEWEB_API_TOKEN" "$API_URL/deploy")

if echo "$RESPONSE" | jq -e '.app' > /dev/null 2>&1; then
  echo "✅ Деплой запущен!"
  echo "🔗 URL: https://pospk-kamhub-c8e0.twc1.net"
else
  echo "❌ Ошибка: $RESPONSE"
  exit 1
fi
