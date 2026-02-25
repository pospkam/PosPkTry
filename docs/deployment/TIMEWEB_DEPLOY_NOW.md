# 🚀 ДЕПЛОЙ НА TIMEWEB CLOUD - ПОШАГОВАЯ ИНСТРУКЦИЯ

**IP сервера:** 45.8.96.120  
**Время деплоя:** ~15-20 минут  
**Дата:** 2025-11-12

---

## ✅ ШАГ 1: ПОДКЛЮЧЕНИЕ К СЕРВЕРУ

```bash
ssh root@45.8.96.120
```

**Если просит пароль:**
- Проверьте email от Timeweb с паролем root
- Или добавьте свой SSH ключ в панели Timeweb

---

## 🔧 ШАГ 2: АВТОМАТИЧЕСКАЯ НАСТРОЙКА СЕРВЕРА

### Вариант A: Автоматический скрипт (рекомендуется)

```bash
# Скачать и запустить скрипт настройки
curl -fsSL https://raw.githubusercontent.com/PosPk/kamhub/main/scripts/setup-timeweb-server.sh -o setup.sh
bash setup.sh
```

**Что установится:**
- ✅ Node.js 20.x LTS
- ✅ PM2 (менеджер процессов)
- ✅ Nginx (веб-сервер)
- ✅ PostgreSQL client
- ✅ Git, curl, wget
- ✅ UFW Firewall

**Время:** ~5-7 минут

---

### Вариант B: Ручная установка

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установить PM2
npm install -g pm2

# Установить Nginx
apt install -y nginx

# Установить PostgreSQL client
apt install -y postgresql-client

# Настроить файрвол
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Проверить установку
node --version   # Должно быть v20.x.x
npm --version    # Должно быть 10.x.x
pm2 --version    # Должно быть 5.x.x
```

---

## 📦 ШАГ 3: УСТАНОВКА ПРИЛОЖЕНИЯ

```bash
# Создать директорию для приложения
mkdir -p /var/www
cd /var/www

# Клонировать репозиторий
git clone https://github.com/PosPk/kamhub.git kamchatour-hub
cd kamchatour-hub

# Установить зависимости
npm ci --production=false

# Проверить что всё установилось
ls -la node_modules
```

**Время:** ~3-5 минут

---

## 🗄️ ШАГ 4: НАСТРОЙКА БАЗЫ ДАННЫХ

### Вариант A: Использовать Timeweb PostgreSQL

**Если вы создавали PostgreSQL в Timeweb панели:**

```bash
# Проверьте email от Timeweb с:
# - Хостом БД (например: db-xxxxx.timeweb.cloud)
# - Пользователем (например: kamuser)
# - Паролем
# - Портом (обычно 5432)

# Создайте .env файл
nano .env.production

# Вставьте (замените на свои данные):
DATABASE_URL=postgresql://kamuser:PASSWORD@db-xxxxx.timeweb.cloud:5432/kamchatour?sslmode=require
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=20

NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://45.8.96.120
PORT=3000

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Сохраните: Ctrl+O, Enter, Ctrl+X
```

---

### Вариант B: Установить PostgreSQL на сервере

```bash
# Установить PostgreSQL
apt install -y postgresql postgresql-contrib

# Запустить сервис
systemctl start postgresql
systemctl enable postgresql

# Создать БД и пользователя
sudo -u postgres psql << EOF
CREATE DATABASE kamchatour;
CREATE USER kamuser WITH PASSWORD 'kampass2024_secure';
GRANT ALL PRIVILEGES ON DATABASE kamchatour TO kamuser;
ALTER DATABASE kamchatour OWNER TO kamuser;
\q
EOF

# Включить расширения
sudo -u postgres psql -d kamchatour << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
\q
EOF

# Создать .env файл
cat > .env.production << EOF
DATABASE_URL=postgresql://kamuser:kampass2024_secure@localhost:5432/kamchatour
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://45.8.96.120
PORT=3000

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Опциональные API ключи
OPENWEATHERMAP_API_KEY=
WEATHERAPI_KEY=
DEEPSEEK_API_KEY=
YANDEX_MAPS_API_KEY=
EOF

# Проверить подключение
psql postgresql://kamuser:kampass2024_secure@localhost:5432/kamchatour -c "SELECT version();"
```

---

## 📊 ШАГ 5: ПРИМЕНЕНИЕ МИГРАЦИЙ

```bash
cd /var/www/kamchatour-hub

# Применить основные миграции
npm run migrate:up

# Применить дополнительные схемы
psql $DATABASE_URL -f lib/database/schema.sql
psql $DATABASE_URL -f lib/database/transfer_schema.sql
psql $DATABASE_URL -f lib/database/loyalty_schema.sql
psql $DATABASE_URL -f lib/database/seat_holds_schema.sql
psql $DATABASE_URL -f lib/database/operators_schema.sql
psql $DATABASE_URL -f lib/database/transfer_payments_schema.sql

# Проверить что таблицы созданы
psql $DATABASE_URL -c "\dt"
```

**Должно быть ~24 таблицы**

---

## 🏗️ ШАГ 6: СБОРКА ПРИЛОЖЕНИЯ

```bash
cd /var/www/kamchatour-hub

# Собрать production build
npm run build

# Проверить что build успешен
ls -la .next

# Должны увидеть папки:
# - .next/server
# - .next/static
# - .next/cache
```

**Время сборки:** ~2-3 минуты

---

## 🚀 ШАГ 7: ЗАПУСК ПРИЛОЖЕНИЯ

```bash
cd /var/www/kamchatour-hub

# Остановить PM2 если запущен
pm2 delete kamchatour-hub 2>/dev/null || true

# Запустить приложение
pm2 start npm --name "kamchatour-hub" -- start

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск
pm2 startup systemd
# Выполните команду которую покажет PM2

# Проверить статус
pm2 status
pm2 logs kamchatour-hub --lines 30
```

**Приложение должно быть online!**

---

## 🌐 ШАГ 8: НАСТРОЙКА NGINX

```bash
# Создать конфигурацию Nginx
cat > /etc/nginx/sites-available/kamchatour << 'EOF'
server {
    listen 80;
    server_name 45.8.96.120;

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

    # Статические файлы Next.js
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
EOF

# Активировать конфигурацию
ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl reload nginx
systemctl status nginx
```

---

## ✅ ШАГ 9: ПРОВЕРКА РАБОТЫ

```bash
# 1. Проверить что PM2 работает
pm2 status

# 2. Проверить логи
pm2 logs kamchatour-hub --lines 50

# 3. Проверить через curl
curl http://localhost:3000
curl http://45.8.96.120

# 4. Проверить API
curl http://45.8.96.120/api/health/db
curl "http://45.8.96.120/api/weather?lat=53&lng=158"

# 5. Проверить в браузере
# Откройте: http://45.8.96.120
```

**Если видите главную страницу - всё работает!** 🎉

---

## 🔐 ШАГ 10: БЕЗОПАСНОСТЬ (ОПЦИОНАЛЬНО)

### Настройка SSL сертификата (если есть домен)

```bash
# Установить certbot (если не установлен)
apt install -y certbot python3-certbot-nginx

# Получить сертификат
certbot --nginx -d yourdomain.com

# Certbot автоматически настроит Nginx для HTTPS
```

### Смена root пароля

```bash
passwd root
# Введите новый надежный пароль
```

### Настройка SSH ключей

```bash
# На локальном компьютере:
ssh-copy-id root@45.8.96.120

# На сервере отключить вход по паролю:
nano /etc/ssh/sshd_config
# Найти и изменить:
# PasswordAuthentication no

# Перезапустить SSH
systemctl restart sshd
```

---

## 📊 МОНИТОРИНГ И УПРАВЛЕНИЕ

### Полезные команды PM2

```bash
# Статус всех процессов
pm2 status

# Логи в реальном времени
pm2 logs kamchatour-hub

# Перезапуск приложения
pm2 restart kamchatour-hub

# Остановка
pm2 stop kamchatour-hub

# Удаление из PM2
pm2 delete kamchatour-hub

# Информация о процессе
pm2 show kamchatour-hub

# Мониторинг ресурсов
pm2 monit
```

### Логи Nginx

```bash
# Access логи
tail -f /var/log/nginx/kamchatour_access.log

# Error логи
tail -f /var/log/nginx/kamchatour_error.log
```

### Использование ресурсов

```bash
# CPU и память
htop

# Дисковое пространство
df -h

# Статус сервисов
systemctl status nginx
systemctl status postgresql
```

---

## 🔄 ОБНОВЛЕНИЕ ПРИЛОЖЕНИЯ

```bash
cd /var/www/kamchatour-hub

# Остановить приложение
pm2 stop kamchatour-hub

# Получить обновления
git pull origin main

# Установить новые зависимости
npm ci --production=false

# Применить новые миграции
npm run migrate:up

# Пересобрать
npm run build

# Запустить
pm2 restart kamchatour-hub

# Проверить логи
pm2 logs kamchatour-hub --lines 30
```

---

## 🆘 РЕШЕНИЕ ПРОБЛЕМ

### Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs kamchatour-hub --err --lines 100

# Проверить порты
netstat -tlnp | grep 3000

# Убить процесс на порту 3000 если занят
kill -9 $(lsof -t -i:3000)

# Перезапустить
pm2 restart kamchatour-hub
```

### Ошибка подключения к БД

```bash
# Проверить DATABASE_URL
cat .env.production | grep DATABASE_URL

# Проверить подключение вручную
psql $DATABASE_URL -c "SELECT 1;"

# Проверить что PostgreSQL запущен
systemctl status postgresql
```

### Nginx 502 Bad Gateway

```bash
# Проверить что приложение работает
pm2 status
curl http://localhost:3000

# Проверить логи Nginx
tail -f /var/log/nginx/kamchatour_error.log

# Перезапустить Nginx
systemctl restart nginx
```

### Build не проходит

```bash
# Очистить кеш
rm -rf .next
rm -rf node_modules
npm cache clean --force

# Переустановить зависимости
npm ci --production=false

# Пересобрать
npm run build
```

---

## 💰 СТОИМОСТЬ

**Текущая конфигурация:**
- VDS: ~301₽/мес (уже оплачено)
- PostgreSQL: ~230₽/мес (если используете Timeweb PostgreSQL)
- S3 Storage: ~50₽/мес (первые GB)

**ИТОГО:** ~581₽/мес (~$6/мес)

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ

После выполнения всех шагов:

- [x] Сервер настроен
- [x] Node.js 20 установлен
- [x] PM2 установлен
- [x] База данных настроена
- [x] Миграции применены
- [x] Приложение собрано
- [x] PM2 запущен и работает
- [x] Nginx настроен
- [x] Firewall настроен
- [x] Приложение доступно в браузере

---

## 🎉 ГОТОВО!

Ваше приложение теперь доступно по адресу:
```
http://45.8.96.120
```

**Что дальше:**
1. Привяжите домен (если есть)
2. Настройте SSL сертификат
3. Добавьте API ключи для дополнительных функций
4. Настройте резервное копирование БД
5. Настройте мониторинг

---

**Версия инструкции:** 1.0  
**Дата:** 2025-11-12  
**Протестировано на:** Ubuntu 22.04 LTS
