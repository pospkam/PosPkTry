# 🚀 РУКОВОДСТВО ПО ДЕПЛОЮ НА TIMEWEB
## KamHub - Пошаговая инструкция

**Дата:** 7 ноября 2025  
**Версия:** 1.0.0  
**Сервер:** 5.129.248.224 (Timeweb Cloud)

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### 1. Доступ к серверу
```bash
SSH: root@5.129.248.224
Password: xQvB1pv?yZTjaR
```

### 2. Доступ к БД PostgreSQL
```
Host: localhost
Port: 5432
Database: kamhub_production
User: kamhub_user
Password: [будет создан при установке]
```

### 3. API ключи (уже есть)
```
✅ Timeweb API: eyJhbGci...
✅ S3 Storage: d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
✅ Access Key: F2CP4X3X17GVQ1YH5I5D
✅ Secret Key: 72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
```

---

## 🎯 ШАГИ ДЕПЛОЯ

### ШАГ 1: Подключиться к серверу

```bash
ssh root@5.129.248.224
```

### ШАГ 2: Установить необходимое ПО

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Установить PostgreSQL 14
apt install -y postgresql postgresql-contrib postgis

# Установить PM2 для управления процессами
npm install -g pm2

# Установить Git
apt install -y git

# Установить Nginx
apt install -y nginx

# Установить certbot для SSL
apt install -y certbot python3-certbot-nginx
```

### ШАГ 3: Настроить PostgreSQL

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных и пользователя
CREATE DATABASE kamhub_production;
CREATE USER kamhub_user WITH ENCRYPTED PASSWORD 'KamHub2025!SecurePassword';
GRANT ALL PRIVILEGES ON DATABASE kamhub_production TO kamhub_user;

# Включить PostGIS
\c kamhub_production
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### ШАГ 4: Клонировать репозиторий

```bash
# Перейти в директорию проектов
cd /var/www

# Клонировать проект (замените на ваш репозиторий)
git clone https://github.com/YOUR_USERNAME/kamhub.git
cd kamhub

# Установить зависимости
npm install
```

### ШАГ 5: Применить SQL схемы

```bash
# Применить все схемы по порядку
export PGPASSWORD='KamHub2025!SecurePassword'

psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/accommodation_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/transfer_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/transfer_payments_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/seat_holds_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/operators_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/loyalty_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/agent_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/admin_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/transfer_operator_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/souvenirs_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/gear_schema.sql
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/cars_schema.sql

# Применить миграции
psql -h localhost -U kamhub_user -d kamhub_production -f lib/database/migrations/001_update_roles.sql

echo "✅ Все SQL схемы применены!"
```

### ШАГ 6: Настроить Environment Variables

```bash
# Создать .env.production
cat > .env.production << 'EOF'
# Database
DATABASE_URL=postgresql://kamhub_user:KamHub2025!SecurePassword@localhost:5432/kamhub_production
DATABASE_SSL=false

# App
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://kamhub.ru
PORT=3000

# Auth
JWT_SECRET=KamHub_Super_Secret_Key_2025_Production_XYZ123
JWT_EXPIRES_IN=7d

# CloudPayments
CLOUDPAYMENTS_PUBLIC_KEY=pk_YOUR_PUBLIC_KEY
CLOUDPAYMENTS_API_SECRET=YOUR_API_SECRET

# AI Providers
GROQ_API_KEY=YOUR_GROQ_KEY
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_KEY
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY

# Email (Yandex)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@kamhub.ru
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_FROM="KamHub <noreply@kamhub.ru>"

# Yandex Maps
NEXT_PUBLIC_YANDEX_MAPS_KEY=YOUR_YANDEX_MAPS_KEY

# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

# S3 Storage (Timeweb)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
S3_REGION=ru-1
EOF

chmod 600 .env.production
```

### ШАГ 7: Собрать проект

```bash
# Собрать Next.js приложение
npm run build

# Проверить, что сборка прошла успешно
ls -la .next
```

### ШАГ 8: Настроить PM2

```bash
# Создать конфигурацию PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kamhub',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/kamhub',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Создать директорию для логов
mkdir -p logs

# Запустить приложение
pm2 start ecosystem.config.js

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск PM2 при перезагрузке
pm2 startup
# Выполните команду, которую покажет PM2

# Проверить статус
pm2 status
pm2 logs kamhub
```

### ШАГ 9: Настроить Nginx

```bash
# Создать конфигурацию Nginx
cat > /etc/nginx/sites-available/kamhub << 'EOF'
server {
    listen 80;
    server_name kamhub.ru www.kamhub.ru;

    # Редирект на HTTPS (настроим позже с certbot)
    # return 301 https://$host$request_uri;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Статические файлы Next.js
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
EOF

# Активировать конфигурацию
ln -s /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx
systemctl enable nginx
```

### ШАГ 10: Настроить SSL (Let's Encrypt)

```bash
# Получить SSL сертификат
certbot --nginx -d kamhub.ru -d www.kamhub.ru

# Certbot автоматически настроит HTTPS
# Следуйте инструкциям на экране

# Проверить автообновление сертификата
certbot renew --dry-run
```

### ШАГ 11: Настроить Firewall

```bash
# Установить UFW
apt install -y ufw

# Разрешить SSH
ufw allow 22

# Разрешить HTTP и HTTPS
ufw allow 80
ufw allow 443

# Включить firewall
ufw enable

# Проверить статус
ufw status
```

### ШАГ 12: Создать демо-пользователей

```bash
# Войти в PostgreSQL
psql -h localhost -U kamhub_user -d kamhub_production

# Создать демо-пользователей для каждой роли
INSERT INTO users (id, email, name, role, created_at) VALUES
(gen_random_uuid(), 'tourist@kamhub.ru', 'Демо Турист', 'tourist', NOW()),
(gen_random_uuid(), 'operator@kamhub.ru', 'Демо Оператор', 'operator', NOW()),
(gen_random_uuid(), 'agent@kamhub.ru', 'Демо Агент', 'agent', NOW()),
(gen_random_uuid(), 'guide@kamhub.ru', 'Демо Гид', 'guide', NOW()),
(gen_random_uuid(), 'transfer@kamhub.ru', 'Демо Трансфер-Оператор', 'transfer', NOW()),
(gen_random_uuid(), 'admin@kamhub.ru', 'Демо Администратор', 'admin', NOW());

\q
```

---

## ✅ ПРОВЕРКА ДЕПЛОЯ

### 1. Проверить, что приложение работает

```bash
# Проверить статус PM2
pm2 status

# Проверить логи
pm2 logs kamhub --lines 50

# Проверить через curl
curl http://localhost:3000/api/health

# Проверить через браузер
curl http://kamhub.ru
```

### 2. Проверить базу данных

```bash
psql -h localhost -U kamhub_user -d kamhub_production -c "SELECT COUNT(*) FROM users;"
psql -h localhost -U kamhub_user -d kamhub_production -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

### 3. Тестовые запросы

```bash
# Health check
curl https://kamhub.ru/api/health

# Получить роли
curl https://kamhub.ru/api/roles

# Получить туры
curl https://kamhub.ru/api/tours

# Получить погоду
curl https://kamhub.ru/api/weather?lat=53.0375&lng=158.6556
```

---

## 🔧 УПРАВЛЕНИЕ ПРИЛОЖЕНИЕМ

### Перезапуск приложения
```bash
pm2 restart kamhub
```

### Обновление кода
```bash
cd /var/www/kamhub
git pull origin main
npm install
npm run build
pm2 restart kamhub
```

### Просмотр логов
```bash
pm2 logs kamhub
pm2 logs kamhub --lines 100
pm2 logs kamhub --err  # Только ошибки
```

### Мониторинг
```bash
pm2 monit
pm2 list
```

### Остановка/запуск
```bash
pm2 stop kamhub
pm2 start kamhub
pm2 delete kamhub
```

---

## 📊 МОНИТОРИНГ И БЭКАПЫ

### 1. Настроить автоматический бэкап БД

```bash
# Создать скрипт бэкапа
cat > /usr/local/bin/backup-kamhub.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/kamhub"
mkdir -p $BACKUP_DIR

# Бэкап базы данных
PGPASSWORD='KamHub2025!SecurePassword' pg_dump -h localhost -U kamhub_user kamhub_production | gzip > $BACKUP_DIR/kamhub_$DATE.sql.gz

# Удалить бэкапы старше 7 дней
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: kamhub_$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-kamhub.sh

# Добавить в cron (каждый день в 3:00)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-kamhub.sh") | crontab -
```

### 2. Настроить мониторинг (опционально)

```bash
# Установить htop для мониторинга
apt install -y htop

# Мониторинг ресурсов
htop

# Мониторинг дискового пространства
df -h

# Мониторинг логов Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🎉 ГОТОВО!

Ваше приложение KamHub теперь работает на production сервере:

- 🌐 **URL:** https://kamhub.ru
- 🔒 **SSL:** Включен
- 📊 **Мониторинг:** PM2
- 🗄️ **База данных:** PostgreSQL 14
- ⚡ **Web-сервер:** Nginx
- 🔄 **Auto-restart:** Да
- 📦 **Backups:** Ежедневно

---

## 🆘 TROUBLESHOOTING

### Проблема: Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs kamhub --err

# Проверить логи Node.js
cat /var/www/kamhub/logs/err.log

# Проверить порты
netstat -tulpn | grep 3000

# Убить процесс, если висит
pm2 delete kamhub
pm2 start ecosystem.config.js
```

### Проблема: База данных недоступна

```bash
# Проверить статус PostgreSQL
systemctl status postgresql

# Перезапустить PostgreSQL
systemctl restart postgresql

# Проверить подключение
psql -h localhost -U kamhub_user -d kamhub_production
```

### Проблема: Nginx не работает

```bash
# Проверить статус
systemctl status nginx

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx

# Проверить логи
tail -f /var/log/nginx/error.log
```

---

**Дата создания:** 7 ноября 2025  
**Время деплоя:** ~2-3 часа  
**Сложность:** Средняя

🚀 **Успешного запуска!**

