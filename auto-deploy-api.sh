#!/bin/bash
###############################################################################
# KAMCHATOUR HUB - АВТОМАТИЧЕСКИЙ ДЕПЛОЙ ЧЕРЕЗ SSH (с паролем)
# Использует sshpass для автоматической аутентификации
###############################################################################

set -e

SERVER="5.129.248.224"
USER="root"
PASSWORD="xQvB1pv?yZTjaR"

echo "🚀 Kamchatour Hub - Автоматический деплой на Timeweb"
echo "======================================================="
echo ""
echo "Сервер: $SERVER"
echo ""

# Проверка наличия sshpass
if ! command -v sshpass &> /dev/null; then
    echo "📦 Установка sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    else
        echo "❌ Не удалось установить sshpass. Установите вручную."
        exit 1
    fi
fi

echo "✅ sshpass установлен"
echo ""

# Функция для выполнения команд на сервере
run_cmd() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$USER@$SERVER" "$1"
}

# Проверка подключения
echo "🔌 Проверка SSH подключения..."
if ! run_cmd "echo 'Connected'"; then
    echo "❌ Не удалось подключиться к серверу!"
    echo "Попробуйте вручную: ssh root@$SERVER"
    exit 1
fi
echo "✅ SSH подключение работает"
echo ""

# Создание скрипта деплоя на сервере
echo "📝 Создание скрипта деплоя на сервере..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" bash << 'REMOTE_SCRIPT'
set -e

echo "🚀 Начинаем деплой на сервере..."

# Обновление системы
echo "📦 Обновление системы..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# Установка базовых пакетов
echo "📦 Установка базовых пакетов..."
apt-get install -y curl wget git build-essential nginx postgresql-client

# Установка Node.js 20
echo "📦 Установка Node.js 20..."
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v) установлен"

# Установка PM2
echo "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "✅ PM2 установлен"

# Клонирование/обновление репозитория
echo "📦 Подготовка проекта..."
mkdir -p /var/www
cd /var/www

if [ -d "kamchatour" ]; then
    echo "📂 Обновление существующего репозитория..."
    cd kamchatour
    git fetch --all
    git checkout cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b
    git pull
else
    echo "📂 Клонирование репозитория..."
    git clone https://github.com/PosPk/kamhub.git kamchatour
    cd kamchatour
    git checkout cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b
fi

# Создание .env.production
echo "⚙️ Создание .env.production..."
cat > .env.production << 'ENV_EOF'
# DATABASE
DATABASE_URL=postgresql://localhost:5432/kamhub
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

# SECURITY
JWT_SECRET=production-secret-kamchatour-2025-secure-random-string
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# APPLICATION
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://5.129.248.224
PORT=3000

# YANDEX WEATHER API (КРИТИЧНО!)
YANDEX_WEATHER_API_KEY=8f6b0a53-135f-4217-8de1-de98c1316cc0

# YANDEX MAPS
YANDEX_MAPS_API_KEY=

# TIMEWEB CLOUD
TIMEWEB_TOKEN=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p

# S3 STORAGE
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
S3_REGION=ru-1

# AI SERVICES (optional)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
ENV_EOF

echo "✅ .env.production создан"

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm ci --production=false

# Сборка
echo "🔨 Сборка проекта..."
npm run build

# Запуск через PM2
echo "🚀 Запуск через PM2..."
pm2 delete kamchatour-hub 2>/dev/null || true
pm2 start npm --name "kamchatour-hub" -- start
pm2 save
pm2 startup systemd -u root --hp /root | grep -v 'PM2' | bash || true

# Настройка Nginx
echo "🌐 Настройка Nginx..."
cat > /etc/nginx/sites-available/kamchatour << 'NGINX_EOF'
server {
    listen 80;
    server_name 5.129.248.224;
    
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Firewall
echo "🔒 Настройка Firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo ""
echo "🌐 Приложение доступно: http://5.129.248.224"
echo ""
echo "📊 Статус PM2:"
pm2 status

REMOTE_SCRIPT

echo ""
echo "======================================================="
echo "✅ ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!"
echo "======================================================="
echo ""
echo "🌐 Приложение доступно по адресу:"
echo "   http://5.129.248.224"
echo ""
echo "📊 Проверка:"
echo "   curl http://5.129.248.224/api/health"
echo "   curl \"http://5.129.248.224/api/weather?lat=53&lng=158\""
echo ""
