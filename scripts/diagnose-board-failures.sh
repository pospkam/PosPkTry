#!/bin/bash
# scripts/diagnose-board-failures.sh
# Quick diagnostic for why board meeting agents failed

echo "════════════════════════════════════════════"
echo "BOARD MEETING AGENT DIAGNOSTIC"
echo "════════════════════════════════════════════"
echo ""

# Check 1: Required migrations
echo "✓ Checking migration files..."
REQUIRED_MIGRATIONS=(
  "031_leads.sql"
  "038_page_views.sql"
  "039_leads_source_data.sql"
  "045_migrate_to_operator_tours.sql"
  "050_octo_api.sql"
  "052_agent_experiments.sql"
  "053_user_agreements.sql"
)

MISSING=0
for mig in "${REQUIRED_MIGRATIONS[@]}"; do
  if [ -f "lib/database/migrations/$mig" ]; then
    echo "  ✅ $mig"
  else
    echo "  ❌ MISSING: $mig"
    MISSING=$((MISSING+1))
  fi
done

# Check 2: Agency code health
echo ""
echo "✓ Checking agency code..."
AGENCIES=(
  "admin-agency.ts"
  "legal-agency.ts"
  "security-agency.ts"
  "hacker-agency.ts"
  "rescue-agency.ts"
  "eco-agency.ts"
  "content-auditor-agency.ts"
  "quality-agency.ts"
  "evolution-agency.ts"
)

for agency in "${AGENCIES[@]}"; do
  POOL_QUERIES=$(grep -c "pool.query" "lib/agents/agencies/$agency" 2>/dev/null || echo "0")
  ERROR_HANDLING=$(grep -c "catch\|\.catch" "lib/agents/agencies/$agency" 2>/dev/null || echo "0")

  if [ "$ERROR_HANDLING" -lt 1 ] && [ "$POOL_QUERIES" -gt 0 ]; then
    echo "  ⚠️  $agency: $POOL_QUERIES queries, NO error handling!"
  elif [ "$POOL_QUERIES" -eq 0 ]; then
    echo "  ✅ $agency: no DB queries"
  else
    echo "  ✅ $agency: $POOL_QUERIES queries with error handling"
  fi
done

# Check 3: Test compilation
echo ""
echo "✓ TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "  ❌ Compilation errors found"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -5
else
  echo "  ✅ All files compile"
fi

echo ""
echo "════════════════════════════════════════════"
echo "SUMMARY:"
echo "  Missing migrations: $MISSING"
echo "  Compilation errors: check above"
echo "  Root cause likely: Missing tables + no error handling"
echo ""
echo "NEXT: Run migration 053+ and add try/catch to agencies"
echo "════════════════════════════════════════════"
