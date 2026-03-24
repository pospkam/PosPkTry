#!/bin/bash
# Hook: Detect console.log in modified TypeScript/TSX files
# Runs as PostToolUse hook after Edit/Write operations
# Returns non-zero exit code with warning if console.log found

# Read the tool result from stdin (Claude Code passes JSON)
INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"([^"]+)"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check .ts and .tsx files
case "$FILE_PATH" in
  *.ts|*.tsx)
    ;;
  *)
    exit 0
    ;;
esac

# Skip test files and hook scripts
case "$FILE_PATH" in
  *__tests__*|*.test.*|*.spec.*|*scripts/hooks*)
    exit 0
    ;;
esac

# Check for console.log (excluding comments)
if [ -f "$FILE_PATH" ]; then
  MATCHES=$(grep -n "console\.\(log\|warn\|error\|debug\|info\)" "$FILE_PATH" 2>/dev/null | grep -v "^\s*//" | grep -v "// eslint-disable" | head -5)
  if [ -n "$MATCHES" ]; then
    echo "CONSOLE.LOG DETECTED in $FILE_PATH:"
    echo "$MATCHES"
    echo ""
    echo "Production code must not contain console.log (CLAUDE.md rule)."
    echo "Remove console statements or use proper error handling."
    exit 1
  fi
fi

exit 0
