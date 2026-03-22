#!/bin/bash
# Fast apply error handling wrapper to all agencies
# This wraps the entire run() method in try/catch

TARGET_AGENCIES=(
  "legal-agency.ts"
  "security-agency.ts"
  "hacker-agency.ts"
  "rescue-agency.ts"
  "eco-agency.ts"
  "content-auditor-agency.ts"
  "quality-agency.ts"
  "evolution-agency.ts"
)

echo "Scanning agencies for error handling patterns..."
for agency in "${TARGET_AGENCIES[@]}"; do
  path="lib/agents/agencies/$agency"
  if [ ! -f "$path" ]; then
    echo "❌ $agency not found"
    continue
  fi

  # Check if run() has try/catch
  if grep -q "async run.*Promise.*AgencyResult" "$path"; then
    if grep -A 200 "async run" "$path" | grep -q "  } catch"; then
      echo "✅ $agency: already protected"
    else
      echo "⚠️  $agency: NEEDS error handling on run()"
    fi
  fi
done

echo ""
echo "RECOMMENDATION:"
echo "Wrap each agency's run() method with:"
echo ""
echo "  async run(intent: string, context: AgentContext): Promise<AgencyResult> {"
echo "    try {"
echo "      // existing code"
echo "    } catch (err) {"
echo "      return {"
echo "        response: \`Error: \${err instanceof Error ? err.message : String(err)}\`,"
echo "        data: {},"
echo "      };"
echo "    }"
echo "  }"
