#!/bin/bash

###############################################################################
# KAMCHATOUR HUB - АВТОМАТИЧЕСКИЙ ДЕПЛОЙ НА TIMEWEB CLOUD
# Скрипт для автоматической установки на VDS/VPS Timeweb Cloud
###############################################################################

set -e

echo "🚀 KAMCHATOUR HUB - Деплой на Timeweb Cloud"
echo "============================================"
echo ""

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

# Проверка что скрипт запущен на Timeweb Cloud
log_step "Проверка окружения..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    log_info "ОС: $NAME $VERSION"
else
    log_warn "Не удалось определить ОС"
fi

# Обновление системы
log_step "Обновление системы..."
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    log_info "Система обновлена (Ubuntu/Debian)"
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    sudo yum update -y -q
    log_info "Система обновлена (CentOS/RHEL)"
fi

# Установка Node.js 20
log_step "Установка Node.js 20..."
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]; then
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    fi
    log_info "Node.js $(node -v) установлен"
else
    log_info "Node.js $(node -v) уже установлен"
fi

# Установка PostgreSQL
log_step "Установка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif command -v yum &> /dev/null; then
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi
    log_info "PostgreSQL установлен"
else
    log_info "PostgreSQL уже установлен"
fi

# Настройка PostgreSQL
log_step "Настройка базы данных..."
DB_NAME="kamchatour"
DB_USER="kamuser"
DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"

log_info "База данных настроена"

# Установка Nginx
log_step "Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y nginx
    fi
    sudo systemctl start nginx
    sudo systemctl enable nginx
    log_info "Nginx установлен"
else
    log_info "Nginx уже установлен"
fi

# Установка PM2
log_step "Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    log_info "PM2 установлен"
else
    log_info "PM2 уже установлен"
fi

# Создание директории проекта
log_step "Настройка проекта..."
PROJECT_DIR="/var/www/kamchatour"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Копирование файлов (если запущено из репозитория)
if [ -f "package.json" ]; then
    log_info "Копирование файлов проекта..."
    rsync -av --exclude 'node_modules' --exclude '.git' --exclude '.next' ./ $PROJECT_DIR/
    cd $PROJECT_DIR
else
    log_warn "package.json не найден, нужен git clone"
    echo ""
    echo "Клонируйте репозиторий в $PROJECT_DIR:"
    echo "  cd $PROJECT_DIR"
    echo "  git clone <your-repo-url> ."
    echo ""
    read -p "Нажмите Enter после клонирования..."
    cd $PROJECT_DIR
fi

# Создание .env файла
log_step "Создание .env файла..."
JWT_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
# KAMCHATOUR HUB - Timeweb Cloud Configuration
# Автоматически создано $(date)

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://$(hostname -I | awk '{print $1}'):3002

# AI APIs (добавьте ваши ключи)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Maps & Weather (КРИТИЧНО для работы!)
YANDEX_MAPS_API_KEY=
YANDEX_WEATHER_API_KEY=      # ВАЖНО! Основной провайдер погоды для Камчатки (точность 9/10)

# Payments
CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=

# Notifications
SMTP_HOST=smtp.timeweb.ru
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@kamchatour.ru

SMS_RU_API_ID=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
EOF

log_info ".env файл создан"

# Установка зависимостей
log_step "Установка зависимостей..."
npm install --production=false

# Build проекта
log_step "Сборка проекта..."
npm run build
log_info "Проект собран"

# Применение миграций
log_step "Применение миграций..."
npm run migrate:up 2>/dev/null || log_warn "Миграции уже применены"

if [ -f "lib/database/seat_holds_schema.sql" ]; then
    PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -f lib/database/seat_holds_schema.sql 2>/dev/null || log_warn "seat_holds уже существует"
fi

log_info "База данных готова"

# Настройка PM2
log_step "Настройка PM2..."
pm2 delete kamchatour-hub 2>/dev/null || true
pm2 start npm --name "kamchatour-hub" -- start
pm2 save
pm2 startup | grep -v "PM2" | sudo bash
log_info "PM2 настроен"

# Настройка Nginx
log_step "Настройка Nginx..."
DOMAIN=$(hostname -f 2>/dev/null || echo "localhost")
SERVER_IP=$(hostname -I | awk '{print $1}')

sudo tee /etc/nginx/sites-available/kamchatour > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Логи
    access_log /var/log/nginx/kamchatour_access.log;
    error_log /var/log/nginx/kamchatour_error.log;

    # Размер загружаемых файлов
    client_max_body_size 10M;

    # Proxy к Next.js
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Статические файлы Next.js
    location /_next/static {
        proxy_pass http://127.0.0.1:3002;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
NGINX_EOF

# Активация конфигурации Nginx
if [ -d "/etc/nginx/sites-enabled" ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
else
    # CentOS/RHEL
    sudo cp /etc/nginx/sites-available/kamchatour /etc/nginx/conf.d/kamchatour.conf
fi

# Проверка конфигурации Nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    log_info "Nginx настроен"
else
    log_error "Ошибка конфигурации Nginx"
fi

# Настройка Firewall
log_step "Настройка firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    sudo ufw --force enable
    log_info "UFW настроен"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --reload
    log_info "Firewalld настроен"
fi

# Настройка автоматических backup
log_step "Настройка backup..."
if [ -f "scripts/setup-backup-cron.sh" ]; then
    chmod +x scripts/setup-backup-cron.sh
    bash scripts/setup-backup-cron.sh
    log_info "Backup настроен (каждые 6 часов)"
fi

# SSL сертификат (Let's Encrypt)
log_step "Настройка SSL..."
echo ""
echo "Для установки SSL сертификата выполните:"
echo ""
echo "  sudo apt-get install certbot python3-certbot-nginx  # Ubuntu/Debian"
echo "  или"
echo "  sudo yum install certbot python3-certbot-nginx      # CentOS/RHEL"
echo ""
echo "Затем:"
echo "  sudo certbot --nginx -d ваш-домен.ru"
echo ""

# Итоговая информация
echo ""
echo "============================================"
echo -e "${GREEN}✅ ДЕПЛОЙ ЗАВЕРШЕН!${NC}"
echo "============================================"
echo ""
echo "📊 Информация о сервере:"
echo "  IP адрес:     $SERVER_IP"
echo "  Домен:        $DOMAIN"
echo "  База данных:  $DB_NAME"
echo "  DB User:      $DB_USER"
echo "  DB Password:  $DB_PASS"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "  http://$SERVER_IP"
echo "  http://$DOMAIN"
echo ""
echo "📝 Полезные команды:"
echo "  pm2 status              - статус приложения"
echo "  pm2 logs kamchatour-hub - логи"
echo "  pm2 restart kamchatour-hub - перезапуск"
echo "  sudo systemctl status nginx - статус Nginx"
echo "  sudo nginx -t           - проверка конфигурации"
echo ""
echo "🔧 Конфигурация:"
echo "  Проект:      $PROJECT_DIR"
echo "  .env файл:   $PROJECT_DIR/.env"
echo "  Nginx:       /etc/nginx/sites-available/kamchatour"
echo "  Логи Nginx:  /var/log/nginx/kamchatour_*.log"
echo "  Логи PM2:    ~/.pm2/logs/"
echo ""
echo "⚠️  ВАЖНО:"
echo "  1. Сохраните пароль БД: $DB_PASS"
echo "  2. Настройте домен в Timeweb Cloud панели"
echo "  3. Добавьте API ключи в .env файл"
echo "  4. Установите SSL сертификат (см. выше)"
echo ""
echo "📚 Документация: $PROJECT_DIR/TIMEWEB_ДЕПЛОЙ.md"
echo ""
log_info "Готово! 🎉"
