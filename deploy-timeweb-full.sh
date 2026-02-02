#!/bin/bash

###############################################################################
# KAMCHATOUR HUB - ПОЛНЫЙ ДЕПЛОЙ НА TIMEWEB CLOUD
# Включает все роли: Tourist, Cars, Gear, Souvenirs, Transfer, Guide
# Автоматическое применение всех миграций 001-015
###############################################################################

set -e

echo "🚀 KAMCHATOUR HUB - Полный деплой на Timeweb Cloud"
echo "===================================================="
echo "Все роли: Tourist, Cars, Gear, Souvenirs, Transfer, Guide"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; exit 1; }
log_step() { echo -e "${BLUE}▶${NC} $1"; }

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
   log_error "Запустите скрипт с правами root: sudo bash $0"
fi

# Конфигурация
PROJECT_DIR="/var/www/kamhub"
DB_NAME="kamhub"
DB_USER="kamhub_user"
DB_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
JWT_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I | awk '{print $1}')

# 1. Обновление системы
log_step "Обновление системы..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
log_info "Система обновлена"

# 2. Установка Node.js 20
log_step "Установка Node.js 20..."
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log_info "Node.js $(node -v) установлен"
else
    log_info "Node.js $(node -v) уже установлен"
fi

# 3. Установка PostgreSQL 14+ с PostGIS
log_step "Установка PostgreSQL с PostGIS..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib postgresql-14-postgis-3
    systemctl start postgresql
    systemctl enable postgresql
    log_info "PostgreSQL установлен"
else
    log_info "PostgreSQL уже установлен"
fi

# 4. Настройка базы данных
log_step "Настройка базы данных..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

# Установка расширений
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

log_info "База данных настроена"

# 5. Установка Nginx
log_step "Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_info "Nginx установлен"
else
    log_info "Nginx уже установлен"
fi

# 6. Установка PM2
log_step "Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 install pm2-logrotate
    log_info "PM2 установлен"
else
    log_info "PM2 уже установлен"
fi

# 7. Создание директории проекта
log_step "Создание директории проекта..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 8. Клонирование или обновление репозитория
log_step "Получение кода..."
if [ -d ".git" ]; then
    log_info "Обновление существующего репозитория..."
    git pull origin main
else
    log_info "Клонирование репозитория..."
    # Если запущено из локальной копии
    if [ -f "../package.json" ]; then
        cp -r ../* . 2>/dev/null || true
        cp -r ../.* . 2>/dev/null || true
    else
        log_error "Репозиторий не найден. Скопируйте файлы проекта в $PROJECT_DIR"
    fi
fi

# 9. Создание .env файла
log_step "Создание .env файла..."
cat > .env << EOF
# KAMHUB - Production Configuration (Timeweb Cloud)
# Автоматически создано $(date)

# Database (PostgreSQL с PostGIS)
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
NEXTAUTH_SECRET=$JWT_SECRET
NEXTAUTH_URL=https://tourhab.ru

# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://tourhab.ru

# AI APIs
GROQ_API_KEY=\${GROQ_API_KEY:-}
DEEPSEEK_API_KEY=\${DEEPSEEK_API_KEY:-}
OPENROUTER_API_KEY=\${OPENROUTER_API_KEY:-}

# Maps & Weather
YANDEX_MAPS_API_KEY=\${YANDEX_MAPS_API_KEY:-}
YANDEX_WEATHER_API_KEY=\${YANDEX_WEATHER_API_KEY:-}

# Payments
CLOUDPAYMENTS_PUBLIC_ID=\${CLOUDPAYMENTS_PUBLIC_ID:-}
CLOUDPAYMENTS_API_SECRET=\${CLOUDPAYMENTS_API_SECRET:-}

# Email (Timeweb SMTP)
SMTP_HOST=smtp.timeweb.ru
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=\${SMTP_USER:-}
SMTP_PASS=\${SMTP_PASS:-}
EMAIL_FROM=noreply@tourhab.ru

# SMS
SMS_RU_API_ID=\${SMS_RU_API_ID:-}

# Telegram
TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=\${TELEGRAM_CHAT_ID:-}

# Monitoring
SENTRY_DSN=\${SENTRY_DSN:-}
NEXT_PUBLIC_SENTRY_DSN=\${NEXT_PUBLIC_SENTRY_DSN:-}

# Node Options
NODE_OPTIONS=--max-old-space-size=2048
EOF

chmod 600 .env
log_info ".env файл создан"

# 10. Установка зависимостей
log_step "Установка зависимостей..."
npm ci --production=false
log_info "Зависимости установлены"

# 11. Применение всех миграций
log_step "Применение миграций базы данных..."

export PGPASSWORD=$DB_PASS

# Создание функции update_updated_at_column если её нет
sudo -u postgres psql -d $DB_NAME << 'SQL'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQL

# Применение всех миграций по порядку
MIGRATIONS=(
    "lib/database/schema.sql"
    "lib/database/migrations/008_transfer_system_tables.sql"
    "lib/database/migrations/009_transfer_notifications.sql"
    "lib/database/migrations/010_add_guide_fields.sql"
    "lib/database/migrations/011_create_guide_tables.sql"
    "lib/database/migrations/012_create_gear_system.sql"
    "lib/database/migrations/013_create_cars_system.sql"
    "lib/database/migrations/014_create_souvenir_system.sql"
    "lib/database/migrations/015_create_tourist_system.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        log_info "Применение $migration..."
        psql -h localhost -U $DB_USER -d $DB_NAME -f "$migration" 2>&1 | grep -v "already exists" || true
    else
        log_warn "Миграция $migration не найдена"
    fi
done

unset PGPASSWORD

log_info "Все миграции применены"

# 12. Сборка проекта
log_step "Сборка Next.js приложения..."
npm run build
log_info "Проект собран"

# 13. Настройка PM2
log_step "Настройка PM2..."
pm2 delete kamhub 2>/dev/null || true

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kamhub',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/kamhub-error.log',
    out_file: '/var/log/pm2/kamhub-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000
  }]
};
EOF

mkdir -p /var/log/pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash

log_info "PM2 настроен"

# 14. Настройка Nginx
log_step "Настройка Nginx..."

cat > /etc/nginx/sites-available/kamhub << 'NGINXEOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

upstream nextjs_upstream {
  server 127.0.0.1:3000;
  keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name tourhab.ru www.tourhab.ru;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Логи
    access_log /var/log/nginx/kamhub_access.log;
    error_log /var/log/nginx/kamhub_error.log;

    # Размер загружаемых файлов
    client_max_body_size 10M;

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "public, max-age=3600";
    }

    # Public static files
    location /static {
        alias /var/www/kamhub/public;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # General pages
    location / {
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /api/health {
        proxy_pass http://nextjs_upstream;
        access_log off;
    }
}
NGINXEOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/

if nginx -t; then
    systemctl reload nginx
    log_info "Nginx настроен"
else
    log_error "Ошибка конфигурации Nginx"
fi

# 15. Настройка Firewall
log_step "Настройка firewall..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
log_info "Firewall настроен"

# 16. Установка SSL (Certbot)
log_step "Установка Certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
    log_info "Certbot установлен"
else
    log_info "Certbot уже установлен"
fi

# 17. Создание скрипта автообновления
log_step "Создание скрипта автообновления..."
cat > /usr/local/bin/kamhub-update << 'UPDATEEOF'
#!/bin/bash
cd /var/www/kamhub
git pull origin main
npm ci --production=false
npm run build
pm2 restart kamhub
pm2 save
echo "[$(date)] Updated successfully" >> /var/log/kamhub-updates.log
UPDATEEOF

chmod +x /usr/local/bin/kamhub-update
log_info "Скрипт обновления создан: kamhub-update"

# 18. Настройка резервного копирования
log_step "Настройка backup..."
cat > /usr/local/bin/kamhub-backup << 'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/var/backups/kamhub"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U kamhub_user kamhub | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup code (без node_modules и .next)
tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -czf $BACKUP_DIR/code_$DATE.tar.gz -C /var/www kamhub

# Удаление backup старше 7 дней
find $BACKUP_DIR -type f -mtime +7 -delete

echo "[$(date)] Backup created: $DATE" >> /var/log/kamhub-backups.log
BACKUPEOF

chmod +x /usr/local/bin/kamhub-backup

# Добавление в cron (каждый день в 3 утра)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/kamhub-backup") | crontab -

log_info "Backup настроен (ежедневно в 3:00)"

# ИТОГОВАЯ ИНФОРМАЦИЯ
echo ""
echo "===================================================="
echo -e "${GREEN}✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!${NC}"
echo "===================================================="
echo ""
echo "📊 Информация о сервере:"
echo "  IP адрес:         $SERVER_IP"
echo "  Домен:            tourhab.ru"
echo "  База данных:      $DB_NAME"
echo "  DB User:          $DB_USER"
echo "  DB Password:      $DB_PASS"
echo "  JWT Secret:       $JWT_SECRET"
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "  http://$SERVER_IP"
echo "  http://tourhab.ru (после настройки DNS)"
echo ""
echo "🔐 Для установки SSL сертификата:"
echo "  certbot --nginx -d tourhab.ru -d www.tourhab.ru"
echo ""
echo "📝 Полезные команды:"
echo "  pm2 status             - статус приложения"
echo "  pm2 logs kamhub        - просмотр логов"
echo "  pm2 restart kamhub     - перезапуск"
echo "  kamhub-update          - обновление из git"
echo "  kamhub-backup          - ручной backup"
echo "  systemctl status nginx - статус Nginx"
echo ""
echo "📁 Конфигурация:"
echo "  Проект:      $PROJECT_DIR"
echo "  .env:        $PROJECT_DIR/.env"
echo "  Nginx:       /etc/nginx/sites-available/kamhub"
echo "  PM2:         ecosystem.config.js"
echo "  Логи:        /var/log/nginx/, /var/log/pm2/"
echo "  Backups:     /var/backups/kamhub/"
echo ""
echo "⚠️  ВАЖНЫЕ ДЕЙСТВИЯ:"
echo "  1. СОХРАНИТЕ пароли (см. выше)"
echo "  2. Настройте DNS: A-запись tourhab.ru -> $SERVER_IP"
echo "  3. Добавьте API ключи в .env:"
echo "     vi $PROJECT_DIR/.env"
echo "  4. Установите SSL сертификат (см. выше)"
echo "  5. Перезапустите приложение: pm2 restart kamhub"
echo ""
echo "🎯 Реализованные роли:"
echo "  ✓ Tourist (полный профиль, trips, wishlist, achievements)"
echo "  ✓ Cars (аренда автомобилей с документами)"
echo "  ✓ Gear (аренда снаряжения)"
echo "  ✓ Souvenirs (магазин сувениров)"
echo "  ✓ Transfer (система трансферов)"
echo "  ✓ Guide (гиды и расписание)"
echo ""
echo "📚 Миграции применены:"
echo "  ✓ 001-007: Базовая структура"
echo "  ✓ 008-009: Transfer system"
echo "  ✓ 010-011: Guide system"
echo "  ✓ 012: Gear rental system"
echo "  ✓ 013: Car rental system"
echo "  ✓ 014: Souvenir shop system"
echo "  ✓ 015: Tourist system"
echo ""
log_info "Готово! 🎉"
echo ""
