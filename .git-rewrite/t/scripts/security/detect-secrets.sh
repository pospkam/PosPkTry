#!/bin/bash

# ========================================
# 🔐 Secrets Detection Baseline Generator
# ========================================

echo "🔐 Generating secrets detection baseline..."
echo ""

# Install detect-secrets if not present
if ! command -v detect-secrets &> /dev/null; then
    echo "Installing detect-secrets..."
    pip install detect-secrets || npm install -g detect-secrets
fi

# Create baseline
echo "Creating .secrets.baseline..."
detect-secrets scan \
    --baseline .secrets.baseline \
    --all-files \
    --force-use-all-plugins \
    --exclude-files ".git/*" \
    --exclude-files "node_modules/*" \
    --exclude-files ".next/*" \
    --exclude-files "coverage/*" \
    --exclude-files "build/*" \
    --exclude-files "dist/*"

echo ""
echo "✅ Baseline created at .secrets.baseline"
echo ""
echo "To use this baseline, run:"
echo "  detect-secrets-hook --baseline .secrets.baseline"
echo ""
echo "To audit the baseline:"
echo "  detect-secrets audit .secrets.baseline"
