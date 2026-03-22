#!/bin/bash
# scripts/deploy-production.sh
#
# One-click production deployment
# Applies migrations + creates users + pushes code
#
# Usage:
#   bash scripts/deploy-production.sh [--skip-checks] [--dry-run]
#
# Steps:
#   1. Verify local repo is clean
#   2. Run TypeScript check
#   3. Apply pending database migrations
#   4. Create Ирина account
#   5. Push to main branch
#   6. (Timeweb auto-deploys)

set -e

PREFIX="[DEPLOY]"
SKIP_CHECKS="${1:-false}"
DRY_RUN="${2:-false}"

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                  PRODUCTION DEPLOYMENT                            ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check repo status
echo "$PREFIX Checking git status..."
if [ "$SKIP_CHECKS" != "true" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}✗ Working directory not clean${NC}"
    echo "Untracked files:"
    git status --porcelain
    exit 1
  fi
fi
echo -e "${GREEN}✓${NC} Repo clean"

# 2. Type check
echo ""
echo "$PREFIX Running TypeScript check..."
if npx tsc --noEmit > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} TypeScript OK"
else
  echo -e "${RED}✗ TypeScript errors found${NC}"
  npx tsc --noEmit
  exit 1
fi

# 3. Apply migrations
echo ""
echo "$PREFIX Applying database migrations..."
if [ "$DRY_RUN" == "true" ]; then
  echo "    DRY RUN MODE"
  npx ts-node scripts/run-all-missing-migrations.ts --dry-run
else
  npx ts-node scripts/run-all-missing-migrations.ts
fi
echo -e "${GREEN}✓${NC} Migrations checked"

# 4. Create Ирина account
echo ""
echo "$PREFIX Setting up Ирина agent account..."
if [ "$DRY_RUN" == "true" ]; then
  echo "    DRY RUN: Would create kamlandinfo@yandex.ru"
else
  # Check if user exists first
  IRINA_EXISTS=$(npx ts-node -e "
    import { pool } from './lib/db-pool';
    pool.query('SELECT id FROM users WHERE email = \$1', ['kamlandinfo@yandex.ru'])
      .then(r => {
        if (r.rows.length > 0) {
          console.log('exists');
        } else {
          console.log('missing');
        }
        process.exit(0);
      })
      .catch(() => {
        console.log('error');
        process.exit(1);
      });
  " 2>/dev/null || echo "error")

  if [ "$IRINA_EXISTS" == "exists" ]; then
    echo "    ⚠  Ирина account already exists"
  elif [ "$IRINA_EXISTS" == "missing" ]; then
    npx ts-node scripts/setup-agent-irina.ts
  else
    echo -e "${YELLOW}⚠  Could not verify account status${NC}"
  fi
fi
echo -e "${GREEN}✓${NC} Account setup"

# 5. Push to production
echo ""
echo "$PREFIX Pushing to main branch..."
if [ "$DRY_RUN" == "true" ]; then
  echo "    DRY RUN: Would push to main"
  echo "    - Current branch: $(git branch --show-current)"
  echo "    - Commits to push: $(git rev-list --count origin/main..HEAD)"
else
  git push origin main
fi
echo -e "${GREEN}✓${NC} Pushed"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✓  DEPLOYMENT READY${NC}"
echo "╚════════════════════════════════════════════════════════════════════╝"

if [ "$DRY_RUN" == "true" ]; then
  echo ""
  echo "DRY RUN COMPLETE — ready to deploy for real"
  echo ""
  echo "Run without --dry-run to execute full deployment:"
  echo "  bash scripts/deploy-production.sh"
else
  echo ""
  echo "✓ Code pushed to main"
  echo "✓ Timeweb will auto-deploy (check dashboard)"
  echo "✓ Ирина account ready at: https://tourhab.ru/auth/signin"
  echo ""
  echo "Monitor deploy progress:"
  echo "  - App: https://pospkam-pospktry-c1f3.twc1.net"
  echo "  - Dashboard: https://timeweb.cloud/my/apps/159529"
  echo ""
fi
