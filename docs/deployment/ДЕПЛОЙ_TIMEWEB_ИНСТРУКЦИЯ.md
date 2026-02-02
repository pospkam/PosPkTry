# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ KAMHUB НА TIMEWEB

**Дата:** 7 ноября 2025  
**Проект:** KamHub v1.0.0  
**Сервер:** Timeweb Cloud

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### 1. Данные от Timeweb (у вас есть):
```
✅ SSH: root@5.129.248.224
✅ Пароль: xQvB1pv?yZTjaR
✅ Server ID: 5898003
✅ API Token: eyJhbGciOiJSUzUxMiIs...

✅ S3 Storage:
   - Endpoint: https://s3.twcstorage.ru
   - Access Key: F2CP4X3X17GVQ1YH5I5D
   - Secret Key: 72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
   
✅ Swift Storage:
   - Endpoint: https://swift.twcstorage.ru
   - Account: pa422108:swift
   - Key: D7Chc5DqTHtC5pQhEHaQVrkoBOZzanUHGaujCvOw
   - Region: ru-1
```

### 2. Проверить локально:
```bash
# Проверка сборки
npm run build

# Проверка тестов (если есть)
npm test
```

---

## 🔧 ШАГ 1: ПОДКЛЮЧЕНИЕ К СЕРВЕРУ

### Подключение по SSH:
```bash
ssh root@5.129.248.224
# Пароль: xQvB1pv?yZTjaR
```

### Первоначальная настройка сервера:
```bash
# Обновление системы
apt update && apt upgrade -y

# Установка необходимых пакетов
apt install -y curl wget git build-essential

# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверка версий
node -v  # должно быть v18.x
npm -v   # должно быть 9.x+

# Установка PM2 (для управления процессами)
npm install -g pm2

# Установка PostgreSQL 14
apt install -y postgresql-14 postgresql-contrib-14 postgis

# Запуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql
```

---

## 🗄️ ШАГ 2: НАСТРОЙКА БАЗЫ ДАННЫХ

### Создание базы данных:
```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# В psql выполнить:
CREATE DATABASE kamhub;
CREATE USER kamhub_user WITH ENCRYPTED PASSWORD 'ваш_надёжный_пароль';
GRANT ALL PRIVILEGES ON DATABASE kamhub TO kamhub_user;

# Включить расширения
\c kamhub
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

# Выйти
\q
```

### Применение SQL схем:
```bash
# Скопировать SQL файлы на сервер (из локальной машины)
# Выполнить на локальной машине:
scp -r lib/database root@5.129.248.224:/root/kamhub-sql/

# На сервере применить схемы:
cd /root/kamhub-sql

# Применить основную схему
psql -U kamhub_user -d kamhub -f schema.sql

# Применить все дополнительные схемы
psql -U kamhub_user -d kamhub -f accommodation_schema.sql
psql -U kamhub_user -d kamhub -f transfer_schema.sql
psql -U kamhub_user -d kamhub -f transfer_payments_schema.sql
psql -U kamhub_user -d kamhub -f seat_holds_schema.sql
psql -U kamhub_user -d kamhub -f operators_schema.sql
psql -U kamhub_user -d kamhub -f loyalty_schema.sql
psql -U kamhub_user -d kamhub -f agent_schema.sql
psql -U kamhub_user -d kamhub -f admin_schema.sql
psql -U kamhub_user -d kamhub -f transfer_operator_schema.sql
psql -U kamhub_user -d kamhub -f souvenirs_schema.sql
psql -U kamhub_user -d kamhub -f gear_schema.sql
psql -U kamhub_user -d kamhub -f cars_schema.sql

# Применить миграции
psql -U kamhub_user -d kamhub -f migrations/001_update_roles.sql
```

---

## 📦 ШАГ 3: ДЕПЛОЙ ПРИЛОЖЕНИЯ

### Вариант A: Деплой через Git (рекомендуется):
```bash
# На сервере создать директорию
mkdir -p /var/www/kamhub
cd /var/www/kamhub

# Клонировать репозиторий
git clone https://github.com/ваш-username/kamhub.git .

# Или скопировать файлы напрямую с локальной машины:
# На локальной машине:
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ root@5.129.248.224:/var/www/kamhub/

# На сервере:
cd /var/www/kamhub

# Установить зависимости
npm ci --production

# Создать .env файл
nano .env
```

### Вариант B: Деплой через архив:
```bash
# На локальной машине создать архив:
tar -czf kamhub-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  .

# Скопировать на сервер:
scp kamhub-deploy.tar.gz root@5.129.248.224:/var/www/

# На сервере распаковать:
cd /var/www
tar -xzf kamhub-deploy.tar.gz
mv kamhub kamhub-app  # переименовать если нужно
cd kamhub-app

# Установить зависимости
npm ci --production
```

---

## 🔐 ШАГ 4: НАСТРОЙКА ENVIRONMENT VARIABLES

### Создать файл .env.production:
```bash
cd /var/www/kamhub
nano .env.production
```

### Содержимое .env.production:
```env
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_BASE_URL=https://kamhub.ru

# Database
DATABASE_URL=postgresql://kamhub_user:ваш_пароль@localhost:5432/kamhub
DATABASE_SSL=false
DATABASE_POOL_MAX=20

# Auth
JWT_SECRET=ваш_сверхсекретный_ключ_минимум_32_символа
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=https://kamhub.ru/api

# CloudPayments
CLOUDPAYMENTS_PUBLIC_KEY=pk_ваш_публичный_ключ
CLOUDPAYMENTS_API_SECRET=ваш_секретный_ключ
CLOUDPAYMENTS_WEBHOOK_SECRET=ваш_webhook_секрет

# AI Providers
GROQ_API_KEY=ваш_groq_api_key
DEEPSEEK_API_KEY=ваш_deepseek_api_key
OPENROUTER_API_KEY=ваш_openrouter_api_key

# Email (Yandex SMTP)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@kamhub.ru
SMTP_PASSWORD=ваш_email_пароль
SMTP_FROM="KamHub <noreply@kamhub.ru>"

# Yandex Maps
NEXT_PUBLIC_YANDEX_MAPS_KEY=ваш_yandex_maps_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token
TELEGRAM_CHAT_ID=ваш_chat_id

# S3 Storage (Timeweb)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_ACCESS_KEY_ID=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_ACCESS_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
S3_BUCKET=kamhub-uploads

# Monitoring
SENTRY_DSN=ваш_sentry_dsn  # опционально
```

### Установить права доступа:
```bash
chmod 600 .env.production
chown root:root .env.production
```

---

## 🏗️ ШАГ 5: СБОРКА И ЗАПУСК

### Сборка приложения:
```bash
cd /var/www/kamhub

# Сборка Next.js
npm run build

# Проверка сборки
ls -la .next
```

### Запуск через PM2:
```bash
# Создать PM2 конфигурацию
nano ecosystem.config.js
```

### Содержимое ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: 'kamhub',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/kamhub',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/var/log/kamhub/error.log',
    out_file: '/var/log/kamhub/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### Создать директорию для логов:
```bash
mkdir -p /var/log/kamhub
```

### Запустить приложение:
```bash
# Запуск через PM2
pm2 start ecosystem.config.js

# Проверить статус
pm2 status

# Просмотр логов
pm2 logs kamhub

# Сохранить конфигурацию PM2
pm2 save

# Автозапуск при перезагрузке
pm2 startup
```

---

## 🌐 ШАГ 6: НАСТРОЙКА NGINX (REVERSE PROXY)

### Установка Nginx:
```bash
apt install -y nginx

# Создать конфигурацию для kamhub
nano /etc/nginx/sites-available/kamhub
```

### Содержимое /etc/nginx/sites-available/kamhub:
```nginx
# Редирект с www на без www
server {
    listen 80;
    listen [::]:80;
    server_name www.kamhub.ru;
    return 301 https://kamhub.ru$request_uri;
}

# HTTP -> HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name kamhub.ru;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kamhub.ru;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/kamhub.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kamhub.ru/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'" always;

    # Logs
    access_log /var/log/nginx/kamhub-access.log;
    error_log /var/log/nginx/kamhub-error.log;

    # Client body size (для загрузки файлов)
    client_max_body_size 10M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Images caching
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

### Активировать конфигурацию:
```bash
# Создать символическую ссылку
ln -s /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/

# Удалить default конфигурацию
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## 🔒 ШАГ 7: SSL СЕРТИФИКАТ (Let's Encrypt)

### Установка Certbot:
```bash
apt install -y certbot python3-certbot-nginx

# Получить SSL сертификат
certbot --nginx -d kamhub.ru -d www.kamhub.ru

# Следовать инструкциям:
# - Ввести email
# - Согласиться с условиями
# - Выбрать редирект HTTPS (рекомендуется)

# Автоматическое обновление сертификата
certbot renew --dry-run

# Добавить в cron для автообновления
crontab -e
# Добавить строку:
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 🔥 ШАГ 8: НАСТРОЙКА FIREWALL

### UFW (Uncomplicated Firewall):
```bash
# Установка UFW
apt install -y ufw

# Разрешить SSH
ufw allow 22/tcp

# Разрешить HTTP и HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Разрешить PostgreSQL только локально
ufw allow from 127.0.0.1 to any port 5432

# Включить firewall
ufw enable

# Проверить статус
ufw status verbose
```

---

## 📊 ШАГ 9: МОНИТОРИНГ И ЛОГИ

### Просмотр логов PM2:
```bash
# Все логи
pm2 logs

# Логи приложения kamhub
pm2 logs kamhub

# Последние 100 строк
pm2 logs kamhub --lines 100

# Ошибки
pm2 logs kamhub --err

# Очистить логи
pm2 flush
```

### Просмотр логов Nginx:
```bash
# Access log
tail -f /var/log/nginx/kamhub-access.log

# Error log
tail -f /var/log/nginx/kamhub-error.log
```

### Мониторинг PM2:
```bash
# Dashboard
pm2 monit

# Информация о процессе
pm2 info kamhub

# Использование ресурсов
pm2 list
```

---

## 🔄 ШАГ 10: ОБНОВЛЕНИЕ ПРИЛОЖЕНИЯ

### Скрипт для обновления:
```bash
nano /root/update-kamhub.sh
```

### Содержимое update-kamhub.sh:
```bash
#!/bin/bash

echo "🚀 Обновление KamHub..."

cd /var/www/kamhub

# Создать backup
echo "📦 Создание backup..."
tar -czf /root/backups/kamhub-$(date +%Y%m%d-%H%M%S).tar.gz .

# Git pull или копирование файлов
echo "⬇️ Загрузка новой версии..."
git pull origin main

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm ci --production

# Сборка
echo "🏗️ Сборка приложения..."
npm run build

# Перезапуск PM2
echo "🔄 Перезапуск приложения..."
pm2 restart kamhub

echo "✅ Обновление завершено!"
pm2 status
```

### Сделать исполняемым:
```bash
chmod +x /root/update-kamhub.sh

# Создать директорию для backup
mkdir -p /root/backups
```

### Использование:
```bash
/root/update-kamhub.sh
```

---

## 🔒 ШАГ 11: BACKUP БАЗЫ ДАННЫХ

### Скрипт автоматического backup:
```bash
nano /root/backup-db.sh
```

### Содержимое backup-db.sh:
```bash
#!/bin/bash

BACKUP_DIR="/root/backups/db"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kamhub-db-$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Backup базы данных
pg_dump -U kamhub_user kamhub | gzip > $BACKUP_FILE

# Удалить backup старше 7 дней
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup создан: $BACKUP_FILE"
```

### Автоматизация:
```bash
chmod +x /root/backup-db.sh

# Добавить в cron (каждый день в 2:00)
crontab -e
# Добавить:
0 2 * * * /root/backup-db.sh >> /var/log/backup-db.log 2>&1
```

---

## ✅ ШАГ 12: ФИНАЛЬНАЯ ПРОВЕРКА

### Проверить все сервисы:
```bash
# Статус PostgreSQL
systemctl status postgresql

# Статус Nginx
systemctl status nginx

# Статус PM2
pm2 status

# Проверка приложения
curl http://localhost:3000/api/health

# Проверка через Nginx
curl https://kamhub.ru/api/health
```

### Проверить в браузере:
```
https://kamhub.ru
https://kamhub.ru/api/health
https://kamhub.ru/hub/tourist
https://kamhub.ru/hub/operator
https://kamhub.ru/hub/admin
```

---

## 🎉 ГОТОВО!

Ваше приложение KamHub запущено на production!

### Полезные команды:
```bash
# Перезапуск приложения
pm2 restart kamhub

# Перезапуск Nginx
systemctl restart nginx

# Просмотр логов
pm2 logs kamhub
tail -f /var/log/nginx/kamhub-error.log

# Обновление приложения
/root/update-kamhub.sh

# Backup базы данных
/root/backup-db.sh
```

---

## 📞 ПОДДЕРЖКА

При возникновении проблем:
1. Проверить логи PM2: `pm2 logs kamhub`
2. Проверить логи Nginx: `tail -f /var/log/nginx/kamhub-error.log`
3. Проверить статус сервисов: `pm2 status` и `systemctl status nginx`
4. Проверить базу данных: `psql -U kamhub_user -d kamhub -c "SELECT COUNT(*) FROM users;"`

---

**Деплой готов!** 🚀

