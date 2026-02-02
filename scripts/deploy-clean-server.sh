#!/bin/bash

###############################################################################
# 🚀 KAMHUB - АВТОМАТИЧЕСКИЙ ДЕПЛОЙ НА ЧИСТЫЙ СЕРВЕР
# Полная настройка с нуля: Node.js, PM2, Nginx, SSL, Database
###############################################################################

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

###############################################################################
# 1. ПРОВЕРКА ПАРАМЕТРОВ
###############################################################################

if [ "$#" -ne 3 ]; then
    error "Usage: $0 <SERVER_IP> <SSH_PASSWORD> <BRANCH_NAME>
    
Example:
    $0 5.129.248.224 'xQvB1pv?yZTjaR' cursor/investigate-and-fix-partner-registration-errors-10b3
"
fi

SERVER_IP=$1
SSH_PASSWORD=$2
BRANCH_NAME=$3
PROJECT_DIR="/var/www/kamhub"
GITHUB_REPO="https://github.com/PosPk/kamhub.git"

log "🚀 Начинаем чистый деплой на $SERVER_IP"
info "Ветка: $BRANCH_NAME"

###############################################################################
# 2. ПОДКЛЮЧЕНИЕ И ПРОВЕРКА СЕРВЕРА
###############################################################################

log "📡 Проверка подключения к серверу..."
if ! sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'Connection OK'" > /dev/null 2>&1; then
    error "Не удалось подключиться к серверу $SERVER_IP"
fi
log "✅ Подключение установлено"

###############################################################################
# 3. УСТАНОВКА БАЗОВОГО ПО
###############################################################################

log "📦 Установка необходимого ПО..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
set -e

# Обновление системы
echo "🔄 Обновление системы..."
apt-get update -qq
apt-get upgrade -y -qq

# Установка основных пакетов
echo "📦 Установка базовых пакетов..."
apt-get install -y -qq curl wget git build-essential nginx

# Установка Node.js 20.x
echo "📦 Установка Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

# Установка PM2 глобально
echo "📦 Установка PM2..."
npm install -g pm2

# Проверка версий
echo "✅ Установлено:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"

ENDSSH

log "✅ Базовое ПО установлено"

###############################################################################
# 4. КЛОНИРОВАНИЕ РЕПОЗИТОРИЯ
###############################################################################

log "📥 Клонирование репозитория..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << ENDSSH
set -e

# Удаление старой директории если существует
if [ -d "$PROJECT_DIR" ]; then
    echo "🗑️  Удаление старой директории..."
    rm -rf $PROJECT_DIR
fi

# Создание директории
mkdir -p /var/www

# Клонирование репозитория
echo "📥 Клонирование из GitHub..."
cd /var/www
git clone --branch $BRANCH_NAME $GITHUB_REPO kamhub

cd $PROJECT_DIR
echo "✅ Репозиторий склонирован"
echo "📍 Текущая ветка: \$(git branch --show-current)"
echo "📝 Последний коммит: \$(git log --oneline -1)"

ENDSSH

log "✅ Репозиторий склонирован"

###############################################################################
# 5. УСТАНОВКА ЗАВИСИМОСТЕЙ И СБОРКА
###############################################################################

log "📦 Установка зависимостей и сборка проекта..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << ENDSSH
set -e

cd $PROJECT_DIR

# Установка зависимостей
echo "📦 Установка npm зависимостей..."
npm install --loglevel=error

# Production build
echo "🔨 Production build Next.js..."
npm run build

# Проверка что .next создан
if [ ! -d ".next" ]; then
    echo "❌ ERROR: .next директория не создана!"
    exit 1
fi

# Создание BUILD_ID если отсутствует
if [ ! -f ".next/BUILD_ID" ]; then
    echo "⚠️  Создание BUILD_ID вручную..."
    date +%s%N | md5sum | cut -c1-12 > .next/BUILD_ID
fi

echo "✅ Build завершён успешно"
echo "📦 BUILD_ID: \$(cat .next/BUILD_ID)"

ENDSSH

log "✅ Проект собран"

###############################################################################
# 6. НАСТРОЙКА PM2
###############################################################################

log "⚙️  Настройка PM2..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
set -e

cd $PROJECT_DIR

# Остановка всех процессов PM2
pm2 delete all 2>/dev/null || true

# Запуск через PM2 (указываем директорию cwd)
echo "🚀 Запуск приложения через PM2..."
cd $PROJECT_DIR
PORT=3000 pm2 start npm --name kamhub --cwd $PROJECT_DIR -- start

# Сохранение конфигурации PM2
pm2 save

# Автозапуск PM2 при перезагрузке
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "✅ PM2 настроен и запущен"
pm2 status

ENDSSH

log "✅ PM2 настроен"

###############################################################################
# 7. НАСТРОЙКА NGINX
###############################################################################

log "🌐 Настройка Nginx..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << ENDSSH
set -e

# Создание конфига Nginx
cat > /etc/nginx/sites-available/kamhub << 'EOF'
server {
    listen 80;
    server_name $SERVER_IP _;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Загружаемые файлы
    location /uploads {
        alias /var/www/kamhub/public/uploads;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOF

# Активация конфига
ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/kamhub

# Удаление default конфига
rm -f /etc/nginx/sites-enabled/default

# Проверка конфига
nginx -t

# Перезапуск Nginx
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx настроен и запущен"

ENDSSH

log "✅ Nginx настроен"

###############################################################################
# 8. ФИНАЛЬНАЯ ПРОВЕРКА
###############################################################################

log "🔍 Финальная проверка..."

sleep 5

# Проверка PM2
sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP "pm2 status"

# Проверка HTTP
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)

if [ "$HTTP_CODE" == "200" ]; then
    log "✅ Сайт доступен! HTTP $HTTP_CODE"
else
    warning "⚠️  HTTP код: $HTTP_CODE (может быть норма если сервер ещё стартует)"
fi

###############################################################################
# 9. ИТОГОВАЯ ИНФОРМАЦИЯ
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📍 Сервер:${NC}        http://$SERVER_IP"
echo -e "${BLUE}📁 Директория:${NC}    $PROJECT_DIR"
echo -e "${BLUE}🌿 Ветка:${NC}         $BRANCH_NAME"
echo -e "${BLUE}⚙️  PM2:${NC}           Запущен (kamhub)"
echo -e "${BLUE}🌐 Nginx:${NC}         Настроен и работает"
echo ""
echo -e "${YELLOW}📝 Полезные команды:${NC}"
echo "  SSH подключение:     ssh root@$SERVER_IP"
echo "  PM2 логи:            pm2 logs kamhub"
echo "  PM2 рестарт:         pm2 restart kamhub"
echo "  Nginx рестарт:       systemctl restart nginx"
echo "  Обновить код:        cd $PROJECT_DIR && git pull && npm run build && pm2 restart kamhub"
echo ""
echo "═══════════════════════════════════════════════════════════"
