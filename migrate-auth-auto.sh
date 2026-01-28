#!/bin/bash

# =============================================================================
# 🔐 Автоматизированная миграция Auth модуля в Core Infrastructure Pillar
# =============================================================================

set -e  # Выход при ошибке

RESET='\033[0m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'

echo -e "${BLUE}🚀 Начинаем автоматизированную миграцию Auth${RESET}"
echo ""

# =============================================================================
# ЭТАП 1: Проверка структуры
# =============================================================================

echo -e "${BLUE}[ЭТАП 1]${RESET} Проверка структуры..."

if [ ! -d "pillars/core-infrastructure" ]; then
    echo -e "${YELLOW}⚠️  Директория pillars/core-infrastructure не найдена${RESET}"
    exit 1
fi

if [ ! -d "lib/auth" ]; then
    echo -e "${YELLOW}⚠️  Директория lib/auth не найдена${RESET}"
    echo "ℹ️  Текущие файлы auth:"
    find lib -name "*auth*" -o -name "*Auth*" 2>/dev/null || echo "Файлы не найдены"
    exit 1
fi

echo -e "${GREEN}✅ Структура проверена${RESET}"
echo ""

# =============================================================================
# ЭТАП 2: Создание целевых директорий
# =============================================================================

echo -e "${BLUE}[ЭТАП 2]${RESET} Создание целевых директорий..."

mkdir -p pillars/core-infrastructure/lib/auth/{services,admin,types}
mkdir -p pillars/core-infrastructure/api/auth/{login,register,signin,signup,demo}

echo -e "${GREEN}✅ Директории созданы${RESET}"
echo ""

# =============================================================================
# ЭТАП 3: Копирование файлов
# =============================================================================

echo -e "${BLUE}[ЭТАП 3]${RESET} Копирование файлов..."

# 3.1: JWT сервис
if [ -f "lib/auth/jwt.ts" ]; then
    cp lib/auth/jwt.ts pillars/core-infrastructure/lib/auth/services/jwt.ts
    echo -e "${GREEN}✅ jwt.ts скопирован${RESET}"
else
    echo -e "${YELLOW}⚠️  jwt.ts не найден${RESET}"
fi

# 3.2: Middleware/Guards
if [ -f "lib/auth/middleware.ts" ]; then
    cp lib/auth/middleware.ts pillars/core-infrastructure/lib/auth/services/guards.ts
    echo -e "${GREEN}✅ middleware.ts → guards.ts скопирован${RESET}"
else
    echo -e "${YELLOW}⚠️  middleware.ts не найден${RESET}"
fi

# 3.3: Admin check
if [ -f "lib/auth/check-admin.ts" ]; then
    cp lib/auth/check-admin.ts pillars/core-infrastructure/lib/auth/admin/check.ts
    echo -e "${GREEN}✅ check-admin.ts скопирован${RESET}"
else
    echo -e "${YELLOW}⚠️  check-admin.ts не найден${RESET}"
fi

# 3.4: API endpoints
if [ -d "app/api/auth" ]; then
    find app/api/auth -name "route.ts" -o -name "*.ts" | while read file; do
        relative_path="${file#app/api/auth/}"
        target_dir=$(dirname "$relative_path")
        mkdir -p "pillars/core-infrastructure/api/auth/$target_dir"
        cp "$file" "pillars/core-infrastructure/api/auth/$relative_path"
    done
    echo -e "${GREEN}✅ API endpoints скопированы${RESET}"
else
    echo -e "${YELLOW}⚠️  app/api/auth не найден${RESET}"
fi

echo ""

# =============================================================================
# ЭТАП 4: Создание Index файлов
# =============================================================================

echo -e "${BLUE}[ЭТАП 4]${RESET} Создание index.ts файлов..."

# 4.1: services/index.ts
cat > pillars/core-infrastructure/lib/auth/services/index.ts << 'EOF'
/**
 * Core Infrastructure - Auth Services
 * Экспортирует JWT и Guard функции
 */

export * from './jwt';
export * from './guards';
EOF
echo -e "${GREEN}✅ services/index.ts создан${RESET}"

# 4.2: admin/index.ts
cat > pillars/core-infrastructure/lib/auth/admin/index.ts << 'EOF'
/**
 * Core Infrastructure - Auth Admin
 * Функции для проверки прав администратора
 */

export * from './check';
EOF
echo -e "${GREEN}✅ admin/index.ts создан${RESET}"

# 4.3: types/index.ts
cat > pillars/core-infrastructure/lib/auth/types/index.ts << 'EOF'
/**
 * Core Infrastructure - Auth Types
 * Типы данных для аутентификации
 */

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  createdAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  AGENT = 'agent',
  GUIDE = 'guide',
  USER = 'user',
  GUEST = 'guest',
}
EOF
echo -e "${GREEN}✅ types/index.ts создан${RESET}"

# 4.4: auth/index.ts
cat > pillars/core-infrastructure/lib/auth/index.ts << 'EOF'
/**
 * Core Infrastructure - Auth Module
 * Public API для аутентификации и авторизации
 */

export * from './services';
export * from './admin';
export * from './types';
EOF
echo -e "${GREEN}✅ auth/index.ts создан${RESET}"

echo ""

# =============================================================================
# ЭТАП 5: Статистика
# =============================================================================

echo -e "${BLUE}[ЭТАП 5]${RESET} Статистика миграции..."

echo ""
echo -e "${BLUE}📊 Скопированные файлы:${RESET}"
find pillars/core-infrastructure/lib/auth -type f | sed 's/^/   /'
echo ""
find pillars/core-infrastructure/api/auth -type f | sed 's/^/   /'

echo ""
echo -e "${BLUE}📊 Новые Index файлы:${RESET}"
find pillars/core-infrastructure/lib/auth -name "index.ts" | sed 's/^/   ✅ /'

echo ""
echo -e "${BLUE}📊 Статистика:${RESET}"
files_count=$(find pillars/core-infrastructure/lib/auth -type f | wc -l)
lines_count=$(find pillars/core-infrastructure/lib/auth -type f -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "   📁 Файлов скопировано: $files_count"
echo "   📝 Строк кода: $lines_count"

echo ""

# =============================================================================
# ЭТАП 6: Рекомендации
# =============================================================================

echo -e "${BLUE}[ЭТАП 6]${RESET} Следующие шаги..."
echo ""
echo -e "${BLUE}1. Обновить импорты:${RESET}"
echo "   grep -r \"from '@/lib/auth\" --include=\"*.ts\" --include=\"*.tsx\""
echo ""
echo -e "${BLUE}2. Заменить на:${RESET}"
echo "   import { ... } from '@core-infrastructure/lib/auth'"
echo ""
echo -e "${BLUE}3. Обновить middleware.ts:${RESET}"
echo "   # Заменить: import { verifyToken } from '@/lib/auth/jwt'"
echo "   # На:       import { verifyToken } from '@core-infrastructure/lib/auth'"
echo ""
echo -e "${BLUE}4. Запустить проверку:${RESET}"
echo "   npm run build && npx tsc --noEmit"
echo ""
echo -e "${BLUE}5. Тестировать:${RESET}"
echo "   npm test"
echo ""

# =============================================================================
# РЕЗУЛЬТАТ
# =============================================================================

echo -e "${GREEN}✅ Миграция завершена успешно!${RESET}"
echo ""
echo -e "${YELLOW}⚠️  Помните: нужно обновить импорты везде в проекте${RESET}"
echo ""
