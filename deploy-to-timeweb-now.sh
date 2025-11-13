#!/bin/bash

###############################################################################
# KAMCHATOUR HUB - АВТОМАТИЧЕСКИЙ ДЕПЛОЙ НА TIMEWEB CLOUD
# Скрипт для деплоя на сервер 5.129.248.224
###############################################################################

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${BLUE}▶${NC} $1"; }

echo "🚀 KAMCHATOUR HUB - Деплой на Timeweb Cloud"
echo "============================================"
echo ""

# Параметры сервера
SERVER="5.129.248.224"
USER="root"
PASSWORD="xQvB1pv?yZTjaR"
PROJECT_DIR="/var/www/kamchatour"
REPO_URL="https://github.com/PosPk/kamhub.git"
BRANCH="cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b"

log_step "Подключение к серверу $SERVER..."

# Функция для выполнения команд на сервере
run_remote() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "$1"
}

# Функция для копирования файлов
copy_to_server() {
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$USER@$SERVER:$2"
}

# Проверка подключения
if ! run_remote "echo 'Connected'"; then
    log_error "Не удалось подключиться к серверу!"
    exit 1
fi
log_info "Подключение установлено"

# Обновление системы
log_step "Обновление системы..."
run_remote "apt-get update -qq && apt-get upgrade -y -qq"
log_info "Система обновлена"

# Установка необходимых пакетов
log_step "Установка зависимостей..."
run_remote "apt-get install -y curl wget git build-essential nginx postgresql-client"
log_info "Базовые пакеты установлены"

# Установка Node.js 20
log_step "Установка Node.js 20..."
run_remote "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
log_info "Node.js $(run_remote 'node -v') установлен"

# Установка PM2
log_step "Установка PM2..."
run_remote "npm install -g pm2"
log_info "PM2 установлен"

# Создание директории проекта
log_step "Подготовка директории проекта..."
run_remote "mkdir -p $PROJECT_DIR"
log_info "Директория создана: $PROJECT_DIR"

# Клонирование репозитория
log_step "Клонирование репозитория..."
run_remote "cd $PROJECT_DIR && rm -rf kamhub && git clone $REPO_URL kamhub"
run_remote "cd $PROJECT_DIR/kamhub && git checkout $BRANCH"
log_info "Репозиторий склонирован"

# Копирование .env.production
log_step "Копирование .env.production..."
copy_to_server ".env.production" "$PROJECT_DIR/kamhub/.env.production"
log_info ".env.production скопирован"

# Установка зависимостей
log_step "Установка npm зависимостей..."
run_remote "cd $PROJECT_DIR/kamhub && npm ci --production=false"
log_info "Зависимости установлены"

# Сборка проекта
log_step "Сборка Next.js приложения..."
run_remote "cd $PROJECT_DIR/kamhub && npm run build"
log_info "Проект собран"

# Настройка PM2
log_step "Запуск приложения через PM2..."
run_remote "cd $PROJECT_DIR/kamhub && pm2 delete kamchatour-hub || true"
run_remote "cd $PROJECT_DIR/kamhub && pm2 start npm --name 'kamchatour-hub' -- start"
run_remote "pm2 save"
run_remote "pm2 startup systemd -u root --hp /root | grep -v 'PM2' | bash || true"
log_info "PM2 настроен и запущен"

# Настройка Nginx
log_step "Настройка Nginx..."
run_remote "cat > /etc/nginx/sites-available/kamchatour << 'NGINX_EOF'
server {
    listen 80;
    server_name 5.129.248.224;

    # Security headers
    add_header X-Frame-Options \"DENY\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # Логи
    access_log /var/log/nginx/kamchatour_access.log;
    error_log /var/log/nginx/kamchatour_error.log;

    # Размер загружаемых файлов
    client_max_body_size 10M;

    # Proxy к Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Статические файлы Next.js
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control \"public, max-age=3600, immutable\";
    }
}
NGINX_EOF"

run_remote "rm -f /etc/nginx/sites-enabled/default"
run_remote "ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/"
run_remote "nginx -t && systemctl reload nginx"
log_info "Nginx настроен"

# Настройка Firewall
log_step "Настройка Firewall..."
run_remote "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable"
log_info "Firewall настроен"

# Проверка статуса
log_step "Проверка статуса..."
PM2_STATUS=$(run_remote "pm2 status")
echo "$PM2_STATUS"

# Итоговая информация
echo ""
echo "============================================"
echo -e "${GREEN}✅ ДЕПЛОЙ ЗАВЕРШЕН!${NC}"
echo "============================================"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "  http://5.129.248.224"
echo ""
echo "📝 Полезные команды:"
echo "  ssh root@5.129.248.224"
echo "  pm2 status"
echo "  pm2 logs kamchatour-hub"
echo "  pm2 restart kamchatour-hub"
echo ""
echo "📊 Проверка:"
echo "  curl http://5.129.248.224/api/health"
echo "  curl http://5.129.248.224/api/weather?lat=53&lng=158"
echo ""
log_info "Готово! 🎉"
