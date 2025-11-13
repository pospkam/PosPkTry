#!/bin/bash

###############################################################################
# KAMCHATOUR HUB - ПОЛНОСТЬЮ АВТОМАТИЧЕСКИЙ ДЕПЛОЙ
# Запустить на сервере: curl -fsSL https://raw.githubusercontent.com/PosPk/kamhub/main/auto-deploy-full.sh | bash
###############################################################################

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}▶${NC} ${PURPLE}$1${NC}\n"; }

echo -e "${CYAN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║            🚀  KAMCHATOUR HUB - АВТОМАТИЧЕСКИЙ ДЕПЛОЙ  🚀           ║
║                                                                       ║
║                    Полная установка за 15 минут                      ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    error "Запустите скрипт от root: sudo bash auto-deploy-full.sh"
fi

step "ШАГ 1/10: Обновление системы"
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq
info "Система обновлена"

step "ШАГ 2/10: Установка базовых пакетов"
apt install -y -qq \
    curl wget git build-essential \
    ufw nginx certbot python3-certbot-nginx \
    postgresql postgresql-contrib \
    htop tmux jq
info "Базовые пакеты установлены"

step "ШАГ 3/10: Настройка Firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
info "Firewall настроен"

step "ШАГ 4/10: Установка Node.js 20"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y nodejs
fi
info "Node.js $(node -v) установлен"

step "ШАГ 5/10: Установка PM2"
npm install -g pm2 --silent
pm2 update > /dev/null 2>&1
info "PM2 установлен"

step "ШАГ 6/10: Настройка PostgreSQL"
systemctl start postgresql
systemctl enable postgresql

DB_NAME="kamchatour"
DB_USER="kamuser"
DB_PASS="kampass_$(openssl rand -hex 8)"

sudo -u postgres psql << EOSQL > /dev/null 2>&1
-- Удалить если существует
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Создать заново
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

-- Расширения
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL

info "PostgreSQL настроен (БД: $DB_NAME, User: $DB_USER)"

step "ШАГ 7/10: Клонирование и установка приложения"
PROJECT_DIR="/var/www/kamchatour-hub"

# Удалить старую версию
if [ -d "$PROJECT_DIR" ]; then
    warn "Удаляю старую версию..."
    rm -rf "$PROJECT_DIR"
fi

# Клонировать
mkdir -p /var/www
cd /var/www
git clone --depth 1 https://github.com/PosPk/kamhub.git kamchatour-hub > /dev/null 2>&1
cd $PROJECT_DIR

# Установить зависимости
info "Установка зависимостей (это займёт 2-3 минуты)..."
npm ci --silent

info "Приложение клонировано и зависимости установлены"

step "ШАГ 8/10: Настройка окружения"
JWT_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > .env.production << EOF
# KAMCHATOUR HUB - Production Config
# Автоматически создано: $(date)

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
NEXT_PUBLIC_APP_URL=http://$SERVER_IP
PORT=3000

# Weather APIs (опционально - работает без них через Open-Meteo)
OPENWEATHERMAP_API_KEY=
WEATHERAPI_KEY=
YANDEX_WEATHER_API_KEY=

# AI (опционально)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Maps (опционально)
YANDEX_MAPS_API_KEY=

# Payment (опционально)
CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=

# Notifications (опционально)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMS_API_KEY=
TELEGRAM_BOT_TOKEN=
EOF

info ".env.production создан"

# Применить миграции
info "Применение миграций БД..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

# Применить все SQL схемы
for schema in lib/database/*.sql; do
    if [ -f "$schema" ]; then
        psql $DATABASE_URL -f "$schema" > /dev/null 2>&1 || warn "Схема $(basename $schema) уже применена"
    fi
done

info "Миграции применены"

step "ШАГ 9/10: Сборка приложения"
info "Сборка проекта (это займёт 2-3 минуты)..."
npm run build

info "Приложение собрано"

# Запуск через PM2
pm2 delete kamchatour-hub 2>/dev/null || true
pm2 start npm --name "kamchatour-hub" -- start
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1

info "Приложение запущено через PM2"

step "ШАГ 10/10: Настройка Nginx"
cat > /etc/nginx/sites-available/kamchatour << 'NGINX_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
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
        proxy_pass http://127.0.0.1:3000;
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

    # Статические файлы
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
NGINX_EOF

# Активировать конфигурацию
ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверить и перезапустить
nginx -t > /dev/null 2>&1 || error "Ошибка конфигурации Nginx"
systemctl reload nginx

info "Nginx настроен и перезапущен"

# Финальная проверка
sleep 3

echo -e "\n${CYAN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                  ✅  ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!  ✅                    ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

echo -e "${GREEN}📊 ИНФОРМАЦИЯ О СЕРВЕРЕ:${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo -e "  🌐 URL:           ${CYAN}http://$SERVER_IP${NC}"
echo -e "  📁 Проект:        ${CYAN}$PROJECT_DIR${NC}"
echo -e "  🗄️  База данных:   ${CYAN}$DB_NAME${NC}"
echo -e "  👤 DB User:       ${CYAN}$DB_USER${NC}"
echo -e "  🔑 DB Password:   ${CYAN}$DB_PASS${NC}"
echo -e "  🔐 JWT Secret:    ${CYAN}${JWT_SECRET:0:20}...${NC}"

echo -e "\n${GREEN}📝 ПОЛЕЗНЫЕ КОМАНДЫ:${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo -e "  ${YELLOW}pm2 status${NC}              - статус приложения"
echo -e "  ${YELLOW}pm2 logs kamchatour-hub${NC} - логи в реальном времени"
echo -e "  ${YELLOW}pm2 restart kamchatour-hub${NC} - перезапуск"
echo -e "  ${YELLOW}systemctl status nginx${NC}  - статус Nginx"
echo -e "  ${YELLOW}tail -f /var/log/nginx/kamchatour_access.log${NC} - логи Nginx"

echo -e "\n${GREEN}🔧 ФАЙЛЫ КОНФИГУРАЦИИ:${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo -e "  .env:      ${CYAN}$PROJECT_DIR/.env.production${NC}"
echo -e "  Nginx:     ${CYAN}/etc/nginx/sites-available/kamchatour${NC}"
echo -e "  PM2 logs:  ${CYAN}~/.pm2/logs/${NC}"

echo -e "\n${GREEN}✅ ПРОВЕРКА:${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# Проверить что приложение работает
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Приложение работает на localhost:3000"
else
    echo -e "  ${RED}✗${NC} Приложение не отвечает"
fi

if curl -s http://$SERVER_IP > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Nginx проксирует запросы"
else
    echo -e "  ${YELLOW}⚠${NC} Nginx может быть недоступен"
fi

# Проверить PM2
if pm2 status | grep -q "kamchatour-hub.*online"; then
    echo -e "  ${GREEN}✓${NC} PM2 процесс online"
else
    echo -e "  ${RED}✗${NC} PM2 процесс не запущен"
fi

# Проверить БД
if psql "postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} База данных доступна"
else
    echo -e "  ${RED}✗${NC} Проблема с базой данных"
fi

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}🌐 Откройте в браузере:${NC} ${CYAN}http://$SERVER_IP${NC}\n"

echo -e "${YELLOW}⚠️  ВАЖНО! Сохраните пароль БД:${NC} ${RED}$DB_PASS${NC}\n"

echo -e "${BLUE}📚 Документация:${NC} $PROJECT_DIR/TIMEWEB_DEPLOY_NOW.md\n"

echo -e "${GREEN}✨ Готово! Приложение успешно развернуто!${NC}\n"
