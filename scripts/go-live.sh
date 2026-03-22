#!/bin/bash
#scripts/go-live.sh
# Simple production deployment (no TypeScript wrapper hell)
#
# Usage: bash scripts/go-live.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                 KAMEN TAKING LIVE                                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check repo clean
echo "[1/4] Repo status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory not clean"
  git status --porcelain
  exit 1
fi
echo "✅ Clean"

# Type check
echo "[2/4] TypeScript check..."
if ! npx tsc --noEmit 2>/dev/null; then
  echo "❌ TS errors"
  exit 1
fi
echo "✅ OK"

# Push code
echo "[3/4] Pushing to main..."
git push origin main 2>/dev/null
echo "✅ Pushed"

# Summary
echo "[4/4] Done"
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "✅ CODE LIVE"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next: Apply migrations via API:"
echo ""
echo "curl -X POST https://tourhab.ru/api/admin/migrations/apply \\"
echo "  -H 'Authorization: Bearer \$ADMIN_JWT' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"migrations\": [\"054\", \"0645\", \"0646\", \"066\"]}'"
echo ""
echo "Or run setup locally:"
echo "  npx tsx scripts/setup-agent-irina.ts"
echo ""
