#!/bin/bash

# ============================================
# ПОЛНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ KAMHUB
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                        ║${NC}"
echo -e "${BLUE}║   🏔️  KAMHUB DATABASE SETUP  🏔️        ║${NC}"
echo -e "${BLUE}║                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Проверка DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL не установлена!${NC}"
  echo ""
  echo "Установите переменную окружения:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL найдена"
echo ""

# Проверка подключения
echo -e "${BLUE}▶${NC} Проверка подключения к PostgreSQL..."

if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}❌ Не удалось подключиться к PostgreSQL!${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Подключение успешно"
echo ""

# Применение базовой схемы
echo -e "${BLUE}▶${NC} Применение базовой схемы..."
psql "$DATABASE_URL" -f scripts/init-postgresql.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Базовая схема применена"
else
  echo -e "${RED}❌ Ошибка применения базовой схемы${NC}"
  exit 1
fi

echo ""

# Применение новых схем
echo -e "${BLUE}▶${NC} Применение новых модулей..."
psql "$DATABASE_URL" -f scripts/apply-new-schemas.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Все схемы применены успешно"
else
  echo -e "${YELLOW}⚠${NC} Некоторые схемы могут быть уже применены"
fi

echo ""

# Проверка таблиц
echo -e "${BLUE}▶${NC} Проверка созданных таблиц..."

TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo -e "${GREEN}✓${NC} Создано таблиц: $TABLE_COUNT"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║   ✅  БАЗА ДАННЫХ ГОТОВА!  ✅          ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo "Следующие шаги:"
echo "  1. npm run dev - запустить приложение"
echo "  2. Проверить работу всех модулей"
echo ""

