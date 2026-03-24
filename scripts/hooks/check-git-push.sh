#!/bin/bash
# Hook: Safety check before git push to main
# TourHab auto-deploys on push to main — this is a critical gate
# Runs as PreToolUse hook for Bash commands containing "git push"

INPUT=$(cat)

# Extract command from input
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"([^"]*)"' | head -1 | sed 's/"command"\s*:\s*"//;s/"$//')

# Only intercept git push commands
case "$COMMAND" in
  *"git push"*)
    ;;
  *)
    exit 0
    ;;
esac

# Check if pushing to main
if echo "$COMMAND" | grep -qE "git push.*(main|master|origin\s*$)"; then
  echo "GIT PUSH TO MAIN DETECTED"
  echo "TourHab auto-deploys on push to main (Timeweb Cloud)."
  echo ""

  # Check for TypeScript errors
  TSC_OUTPUT=$(cd /workspaces/PosPkTry && npx tsc --noEmit 2>&1)
  TSC_EXIT=$?
  if [ $TSC_EXIT -ne 0 ]; then
    echo "TypeScript errors found — push blocked:"
    echo "$TSC_OUTPUT" | head -20
    exit 1
  fi
  echo "TypeScript: OK (0 errors)"

  # Check for console.log in staged changes
  CONSOLE_LOGS=$(cd /workspaces/PosPkTry && git diff HEAD --name-only -- '*.ts' '*.tsx' 2>/dev/null | xargs grep -l "console\.\(log\|debug\)" 2>/dev/null | grep -v node_modules | grep -v __tests__ | grep -v .test. | grep -v .spec.)
  if [ -n "$CONSOLE_LOGS" ]; then
    echo "console.log found in changed files — push blocked:"
    echo "$CONSOLE_LOGS"
    exit 1
  fi
  echo "console.log check: OK"
  echo ""
  echo "Pre-push checks passed. Proceeding with deploy to production."
fi

exit 0
