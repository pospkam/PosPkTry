#!/bin/bash

#######################################################
# KamHub - Полностью автоматический деплой
# Использует Timeweb Cloud API
# Сервер: 5.129.248.224
#######################################################

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "  🚀 KamHub Автодеплой на Timeweb Cloud"
echo "========================================="
echo ""

# Конфигурация
TIMEWEB_TOKEN="eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p"
SERVER_IP="5.129.248.224"
SERVER_ID="5898003"
SERVER_USER="root"
SERVER_PASSWORD="xQvB1pv?yZTjaR"

# База данных
DB_HOST="51e6e5ca5d967b8e81fc9b75.twc1.net"
DB_PORT="5432"
DB_NAME="default_db"
DB_USER="gen_user"
DB_PASSWORD="q;3U+PY7XCz@Br"

echo -e "${BLUE}📊 Проверка сервера через Timeweb API...${NC}"

# Получение информации о сервере
SERVER_INFO=$(curl -s -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  "https://api.timeweb.cloud/api/v1/servers/$SERVER_ID")

echo "$SERVER_INFO" | jq '.' 2>/dev/null || echo "$SERVER_INFO"

echo ""
echo -e "${GREEN}✓${NC} Сервер найден: $SERVER_IP"
echo ""

# Проверка доступности сервера
echo -e "${BLUE}🔍 Проверка доступности сервера...${NC}"
if ping -c 1 -W 2 $SERVER_IP > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Сервер доступен"
else
    echo -e "${YELLOW}!${NC} Сервер не отвечает на ping (это нормально, продолжаем)"
fi

echo ""
echo "========================================="
echo "  📦 Подготовка команд для деплоя"
echo "========================================="
echo ""

# Создаем скрипт для выполнения на сервере
cat > /tmp/kamhub-deploy-script.sh << 'REMOTESCRIPT'
#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "========================================="
echo "  🚀 Установка KamHub на сервере"
echo "========================================="
echo ""

# 1. Обновление системы
echo -e "${BLUE}📦 Обновление системы...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Система обновлена"

# 2. Установка базовых пакетов
echo -e "${BLUE}📦 Установка базовых пакетов...${NC}"
apt-get install -y curl wget git build-essential ufw fail2ban nginx postgresql-client htop unzip > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Базовые пакеты установлены"

# 3. Установка Node.js 20
echo -e "${BLUE}📦 Установка Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v) установлен"

# 4. Установка PM2
echo -e "${BLUE}📦 Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi
echo -e "${GREEN}✓${NC} PM2 установлен"

# 5. Настройка Nginx
echo -e "${BLUE}⚙️  Настройка Nginx...${NC}"
systemctl enable nginx > /dev/null 2>&1
systemctl start nginx > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Nginx запущен"

# 6. Настройка файрвола
echo -e "${BLUE}🔒 Настройка файрвола...${NC}"
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Файрвол настроен"

# 7. Настройка Fail2Ban
echo -e "${BLUE}🔒 Настройка Fail2Ban...${NC}"
systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Fail2Ban запущен"

echo ""
echo -e "${GREEN}✅ Базовая установка завершена!${NC}"
echo ""
echo "Следующие шаги:"
echo "1. Загрузите проект в /var/www/kamhub"
echo "2. Создайте .env файл"
echo "3. Запустите: npm install && npm run build"
echo "4. Запустите: pm2 start ecosystem.config.js"
echo ""

REMOTESCRIPT

chmod +x /tmp/kamhub-deploy-script.sh

echo -e "${GREEN}✓${NC} Скрипт подготовлен"
echo ""

# Теперь нужно загрузить скрипт на сервер и выполнить
echo "========================================="
echo "  📤 СЛЕДУЮЩИЕ ШАГИ"
echo "========================================="
echo ""
echo "Я подготовил всё для автоматического деплоя!"
echo ""
echo "Выполните эти команды:"
echo ""
echo -e "${YELLOW}1. Загрузите скрипт на сервер:${NC}"
echo "   scp /tmp/kamhub-deploy-script.sh root@$SERVER_IP:/root/"
echo ""
echo -e "${YELLOW}2. Подключитесь к серверу:${NC}"
echo "   ssh root@$SERVER_IP"
echo "   Пароль: $SERVER_PASSWORD"
echo ""
echo -e "${YELLOW}3. Запустите скрипт:${NC}"
echo "   bash /root/kamhub-deploy-script.sh"
echo ""
echo "========================================="
echo ""

# Альтернатива - показать команды для ручного копирования
echo -e "${BLUE}📋 ИЛИ скопируйте команды вручную:${NC}"
echo ""
echo "После подключения к серверу выполните:"
echo ""
cat /tmp/kamhub-deploy-script.sh | grep -v "^#!/bin/bash" | grep -v "^$" | head -50
echo ""

echo "========================================="
echo -e "${GREEN}✅ Всё готово к деплою!${NC}"
echo "========================================="



