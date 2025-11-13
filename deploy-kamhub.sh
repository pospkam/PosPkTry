#!/bin/bash

# =============================================
# АВТОМАТИЧЕСКИЙ ДЕПЛОЙ KAMHUB НА TIMEWEB
# =============================================

set -e  # Остановить при ошибке

echo "🚀 Начинаем деплой KamHub..."
echo "================================"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода с цветом
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# =============================================
# ШАГ 1: ПРОВЕРКА ОКРУЖЕНИЯ
# =============================================

echo ""
echo "📋 Шаг 1: Проверка окружения..."

if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен!"
    exit 1
fi
print_success "Node.js: $(node -v)"

if ! command -v npm &> /dev/null; then
    print_error "npm не установлен!"
    exit 1
fi
print_success "npm: $(npm -v)"

if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL не установлен!"
    exit 1
fi
print_success "PostgreSQL установлен"

if ! command -v nginx &> /dev/null; then
    print_warning "Nginx не установлен"
else
    print_success "Nginx установлен"
fi

if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
    print_success "PM2 установлен"
else
    print_success "PM2 установлен"
fi

# =============================================
# ШАГ 2: НАСТРОЙКА БД
# =============================================

echo ""
echo "🗄️  Шаг 2: Настройка базы данных..."

DB_NAME="kamhub_production"
DB_USER="kamhub_user"
DB_PASSWORD="KamHub2025!SecurePassword"

# Проверка существования БД
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_warning "База данных $DB_NAME уже существует"
else
    print_warning "Создаём базу данных..."
    
    # Создание БД и пользователя
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
    
    # Включение расширений
    sudo -u postgres psql -d $DB_NAME <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
    
    print_success "База данных создана"
fi

# =============================================
# ШАГ 3: ПРИМЕНЕНИЕ SQL СХЕМ
# =============================================

echo ""
echo "📊 Шаг 3: Применение SQL схем..."

export PGPASSWORD=$DB_PASSWORD

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

for SQL_FILE in "${SQL_FILES[@]}"; do
    if [ -f "$SQL_FILE" ]; then
        echo "  Применяем $SQL_FILE..."
        psql -h localhost -U $DB_USER -d $DB_NAME -f "$SQL_FILE" -q
        print_success "  $SQL_FILE применён"
    else
        print_warning "  Файл $SQL_FILE не найден, пропускаем"
    fi
done

print_success "Все SQL схемы применены"

# =============================================
# ШАГ 4: СОЗДАНИЕ ДЕМО-ПОЛЬЗОВАТЕЛЕЙ
# =============================================

echo ""
echo "👥 Шаг 4: Создание демо-пользователей..."

psql -h localhost -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (id, email, name, role, created_at) VALUES
(gen_random_uuid(), 'tourist@kamhub.ru', 'Демо Турист', 'tourist', NOW()),
(gen_random_uuid(), 'operator@kamhub.ru', 'Демо Оператор', 'operator', NOW()),
(gen_random_uuid(), 'agent@kamhub.ru', 'Демо Агент', 'agent', NOW()),
(gen_random_uuid(), 'guide@kamhub.ru', 'Демо Гид', 'guide', NOW()),
(gen_random_uuid(), 'transfer@kamhub.ru', 'Демо Трансфер-Оператор', 'transfer', NOW()),
(gen_random_uuid(), 'admin@kamhub.ru', 'Демо Администратор', 'admin', NOW())
ON CONFLICT DO NOTHING;
EOF

print_success "Демо-пользователи созданы"

# =============================================
# ШАГ 5: УСТАНОВКА ЗАВИСИМОСТЕЙ
# =============================================

echo ""
echo "📦 Шаг 5: Установка зависимостей..."

if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

print_success "Зависимости установлены"

# =============================================
# ШАГ 6: ПРОВЕРКА .env.production
# =============================================

echo ""
echo "⚙️  Шаг 6: Проверка конфигурации..."

if [ ! -f ".env.production" ]; then
    print_warning "Файл .env.production не найден. Создаём шаблон..."
    
    cat > .env.production << 'EOF'
# Database
DATABASE_URL=postgresql://kamhub_user:KamHub2025!SecurePassword@localhost:5432/kamhub_production
DATABASE_SSL=false

# App
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://kamhub.ru
PORT=3000

# Auth
JWT_SECRET=KamHub_Super_Secret_Key_2025_Production_XYZ123
JWT_EXPIRES_IN=7d

# TODO: Добавьте остальные ключи!
# CLOUDPAYMENTS_PUBLIC_KEY=...
# GROQ_API_KEY=...
# SMTP_USER=...
EOF
    
    print_warning "Отредактируйте .env.production перед продолжением!"
    print_warning "Нажмите Enter после редактирования..."
    read
fi

print_success "Конфигурация проверена"

# =============================================
# ШАГ 7: СБОРКА ПРОЕКТА
# =============================================

echo ""
echo "🔨 Шаг 7: Сборка Next.js приложения..."

npm run build

if [ -d ".next" ]; then
    print_success "Сборка завершена успешно"
else
    print_error "Ошибка сборки!"
    exit 1
fi

# =============================================
# ШАГ 8: НАСТРОЙКА PM2
# =============================================

echo ""
echo "🚀 Шаг 8: Настройка PM2..."

# Остановить предыдущий процесс, если есть
if pm2 list | grep -q "kamhub"; then
    print_warning "Останавливаем предыдущий процесс..."
    pm2 delete kamhub
fi

# Создать директорию для логов
mkdir -p logs

# Запустить приложение
pm2 start ecosystem.config.js

# Сохранить конфигурацию
pm2 save

print_success "Приложение запущено через PM2"

# =============================================
# ШАГ 9: НАСТРОЙКА NGINX (опционально)
# =============================================

echo ""
echo "🌐 Шаг 9: Проверка Nginx..."

if command -v nginx &> /dev/null; then
    if [ ! -f "/etc/nginx/sites-available/kamhub" ]; then
        print_warning "Создаём конфигурацию Nginx..."
        
        sudo cat > /etc/nginx/sites-available/kamhub << 'EOF'
server {
    listen 80;
    server_name kamhub.ru www.kamhub.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    client_max_body_size 10M;
}
EOF
        
        # Активировать конфигурацию
        sudo ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/
        
        # Проверить конфигурацию
        sudo nginx -t
        
        # Перезапустить Nginx
        sudo systemctl restart nginx
        
        print_success "Nginx настроен"
    else
        print_success "Nginx уже настроен"
    fi
else
    print_warning "Nginx не установлен, пропускаем"
fi

# =============================================
# ШАГ 10: ПРОВЕРКА ДЕПЛОЯ
# =============================================

echo ""
echo "✅ Шаг 10: Проверка деплоя..."

sleep 3  # Даём время приложению запуститься

# Проверка через curl
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_success "Приложение отвечает на запросы"
else
    print_error "Приложение не отвечает!"
    echo "Проверьте логи: pm2 logs kamhub"
    exit 1
fi

# Вывести статус PM2
echo ""
pm2 status

# =============================================
# ЗАВЕРШЕНИЕ
# =============================================

echo ""
echo "================================"
echo "🎉 ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!"
echo "================================"
echo ""
echo "📊 Информация:"
echo "  - Приложение: http://localhost:3000"
echo "  - База данных: $DB_NAME"
echo "  - PM2 процесс: kamhub"
echo ""
echo "🔧 Управление:"
echo "  - Логи:        pm2 logs kamhub"
echo "  - Перезапуск:  pm2 restart kamhub"
echo "  - Остановка:   pm2 stop kamhub"
echo "  - Мониторинг:  pm2 monit"
echo ""
echo "📝 Следующие шаги:"
echo "  1. Настроить SSL: sudo certbot --nginx -d kamhub.ru"
echo "  2. Добавить API ключи в .env.production"
echo "  3. Протестировать все функции"
echo ""
echo "🚀 Проект готов к использованию!"

