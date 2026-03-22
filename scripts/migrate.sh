#!/bin/bash
# scripts/migrate.sh
# Simple SQL migration runner (no TypeScript overhead)
#
# Usage: bash scripts/migrate.sh [--dry-run]

set -e

DRY_RUN="${1:-false}"
MIGRATIONS_DIR="./migrations"

echo "Applying migrations from $MIGRATIONS_DIR..."

# Database connection from env
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  exit 1
fi

# Create schema_migrations table if not exists
if [ "$DRY_RUN" != "--dry-run" ]; then
  psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(20) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  " 2>/dev/null || true
fi

# Find and apply pending migrations
for migration_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
  filename=$(basename "$migration_file")
  version="${filename%_*}"

  # Check if already applied
  ALREADY_APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null || echo "0")

  if [ "$ALREADY_APPLIED" -gt "0" ]; then
    echo "  ✓ $filename (already applied)"
    continue
  fi

  if [ "$DRY_RUN" == "--dry-run" ]; then
    echo "  → $filename (would apply)"
  else
    echo "  Applying $filename..."

    # Read and execute migration
    SQL=$(cat "$migration_file")

    if psql "$DATABASE_URL" -c "$SQL" > /dev/null 2>&1; then
      # Mark as applied
      psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$version');" > /dev/null
      echo "  ✓ $filename"
    else
      echo "  ✗ $filename FAILED"
      exit 1
    fi
  fi
done

echo ""
echo "✓ Migrations complete"
