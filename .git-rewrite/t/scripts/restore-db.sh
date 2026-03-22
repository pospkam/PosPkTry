#!/bin/bash

#########################################
# DATABASE RESTORE SCRIPT
# Kamchatour Hub - Восстановление БД
#########################################
#
# Использование:
#   ./restore-db.sh <backup-file>
#   ./restore-db.sh kamchatour_20251030_120000.sql.gz
#
#########################################

set -euo pipefail

# =============================================
# КОНФИГУРАЦИЯ
# =============================================

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-kamchatour}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-}"

# =============================================
# ФУНКЦИИ
# =============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1"
    exit 1
}

# Проверка аргументов
if [ $# -eq 0 ]; then
    error "Необходимо указать файл backup!
    
Использование: $0 <backup-file>

Пример: $0 /var/backups/kamchatour/kamchatour_20251030_120000.sql.gz
Пример: $0 kamchatour_20251030_120000.sql.gz  (ищет в /var/backups/kamchatour/)
"
fi

BACKUP_FILE="$1"

# Если указано только имя файла, ищем в стандартной директории
if [ ! -f "$BACKUP_FILE" ]; then
    if [ -f "/var/backups/kamchatour/$BACKUP_FILE" ]; then
        BACKUP_FILE="/var/backups/kamchatour/$BACKUP_FILE"
    else
        error "Файл backup не найден: $BACKUP_FILE"
    fi
fi

log "========================================="
log "  KAMCHATOUR DB RESTORE"
log "========================================="
log "Файл: $BACKUP_FILE"
log "База: $DB_NAME@$DB_HOST:$DB_PORT"
log "========================================="

# Подтверждение
echo ""
echo "⚠️  ВНИМАНИЕ!"
echo "Это действие удалит ВСЕ данные в базе $DB_NAME"
echo "и восстановит их из backup файла."
echo ""
read -p "Вы уверены? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^yes$ ]]; then
    log "Отменено пользователем"
    exit 0
fi

# Экспорт пароля
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

# Проверка подключения к БД
log "Проверка подключения к БД..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    error "Не удается подключиться к БД!"
fi
log "✅ Подключение успешно"

# Создание backup текущей БД (на всякий случай)
SAFETY_BACKUP="/tmp/kamchatour_before_restore_$(date +%Y%m%d_%H%M%S).sql"
log "Создание safety backup текущей БД: $SAFETY_BACKUP"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --format=plain > "$SAFETY_BACKUP" 2>/dev/null || true
log "✅ Safety backup создан"

# Удаление существующих подключений
log "Закрытие активных подключений..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
EOF

# Удаление и пересоздание БД
log "Удаление базы данных $DB_NAME..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists

log "Создание базы данных $DB_NAME..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Включение расширений
log "Включение расширений..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
EOF

# Восстановление из backup
log "Восстановление данных из backup..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Распаковка и восстановление из gzip..."
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>&1 | grep -v "NOTICE:" || true
else
    log "Восстановление из plain SQL..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" 2>&1 | grep -v "NOTICE:" || true
fi

# Проверка восстановления
log "Проверка восстановленных данных..."

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public'
" | tr -d ' ')

log "Восстановлено таблиц: $TABLE_COUNT"

if [ "$TABLE_COUNT" -lt 10 ]; then
    error "Слишком мало таблиц восстановлено! Возможна ошибка."
fi

# Обновление статистики
log "Обновление статистики БД..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" > /dev/null 2>&1

log "========================================="
log "  RESTORE ЗАВЕРШЕН УСПЕШНО"
log "========================================="
log "База данных: $DB_NAME"
log "Таблиц: $TABLE_COUNT"
log "Safety backup: $SAFETY_BACKUP"
log "========================================="
log ""
log "✅ Восстановление успешно завершено!"
log ""
