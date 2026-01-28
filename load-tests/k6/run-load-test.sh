#!/bin/bash

# ========================================
# 🚀 k6 Load Test Runner Script
# ========================================

set -e

echo "🚀 K6 Load Testing for KamHub Support Pillar"
echo "=========================================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Installing..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        echo "Please install k6 manually from https://k6.io/docs/getting-started/installation"
        exit 1
    fi
fi

# Variables
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token-$(date +%s)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Script: $SCRIPT_DIR/support-pillar.js"
echo ""

# Run the test
echo "Starting load test..."
echo ""

k6 run \
  --vus 10 \
  --duration 1m \
  -e BASE_URL="$BASE_URL" \
  -e AUTH_TOKEN="$AUTH_TOKEN" \
  --out csv="$SCRIPT_DIR/results.csv" \
  "$SCRIPT_DIR/support-pillar.js"

echo ""
echo "✅ Load test completed!"
echo ""
echo "Results saved to: $SCRIPT_DIR/results.csv"
echo ""
echo "To view more detailed results, open the CSV file with a spreadsheet application"
