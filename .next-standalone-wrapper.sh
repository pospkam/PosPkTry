#!/bin/bash
# Wrapper script для запуска Next.js standalone

echo "🚀 Starting Next.js Standalone Server..."
echo "Working directory: $(pwd)"
echo "Contents:"
ls -la

if [ -f ".next/standalone/server.js" ]; then
    echo "✅ Found .next/standalone/server.js"
    cd .next/standalone
    echo "📂 Changed to: $(pwd)"
    echo "PORT: ${PORT:-8080}"
    exec node server.js
else
    echo "❌ .next/standalone/server.js not found!"
    echo "Looking for alternatives..."
    find . -name "server.js" -o -name "next"
    exit 1
fi
