#!/bin/bash

# =============================================================================
# 🔄 СКРИПТ ДЛЯ ЗАМЕНЫ ИМПОРТОВ AUTH МОДУЛЯ
# =============================================================================

echo "🔍 Поиск импортов из lib/auth..."
echo ""

# Найти все файлы с импортами из @/lib/auth
echo "📊 РЕЗУЛЬТАТЫ ПОИСКА:"
echo "===================="
echo ""

# Поиск в TypeScript файлах
echo "1️⃣ Импорты из @/lib/auth/jwt:"
grep -r "from '@/lib/auth" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -E "(jwt|middleware|check-admin)" | head -20

echo ""
echo "2️⃣ Общие импорты из @/lib/auth:"
grep -r "from '@/lib/auth" --include="*.ts" --include="*.tsx" . 2>/dev/null | wc -l

echo ""
echo "📝 ПРИМЕР ЗАМЕНЫ:"
echo "===================="
echo ""
echo "ДО:"
echo "  import { createToken } from '@/lib/auth/jwt';"
echo ""
echo "ПОСЛЕ:"
echo "  import { createToken } from '@core-infrastructure/lib/auth';"
echo ""

echo "🔧 ПРОЦЕДУРА ЗАМЕНЫ:"
echo "===================="
echo ""
echo "Используйте 'Find and Replace' в VS Code:"
echo ""
echo "1. Нажмите Ctrl+H (или Cmd+H на Mac)"
echo "2. В поле 'Find' введите: from '@/lib/auth"
echo "3. В поле 'Replace' введите: from '@core-infrastructure/lib/auth"
echo "4. Нажмите 'Replace All'"
echo ""
echo "ИЛИ используйте sed (только для проверки):"
echo ""
echo "  grep -r \"from '@/lib/auth\" --include=\"*.ts\" --include=\"*.tsx\" ."
echo ""

echo "✅ ПОСЛЕ ЗАМЕНЫ:"
echo "===================="
echo ""
echo "Запустите проверку:"
echo ""
echo "  npm run build"
echo "  npx tsc --noEmit"
echo "  npm test"
echo ""
