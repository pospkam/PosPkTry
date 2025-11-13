#!/bin/bash

# ============================================
# АВТОМАТИЧЕСКИЙ ДЕПЛОЙ KAMHUB НА TIMEWEB
# ============================================

set -e

SERVER_IP="5.129.248.224"
SERVER_USER="root"
SERVER_PASS="xQvB1pv?yZTjaR"
PROJECT_NAME="kamhub"
DEPLOY_DIR="/var/www/$PROJECT_NAME"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                        ║${NC}"
echo -e "${BLUE}║   🏔️  KAMHUB DEPLOY TO TIMEWEB  🏔️    ║${NC}"
echo -e "${BLUE}║                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Сервер:${NC} $SERVER_IP"
echo -e "${GREEN}Проект:${NC} $PROJECT_NAME"
echo ""

# Функция для выполнения команд на сервере
run_on_server() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# ============================================
# ШАГ 1: ПРОВЕРКА ПОДКЛЮЧЕНИЯ
# ============================================
echo -e "${BLUE}▶${NC} Шаг 1/10: Проверка подключения к серверу..."

if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} sshpass не установлен. Устанавливаю..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        sudo apt-get install -y sshpass
    fi
fi

if run_on_server "echo 'OK'" | grep -q "OK"; then
    echo -e "${GREEN}✓${NC} Подключение успешно"
else
    echo -e "${RED}❌ Не удалось подключиться к серверу!${NC}"
    exit 1
fi

echo ""

# ============================================
# ШАГ 2: УСТАНОВКА DOCKER
# ============================================
echo -e "${BLUE}▶${NC} Шаг 2/10: Установка Docker..."

run_on_server "
    if ! command -v docker &> /dev/null; then
        apt update
        apt install -y apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        apt install -y docker-compose
        systemctl enable docker
        systemctl start docker
        echo 'Docker установлен'
    else
        echo 'Docker уже установлен'
    fi
"

echo -e "${GREEN}✓${NC} Docker готов"
echo ""

# ============================================
# ШАГ 3: КЛОНИРОВАНИЕ ПРОЕКТА
# ============================================
echo -e "${BLUE}▶${NC} Шаг 3/10: Клонирование проекта..."

# Создаём архив проекта локально (без node_modules и .next)
tar -czf kamhub-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.md' \
    --exclude='coverage' \
    --exclude='dist' \
    .

# Копируем на сервер
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no kamhub-deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"

# Распаковываем на сервере
run_on_server "
    mkdir -p $DEPLOY_DIR
    cd $DEPLOY_DIR
    tar -xzf /tmp/kamhub-deploy.tar.gz
    rm /tmp/kamhub-deploy.tar.gz
"

# Удаляем локальный архив
rm kamhub-deploy.tar.gz

echo -e "${GREEN}✓${NC} Проект развёрнут в $DEPLOY_DIR"
echo ""

# ============================================
# ШАГ 4: НАСТРОЙКА .ENV
# ============================================
echo -e "${BLUE}▶${NC} Шаг 4/10: Настройка переменных окружения..."

# Копируем .env.production на сервер
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no .env.production "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/.env"

echo -e "${GREEN}✓${NC} .env файл настроен"
echo ""

# ============================================
# СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЮ
# ============================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                            ║${NC}"
echo -e "${YELLOW}║  ⚠️  ВАЖНО! НЕОБХОДИМА ВАША ПОМОЩЬ  ⚠️                     ║${NC}"
echo -e "${YELLOW}║                                                            ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Для продолжения деплоя нужно:${NC}"
echo ""
echo -e "${YELLOW}1.${NC} Создать PostgreSQL базу данных в Timeweb Cloud:"
echo -e "   ${BLUE}https://timeweb.cloud/my/databases${NC}"
echo -e "   - СУБД: PostgreSQL 15"
echo -e "   - Имя: kamhub"
echo -e "   - После создания скопируйте connection string"
echo ""
echo -e "${YELLOW}2.${NC} Обновить .env файл на сервере с реальным DATABASE_URL:"
echo -e "   ${BLUE}ssh root@$SERVER_IP${NC}"
echo -e "   ${BLUE}nano $DEPLOY_DIR/.env${NC}"
echo -e "   Заменить DATABASE_URL=... на ваш реальный"
echo ""
echo -e "${YELLOW}3.${NC} Запустить деплой повторно или продолжить вручную"
echo ""
echo -e "${GREEN}После этого я продолжу автоматический деплой!${NC}"
echo ""

exit 0


