#!/bin/bash
# Быстрый деплой KamHub на Timeweb Cloud

echo "🚀 Быстрый деплой KamHub на Timeweb Cloud..."

# Параметры сервера
SERVER_IP="45.8.96.120"
SERVER_USER="root"
SERVER_PATH="/var/www/kamhub"

echo "📡 Подключаемся к серверу $SERVER_IP..."

# Проверка подключения
echo "Проверяем SSH..."
ssh $SERVER_USER@$SERVER_IP "echo 'SSH работает'" || { echo "❌ SSH не работает"; exit 1; }

echo "✅ SSH подключение OK"

# Обновление кода
echo "📦 Обновляем код..."
ssh $SERVER_USER@$SERVER_IP "
cd $SERVER_PATH || git clone https://github.com/PosPk/kamhub.git $SERVER_PATH
cd $SERVER_PATH
git fetch origin
git reset --hard origin/main
git clean -fd
echo '✅ Код обновлён'
"

# Копирование конфигурации
echo "⚙️ Копируем конфигурацию..."
if [ -f timeweb-production.env ]; then
    scp timeweb-production.env $SERVER_USER@$SERVER_IP:$SERVER_PATH/.env
    echo "✅ Конфигурация скопирована"
else
    echo "❌ timeweb-production.env не найден"
    exit 1
fi

# Установка зависимостей
echo "📦 Устанавливаем зависимости..."
ssh $SERVER_USER@$SERVER_IP "
cd $SERVER_PATH
npm install
echo '✅ Зависимости установлены'
"

# Сборка приложения
echo "🔨 Собираем приложение..."
ssh $SERVER_USER@$SERVER_IP "
cd $SERVER_PATH
npm run build
echo '✅ Приложение собрано'
"

# Запуск через PM2
echo "🚀 Запускаем приложение..."
ssh $SERVER_USER@$SERVER_IP "
cd $SERVER_PATH
pm2 delete kamhub 2>/dev/null || true
pm2 start npm --name kamhub -- start
pm2 save
echo '✅ Приложение запущено'
"

# Настройка Nginx
echo "🌐 Настраиваем Nginx..."
ssh $SERVER_USER@$SERVER_IP "
cp $SERVER_PATH/nginx.conf /etc/nginx/sites-available/kamhub 2>/dev/null || true
ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/kamhub 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx
echo '✅ Nginx настроен'
"

echo ""
echo "🎉 ДЕПЛОЙ ЗАВЕРШЁН!"
echo ""
echo "🌐 KamHub доступен по адресу:"
echo "   http://$SERVER_IP:3000"
echo "   http://kamhub.ru (если DNS настроен)"
echo ""
echo "📊 Проверка статуса:"
echo "   ssh $SERVER_USER@$SERVER_IP 'pm2 list'"
echo "   ssh $SERVER_USER@$SERVER_IP 'pm2 logs kamhub'"


