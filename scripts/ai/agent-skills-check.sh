#!/usr/bin/env bash
set -euo pipefail

# Safe wrapper around autoskills: verify Node engine first and run dry-run only.
NODE_VERSION_RAW="$(node -v 2>/dev/null || true)"
if [[ -z "$NODE_VERSION_RAW" ]]; then
  echo "Node.js не найден. Установите Node 22+ для autoskills."
  exit 1
fi

NODE_MAJOR="${NODE_VERSION_RAW#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"

if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "Текущий Node: $NODE_VERSION_RAW"
  echo "autoskills требует Node >=22.0.0"
  echo "Действие: переключите Node на 22+ и повторите: npm run ai:skills:check"
  exit 0
fi

echo "Node $NODE_VERSION_RAW подходит. Запускаю autoskills (dry-run, claude-code)..."
npx autoskills --dry-run -a claude-code
