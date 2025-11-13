#!/bin/bash

# Скрипт для получения логов Timeweb Apps
# Использует API токен из GitHub Secrets или переменной окружения

set -e

APP_ID="125051"
API_TOKEN="${TIMEWEB_API_TOKEN1:-${TIMEWEB_API_TOKEN}}"

if [ -z "$API_TOKEN" ]; then
    echo "❌ Ошибка: TIMEWEB_API_TOKEN1 не установлен"
    echo ""
    echo "Использование:"
    echo "  export TIMEWEB_API_TOKEN1=your_token"
    echo "  bash scripts/get-timeweb-logs.sh"
    exit 1
fi

echo "🔍 Получаем логи Timeweb Apps..."
echo ""

# Получаем runtime логи
echo "=== RUNTIME LOGS ==="
curl -s -X GET \
    "https://api.timeweb.cloud/api/v1/apps/${APP_ID}/logs?type=runtime&limit=100" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    | jq -r '.logs[]? | "\(.timestamp) | \(.level) | \(.message)"' 2>/dev/null \
    || echo "Не удалось получить логи (проверьте токен)"

echo ""
echo "=== APP STATUS ==="

# Получаем статус приложения
curl -s -X GET \
    "https://api.timeweb.cloud/api/v1/apps/${APP_ID}" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    | jq '{
        name: .name,
        status: .status,
        framework: .framework,
        env_vars: .env_vars | keys,
        domains: .domains,
        resources: .resources
    }' 2>/dev/null \
    || echo "Не удалось получить статус"

echo ""
echo "✅ Готово!"
