#!/bin/bash

# =============================================
# ПРИМЕНЕНИЕ ВСЕХ SQL СХЕМ К БД
# =============================================

set -e

echo "🗄️  Применение всех SQL схем к базе данных..."
echo "=============================================="

# Настройки БД
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-kamhub_user}
DB_NAME=${DB_NAME:-kamhub_production}
DB_PASSWORD=${DB_PASSWORD:-KamHub2025!SecurePassword}

export PGPASSWORD=$DB_PASSWORD

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Список SQL файлов по порядку
SQL_FILES=(
    "lib/database/schema.sql"
    "lib/database/accommodation_schema.sql"
    "lib/database/transfer_schema.sql"
    "lib/database/transfer_payments_schema.sql"
    "lib/database/seat_holds_schema.sql"
    "lib/database/operators_schema.sql"
    "lib/database/loyalty_schema.sql"
    "lib/database/agent_schema.sql"
    "lib/database/admin_schema.sql"
    "lib/database/transfer_operator_schema.sql"
    "lib/database/souvenirs_schema.sql"
    "lib/database/gear_schema.sql"
    "lib/database/cars_schema.sql"
    "lib/database/migrations/001_update_roles.sql"
)

echo ""
echo "📊 Применяем ${#SQL_FILES[@]} SQL схем..."
echo ""

# Счётчик
SUCCESS_COUNT=0
ERROR_COUNT=0

# Применяем каждый файл
for SQL_FILE in "${SQL_FILES[@]}"; do
    if [ -f "$SQL_FILE" ]; then
        echo "  Применяем: $SQL_FILE"
        
        if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$SQL_FILE" -q 2>/dev/null; then
            print_success "  $SQL_FILE - применён"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            print_error "  $SQL_FILE - ошибка!"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    else
        print_error "  Файл не найден: $SQL_FILE"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    echo ""
done

# Итоговая статистика
echo "=============================================="
echo "📊 ИТОГИ:"
echo "  ✅ Успешно: $SUCCESS_COUNT файлов"
echo "  ❌ Ошибок:  $ERROR_COUNT файлов"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    print_success "ВСЕ SQL СХЕМЫ ПРИМЕНЕНЫ УСПЕШНО!"
    
    # Проверка количества таблиц
    TABLE_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
    echo ""
    echo "📊 В базе данных создано таблиц: $TABLE_COUNT"
    
    exit 0
else
    print_error "ЕСТЬ ОШИБКИ! Проверьте логи выше."
    exit 1
fi

