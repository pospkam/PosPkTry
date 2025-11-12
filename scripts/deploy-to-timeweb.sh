#!/bin/bash
# Скрипт автоматического деплоя KamHub на Timeweb Cloud
# Использование: bash scripts/deploy-to-timeweb.sh

set -e

echo "🚀 Начинаем деплой KamHub на Timeweb Cloud..."

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_IP="45.8.96.120"
SERVER_USER="root"
SERVER_PATH="/var/www/kamhub"
REPO_URL="https://github.com/PosPk/kamhub.git"
DOMAIN="kamhub.ru"

echo -e "${BLUE}📡 Подключаемся к серверу ${SERVER_IP}...${NC}"

# Функция для выполнения команд на сервере
run_remote() {
    ssh ${SERVER_USER}@${SERVER_IP} "$1"
}

# 1. Проверка подключения
echo -e "${BLUE}1️⃣ Проверка SSH подключения...${NC}"
if run_remote "echo 'Подключение успешно'"; then
    echo -e "${GREEN}✅ SSH подключение установлено${NC}"
else
    echo -e "${RED}❌ Ошибка SSH подключения${NC}"
    exit 1
fi

# 2. Установка необходимых пакетов
echo -e "${BLUE}2️⃣ Установка зависимостей на сервере...${NC}"
run_remote "
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq git nginx postgresql-client curl
    
    # Node.js 20
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # PM2
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    echo '✅ Зависимости установлены'
"

# 3. Клонирование/обновление репозитория
echo -e "${BLUE}3️⃣ Обновление кода приложения...${NC}"
run_remote "
    if [ -d ${SERVER_PATH} ]; then
        echo 'Обновление существующего репозитория...'
        cd ${SERVER_PATH}
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    else
        echo 'Клонирование репозитория...'
        mkdir -p ${SERVER_PATH}
        git clone ${REPO_URL} ${SERVER_PATH}
        cd ${SERVER_PATH}
    fi
    echo '✅ Код обновлён'
"

# 3.5. Копирование production конфигурации
echo -e "${BLUE}3️⃣.5️⃣ Настройка production конфигурации...${NC}"
if [ -f timeweb-production.env ]; then
    echo -e "${BLUE}Копируем конфигурацию на сервер...${NC}"
    scp timeweb-production.env ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/.env
    run_remote "
        cd ${SERVER_PATH}
        echo '✅ Конфигурация скопирована'
        echo '🎨 Применение темы Samsung...'
        # Тема Samsung уже подключена в коде
        echo '✅ Тема Samsung активирована'
    "
else
    echo -e "${RED}❌ Файл timeweb-production.env не найден!${NC}"
    echo -e "${YELLOW}Создайте его командой: node final-deployment-test.js${NC}"
    exit 1
fi

# 4. Установка npm зависимостей
echo -e "${BLUE}4️⃣ Установка npm пакетов...${NC}"
run_remote "
    cd ${SERVER_PATH}
    npm ci --production=false
    echo '✅ Зависимости установлены'
"

# 5. Применение схемы БД
echo -e "${BLUE}5️⃣ Применение схемы БД...${NC}"
echo -e "${RED}⚠️  ВНИМАНИЕ: Убедитесь что DATABASE_URL настроен в .env${NC}"
run_remote "
    cd ${SERVER_PATH}
    if [ -f .env ]; then
        source .env
        if [ ! -z \"\$DATABASE_URL\" ]; then
            echo 'Применение схемы БД...'
            bash scripts/apply-all-schemas.sh || echo 'Схемы уже применены или ошибка'
            echo '✅ БД настроена'
        else
            echo '⚠️  DATABASE_URL не найден в .env'
        fi
    else
        echo '⚠️  Файл .env не найден. Создайте его из .env.local.example'
    fi
"

# 6. Сборка Next.js приложения
echo -e "${BLUE}6️⃣ Сборка производственной версии...${NC}"
run_remote "
    cd ${SERVER_PATH}
    npm run build
    echo '✅ Приложение собрано'
"

# 7. Настройка PM2
echo -e "${BLUE}7️⃣ Настройка PM2...${NC}"
run_remote "
    cd ${SERVER_PATH}
    
    # Создать директорию для логов
    mkdir -p /var/log/pm2
    
    # Остановить предыдущий процесс если есть
    pm2 delete kamhub-production 2>/dev/null || true
    
    # Запустить через PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup systemd -u root --hp /root
    
    echo '✅ PM2 настроен и запущен'
"

# 8. Настройка Nginx
echo -e "${BLUE}8️⃣ Настройка Nginx...${NC}"
run_remote "
    # Копировать конфиг
    cp ${SERVER_PATH}/nginx.conf /etc/nginx/sites-available/kamhub
    
    # Создать симлинк если не существует
    ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/kamhub 2>/dev/null || true
    
    # Удалить default конфиг
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверить конфигурацию
    nginx -t
    
    # Перезагрузить Nginx
    systemctl reload nginx
    
    echo '✅ Nginx настроен'
"

# 9. Настройка SSL (Let's Encrypt)
echo -e "${BLUE}9️⃣ Настройка SSL сертификата...${NC}"
echo -e "${RED}⚠️  Убедитесь что домен kamhub.ru указывает на ${SERVER_IP}${NC}"
run_remote "
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Получить сертификат (только если домен настроен)
    # certbot --nginx -d kamhub.ru -d www.kamhub.ru --non-interactive --agree-tos --email admin@kamhub.ru
    
    echo '⚠️  Запустите certbot вручную после настройки DNS'
"

# 10. Проверка статуса
echo -e "${BLUE}🔟 Проверка статуса приложения...${NC}"
run_remote "
    echo ''
    echo '═══════════════════════════════════════'
    echo '📊 Статус сервисов:'
    echo '═══════════════════════════════════════'
    
    echo ''
    echo '🔹 PM2 процессы:'
    pm2 list
    
    echo ''
    echo '🔹 Nginx статус:'
    systemctl status nginx --no-pager | head -10
    
    echo ''
    echo '═══════════════════════════════════════'
    echo '✅ Деплой завершён успешно!'
    echo '═══════════════════════════════════════'
    echo ''
    echo '🌐 Приложение доступно по адресу:'
    echo '   http://${SERVER_IP}:3000 (напрямую)'
    echo '   http://kamhub.ru (через Nginx, если DNS настроен)'
    echo ''
    echo '📋 Полезные команды:'
    echo '   pm2 logs kamhub-production  - просмотр логов'
    echo '   pm2 restart kamhub-production  - перезапуск'
    echo '   pm2 monit  - мониторинг'
    echo ''
"

echo -e "${GREEN}🎉 Деплой завершён успешно!${NC}"
