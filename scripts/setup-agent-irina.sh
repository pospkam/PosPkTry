#!/bin/bash
# Setup Ирина agent account
# Usage: bash scripts/setup-agent-irina.sh

set -e

echo "🚀 Setting up Ирина (YaKamchatka) agent account..."

API_URL="${1:-http://localhost:3000}"
ADMIN_TOKEN="${2:-}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: ADMIN_TOKEN required"
  echo "Usage: bash scripts/setup-agent-irina.sh <API_URL> <ADMIN_TOKEN>"
  echo ""
  echo "Example:"
  echo "  bash scripts/setup-agent-irina.sh https://tourhab.ru <your-admin-jwt>"
  exit 1
fi

# Create agent user via admin API
echo ""
echo "📝 Creating agent account: kamlandinfo@yandex.ru..."

RESPONSE=$(curl -s -X POST "$API_URL/api/admin/users/create-agent" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kamlandinfo@yandex.ru",
    "name": "Ирина (YaKamchatka)",
    "temporary_password": "TempPass2026!"
  }')

echo "$RESPONSE" | jq .

# Extract user ID
USER_ID=$(echo "$RESPONSE" | jq -r '.data.user_id // empty')

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to create agent user"
  exit 1
fi

echo ""
echo "✅ Agent account created!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "User ID:    $USER_ID"
echo "Email:      kamlandinfo@yandex.ru"
echo "Password:   TempPass2026! (send to Ирина securely)"
echo "Login URL:  $API_URL/auth/signin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Next steps:"
echo "  1. Send login credentials to kamlandinfo@yandex.ru"
echo "  2. User logs in at $API_URL/auth/signin"
echo "  3. User changes password on first login"
echo "  4. Access hub at /hub/agent"
echo ""
