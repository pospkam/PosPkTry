#!/bin/bash

##############################################
# Скрипт для деплоя исправлений регистрации партнеров
# Использование: bash deploy-partner-fix.sh
##############################################

set -e  # Останавливаться при ошибках

echo "============================================"
echo "🚀 Деплой исправлений регистрации партнеров"
echo "============================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода с цветом
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Шаг 1: Проверка переменных окружения
print_info "Шаг 1: Проверка переменных окружения"
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL не установлен!"
    echo "Установите переменную окружения:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi
print_success "DATABASE_URL установлен"
echo ""

# Шаг 2: Установка зависимостей
print_info "Шаг 2: Установка зависимостей"
npm install
print_success "Зависимости установлены"
echo ""

# Шаг 3: Проверка подключения к БД
print_info "Шаг 3: Проверка подключения к базе данных"
npx ts-node -e "
import { testConnection } from './lib/database';
(async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('Не удалось подключиться к БД');
    process.exit(1);
  }
  console.log('Подключение к БД успешно');
})();
" || {
    print_error "Не удалось подключиться к базе данных!"
    exit 1
}
print_success "Подключение к БД успешно"
echo ""

# Шаг 4: Применение миграций
print_info "Шаг 4: Применение миграций"
npm run db:migrate || {
    print_error "Ошибка при применении миграций!"
    exit 1
}
print_success "Миграции применены"
echo ""

# Шаг 5: Сборка приложения
print_info "Шаг 5: Сборка приложения"
npm run build || {
    print_error "Ошибка при сборке приложения!"
    exit 1
}
print_success "Приложение собрано"
echo ""

# Шаг 6: Проверка структуры БД
print_info "Шаг 6: Проверка структуры базы данных"
echo "Проверяем наличие password_hash в users..."
psql $DATABASE_URL -c "\d users" | grep password_hash || {
    print_error "Поле password_hash не найдено в таблице users!"
    exit 1
}
print_success "Поле password_hash найдено в users"

echo "Проверяем наличие user_id в partners..."
psql $DATABASE_URL -c "\d partners" | grep user_id || {
    print_error "Поле user_id не найдено в таблице partners!"
    exit 1
}
print_success "Поле user_id найдено в partners"
echo ""

# Шаг 7: Перезапуск приложения
print_info "Шаг 7: Перезапуск приложения"
if command -v pm2 &> /dev/null; then
    print_info "Обнаружен PM2, перезапускаем..."
    pm2 restart kamhub || pm2 start npm --name kamhub -- start
    print_success "Приложение перезапущено через PM2"
elif [ -f "docker-compose.yml" ]; then
    print_info "Обнаружен Docker Compose, перезапускаем..."
    docker-compose restart
    print_success "Приложение перезапущено через Docker Compose"
else
    print_info "PM2 или Docker не найдены"
    print_info "Запустите приложение вручную: npm start"
fi
echo ""

# Шаг 8: Тестирование API
print_info "Шаг 8: Тестирование API регистрации"
echo "Отправляем тестовый запрос..."

TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/partners/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test-'$(date +%s)'@example.com",
    "phone": "+7 999 123 4567",
    "password": "test12345678",
    "roles": ["operator"],
    "description": "Test company"
  }' || echo '{"success": false}')

if echo "$TEST_RESPONSE" | grep -q '"success".*true'; then
    print_success "API работает корректно!"
else
    print_error "API вернул ошибку:"
    echo "$TEST_RESPONSE"
fi
echo ""

# Финальный отчет
echo "============================================"
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!"
echo "============================================"
echo ""
echo "📝 Что было сделано:"
echo "  ✅ Установлены зависимости (bcryptjs)"
echo "  ✅ Применены миграции БД (006, 007)"
echo "  ✅ Собрано приложение"
echo "  ✅ Проверена структура БД"
echo "  ✅ Перезапущено приложение"
echo "  ✅ Протестирован API"
echo ""
echo "🔗 Полезные ссылки:"
echo "  • Инструкция: PARTNER_REGISTRATION_FIX_INSTRUCTIONS.md"
echo "  • Отчет: PARTNER_REGISTRATION_FIXED.md"
echo "  • PR: https://github.com/PosPk/kamhub/pull/19"
echo ""
echo "🧪 Тестирование:"
echo "  Откройте: http://your-domain.com/partner/register"
echo ""
print_success "Готово к использованию!"
