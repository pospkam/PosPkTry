#!/bin/bash
# scripts/setup-telegram-admin-bot.sh
# Configure private admin bot webhook on Timeweb
#
# Usage: bash scripts/setup-telegram-admin-bot.sh <bot_token> [owner_id]
#
# Example:
#   bash scripts/setup-telegram-admin-bot.sh <your_bot_token> 833478813

set -e

BOT_TOKEN="${1:-}"
OWNER_ID="${2:-833478813}"
DOMAIN="tourhab.ru"
WEBHOOK_URL="https://${DOMAIN}/api/telegram/admin"
SECRET_TOKEN="kh-admin-webhook-2026"

if [ -z "$BOT_TOKEN" ]; then
  echo "Usage: bash scripts/setup-telegram-admin-bot.sh <bot_token> [owner_id]"
  echo ""
  echo "Example:"
  echo "  bash scripts/setup-telegram-admin-bot.sh <your_bot_token> 833478813"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           TELEGRAM ADMIN BOT SETUP                                ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Extract bot username
BOT_USERNAME=$(echo "$BOT_TOKEN" | cut -d: -f2- | md5sum | cut -c1-15)

echo "Configuration:"
echo "  Bot token: ${BOT_TOKEN:0:20}..."
echo "  Owner ID: $OWNER_ID"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Secret: $SECRET_TOKEN"
echo ""

# 1. Delete existing webhook
echo "[1/3] Cleaning up old webhook..."
DELETE_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" \
  -H "Content-Type: application/json" \
  -d '{}')

DELETE_OK=$(echo "$DELETE_RESPONSE" | grep -o '"ok"\s*:\s*true' || echo "")
if [ -n "$DELETE_OK" ]; then
  echo "  ✓ Old webhook removed"
else
  echo "  ⚠ Could not delete (likely didn't exist)"
fi

# 2. Set new webhook
echo "[2/3] Registering webhook..."
SET_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${SECRET_TOKEN}\",
    \"max_connections\": 40,
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }")

SET_OK=$(echo "$SET_RESPONSE" | grep -o '"ok"\s*:\s*true' || echo "")
if [ -n "$SET_OK" ]; then
  echo "  ✓ Webhook registered"
else
  echo "  ❌ Failed to register webhook:"
  echo "  $SET_RESPONSE"
  exit 1
fi

# 3. Verify
echo "[3/3] Verifying configuration..."
INFO_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")

WEBHOOK_INFO=$(echo "$INFO_RESPONSE" | grep -o '"url"\s*:\s*"[^"]*"' || echo "")
PENDING=$(echo "$INFO_RESPONSE" | grep -o '"pending_update_count"\s*:\s*[0-9]*' || echo "")

echo "  $WEBHOOK_INFO"
echo "  $PENDING"
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "✅ TELEGRAM ADMIN BOT CONFIGURED"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Send /start to bot"
echo "  2. Verify with /stats"
echo "  3. Monitor /health"
echo ""
echo "Environment variables (set on Timeweb):"
echo "  TELEGRAM_ADMIN_BOT_TOKEN=$BOT_TOKEN"
echo "  TELEGRAM_OWNER_ID=$OWNER_ID"
echo ""
