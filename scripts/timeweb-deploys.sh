#!/usr/bin/env bash
# Timeweb Cloud — управление деплоями приложения
# Использование:
#   ./scripts/timeweb-deploys.sh list          — список последних деплоев
#   ./scripts/timeweb-deploys.sh stop <id>     — остановить деплой
#   ./scripts/timeweb-deploys.sh logs <id>     — логи деплоя
#   ./scripts/timeweb-deploys.sh status        — статус приложения
#
# Переменные окружения:
#   TIMEWEB_API_TOKEN — API-токен (обязательно)
#   TIMEWEB_APP_ID    — ID приложения (по умолчанию 159529)

set -euo pipefail

API="https://api.timeweb.cloud/api/v1"
TOKEN="${TIMEWEB_API_TOKEN:?Установите TIMEWEB_API_TOKEN (Timeweb Cloud -> Настройки -> API-токены)}"
APP_ID="${TIMEWEB_APP_ID:-175477}"

auth_header="Authorization: Bearer ${TOKEN}"
json_header="Content-Type: application/json"

case "${1:-help}" in

  list)
    echo "Деплои приложения ${APP_ID} (последние 20):"
    echo "---"
    curl -sS -H "${auth_header}" \
      "${API}/apps/${APP_ID}/deploys?limit=20&offset=0" \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
deploys = data.get('deploys', data.get('app_deploys', []))
if not deploys:
    print('  Деплоев не найдено')
    sys.exit(0)
for d in deploys:
    did = d.get('id', '?')
    status = d.get('status', '?')
    commit = d.get('commit_sha', d.get('commit', {}).get('sha', ''))[:8]
    created = d.get('created_at', '?')[:19]
    print(f'  #{did}  {status:<12}  {commit}  {created}')
"
    ;;

  stop)
    DEPLOY_ID="${2:?Укажите ID деплоя: ./scripts/timeweb-deploys.sh stop <deploy_id>}"
    echo "Останавливаю деплой #${DEPLOY_ID}..."
    curl -sS -X POST -H "${auth_header}" -H "${json_header}" \
      "${API}/apps/${APP_ID}/deploy/${DEPLOY_ID}/stop" \
    | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))"
    echo "Готово."
    ;;

  logs)
    DEPLOY_ID="${2:?Укажите ID деплоя: ./scripts/timeweb-deploys.sh logs <deploy_id>}"
    echo "Логи деплоя #${DEPLOY_ID}:"
    echo "---"
    curl -sS -H "${auth_header}" \
      "${API}/apps/${APP_ID}/deploy/${DEPLOY_ID}/logs" \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
logs = data.get('deploy_logs', data.get('logs', []))
for entry in logs:
    ts = entry.get('created_at', '')[:19]
    msg = entry.get('log', entry.get('message', ''))
    print(f'  [{ts}] {msg}')
" 2>/dev/null || echo "(не удалось получить логи)"
    ;;

  status)
    echo "Статус приложения ${APP_ID}:"
    echo "---"
    curl -sS -H "${auth_header}" \
      "${API}/apps/${APP_ID}" \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
app = data.get('app', data)
print(f'  Имя:    {app.get(\"name\", \"?\")}')
print(f'  Статус: {app.get(\"status\", \"?\")}')
print(f'  URL:    {app.get(\"domains\", [{}])[0].get(\"fqdn\", \"?\")}' if app.get('domains') else '  URL:    ?')
print(f'  Ветка:  {app.get(\"branch_name\", app.get(\"configuration\", {}).get(\"branch_name\", \"?\"))}')
print(f'  Framework: {app.get(\"framework\", app.get(\"configuration\", {}).get(\"framework\", \"?\"))}')
"
    ;;

  help|*)
    echo "Timeweb Cloud — управление деплоями"
    echo ""
    echo "Использование:"
    echo "  $0 list          — список деплоев"
    echo "  $0 stop <id>     — остановить деплой"
    echo "  $0 logs <id>     — логи деплоя"
    echo "  $0 status        — статус приложения"
    echo ""
    echo "Настройка:"
    echo "  1. Создайте API-токен: https://timeweb.cloud/my/api-keys"
    echo "  2. export TIMEWEB_API_TOKEN=your_token_here"
    echo "  3. Готово!"
    ;;
esac
