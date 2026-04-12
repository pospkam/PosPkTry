#!/bin/bash
# Checks staged SQL/TS files for raw SQL queries and reminds to verify schema via MCP
staged=$(git -C /workspaces/PosPkTry diff --cached --name-only 2>/dev/null)
if echo "$staged" | grep -qE '\.(ts|tsx|sql)$'; then
  has_sql=$(git -C /workspaces/PosPkTry diff --cached -- '*.ts' '*.tsx' '*.sql' 2>/dev/null \
    | grep -iE '^\+.*(SELECT|FROM|JOIN|pool\.query|\.query)' | head -3)
  if [ -n "$has_sql" ]; then
    printf '{"systemMessage": "DB SCHEMA CHECK: В стейдже есть SQL-запросы. Проверил колонки через MCP postgres query? Угаданное имя колонки = битый прод."}'
  fi
fi
