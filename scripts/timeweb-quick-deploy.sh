#!/bin/bash

#######################################################
# KamHub - Быстрый деплой на Timeweb Cloud VDS
# Автоматическая установка всего необходимого
#######################################################

set -e  # Выход при любой ошибке

echo "========================================="
echo "  KamHub - Деплой на Timeweb Cloud"
echo "========================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Функция для вывода ошибки
error() {
    echo -e "${RED}✗${NC} $1"
}

# Функция для вывода предупреждения
warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Проверка, что скрипт запущен от root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен быть запущен от root"
   echo "Используйте: sudo bash $0"
   exit 1
fi

success "Скрипт запущен от root"

# Обновление системы
echo ""
echo "📦 Обновление системы..."
apt update && apt upgrade -y > /dev/null 2>&1
success "Система обновлена"

# Установка необходимых пакетов
echo ""
echo "📦 Установка базовых пакетов..."
apt install -y curl wget git build-essential ufw fail2ban > /dev/null 2>&1
success "Базовые пакеты установлены"

# Установка Node.js 20
echo ""
echo "📦 Установка Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    success "Node.js $(node -v) установлен"
else
    success "Node.js уже установлен: $(node -v)"
fi

# Установка PM2
echo ""
echo "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
    success "PM2 установлен"
else
    success "PM2 уже установлен"
fi

# Установка Nginx
echo ""
echo "📦 Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx > /dev/null 2>&1
    systemctl enable nginx > /dev/null 2>&1
    systemctl start nginx > /dev/null 2>&1
    success "Nginx установлен и запущен"
else
    success "Nginx уже установлен"
fi

# Установка PostgreSQL клиента
echo ""
echo "📦 Установка PostgreSQL клиента..."
apt install -y postgresql-client > /dev/null 2>&1
success "PostgreSQL клиент установлен"

# Настройка файрвола
echo ""
echo "🔒 Настройка файрвола..."
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1  # SSH
ufw allow 80/tcp > /dev/null 2>&1  # HTTP
ufw allow 443/tcp > /dev/null 2>&1 # HTTPS
success "Файрвол настроен (порты 22, 80, 443 открыты)"

# Настройка Fail2Ban
echo ""
echo "🔒 Настройка защиты от брутфорса..."
systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1
success "Fail2Ban настроен и запущен"

# Создание директории для проекта
echo ""
echo "📁 Создание директории проекта..."
mkdir -p /var/www
success "Директория /var/www создана"

# Получение данных для клонирования
echo ""
echo "========================================="
echo "Теперь нужно клонировать репозиторий"
echo "========================================="
echo ""
read -p "Введите URL репозитория (например: https://github.com/user/kamhub.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    error "URL репозитория не может быть пустым"
    exit 1
fi

# Клонирование репозитория
echo ""
echo "📥 Клонирование репозитория..."
cd /var/www
if [ -d "kamhub" ]; then
    warning "Директория kamhub уже существует. Удаляю..."
    rm -rf kamhub
fi

git clone $REPO_URL kamhub
if [ $? -eq 0 ]; then
    success "Репозиторий склонирован в /var/www/kamhub"
else
    error "Ошибка при клонировании репозитория"
    exit 1
fi

cd /var/www/kamhub

# Установка зависимостей
echo ""
echo "📦 Установка зависимостей проекта (это займет время)..."
npm install > /dev/null 2>&1
success "Зависимости установлены"

# Создание .env файла
echo ""
echo "========================================="
echo "Настройка переменных окружения"
echo "========================================="
echo ""

read -p "Введите DATABASE_URL (из панели Timeweb БД): " DATABASE_URL
read -p "Введите GROQ_API_KEY (или Enter чтобы пропустить): " GROQ_API_KEY
read -p "Введите JWT_SECRET (или Enter для автогенерации): " JWT_SECRET

# Автогенерация JWT_SECRET если не указан
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    success "JWT_SECRET автоматически сгенерирован"
fi

# Получение IP сервера
SERVER_IP=$(curl -s ifconfig.me)

# Создание .env файла
cat > /var/www/kamhub/.env << EOF
# Сгенерировано автоматически $(date)

DATABASE_URL=$DATABASE_URL

GROQ_API_KEY=$GROQ_API_KEY
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

YANDEX_MAPS_API_KEY=

CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=

JWT_SECRET=$JWT_SECRET
CSRF_SECRET=$(openssl rand -base64 32)

NEXT_PUBLIC_APP_URL=http://$SERVER_IP

NODE_ENV=production
EOF

success ".env файл создан"

# Проверка подключения к БД
echo ""
echo "🔍 Проверка подключения к базе данных..."
if npm run db:test > /dev/null 2>&1; then
    success "Подключение к БД успешно"
else
    warning "Не удалось подключиться к БД. Проверьте DATABASE_URL"
fi

# Применение миграций
echo ""
echo "🗄️  Применение миграций базы данных..."
npm run migrate:up
if [ $? -eq 0 ]; then
    success "Миграции применены"
else
    warning "Ошибка при применении миграций"
fi

# Сборка проекта
echo ""
echo "🏗️  Сборка проекта (это займет 2-5 минут)..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    success "Проект собран"
else
    error "Ошибка при сборке проекта"
    exit 1
fi

# Запуск через PM2
echo ""
echo "🚀 Запуск приложения через PM2..."
pm2 delete kamhub > /dev/null 2>&1 || true
pm2 start ecosystem.config.js > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
success "Приложение запущено через PM2"

# Настройка Nginx
echo ""
echo "⚙️  Настройка Nginx..."

cat > /etc/nginx/sites-available/kamhub << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Увеличиваем таймауты для AI
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1 && systemctl restart nginx > /dev/null 2>&1
success "Nginx настроен и перезапущен"

# Создание скрипта для backup
echo ""
echo "💾 Создание скрипта backup..."
mkdir -p /root/backups

cat > /root/backup-kamhub.sh << 'EOF'
#!/bin/bash
# Извлекаем данные из DATABASE_URL
DB_URL=$(grep DATABASE_URL /var/www/kamhub/.env | cut -d '=' -f2)
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

# Создаем backup
pg_dump "$DB_URL" > $BACKUP_DIR/kamhub_$DATE.sql

# Удаляем старые backup (>7 дней)
find $BACKUP_DIR -name "kamhub_*.sql" -mtime +7 -delete

echo "Backup completed: kamhub_$DATE.sql"
EOF

chmod +x /root/backup-kamhub.sh
success "Скрипт backup создан: /root/backup-kamhub.sh"

# Финальный вывод
echo ""
echo "========================================="
echo "           🎉 ГОТОВО!"
echo "========================================="
echo ""
success "KamHub успешно задеплоен на Timeweb Cloud!"
echo ""
echo "📊 Информация:"
echo "   • URL: http://$SERVER_IP"
echo "   • Проект: /var/www/kamhub"
echo "   • Конфиг: /var/www/kamhub/.env"
echo ""
echo "🔧 Полезные команды:"
echo "   • pm2 status          - Статус приложения"
echo "   • pm2 logs kamhub     - Логи приложения"
echo "   • pm2 restart kamhub  - Перезапуск"
echo "   • pm2 monit           - Мониторинг"
echo ""
echo "🔄 Обновление проекта:"
echo "   cd /var/www/kamhub"
echo "   git pull"
echo "   npm install"
echo "   npm run build"
echo "   pm2 reload kamhub"
echo ""
echo "📚 Документация:"
echo "   • docs/TIMEWEB_DEPLOYMENT.md"
echo "   • docs/ARCHITECTURE_GUIDE.md"
echo ""
warning "Не забудьте:"
echo "   1. Настроить домен (если нужно)"
echo "   2. Установить SSL (certbot --nginx)"
echo "   3. Настроить backup в cron"
echo "   4. Заполнить остальные API ключи в .env"
echo ""
success "Откройте в браузере: http://$SERVER_IP"
echo ""



