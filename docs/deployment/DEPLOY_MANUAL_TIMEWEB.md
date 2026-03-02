# 🚀 РУЧНОЙ ДЕПЛОЙ НА TIMEWEB CLOUD

**Сервер:** 5.129.248.224  
**Дата:** 2025-11-12  
**Статус:** Все готово для деплоя

---

## 📋 ДАННЫЕ ДЛЯ ДЕПЛОЯ

### SSH Доступ:
```bash
Server:   5.129.248.224
User:     root
Password: REPLACE_WITH_SERVER_PASSWORD
```

### S3 Storage:
```
Endpoint: https://s3.twcstorage.ru
Bucket:   d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
Access:   REPLACE_WITH_S3_ACCESS_KEY
Secret:   REPLACE_WITH_S3_SECRET_KEY
Region:   ru-1
```

### Yandex Weather API:
```
Key: REPLACE_WITH_YANDEX_WEATHER_API_KEY
```

---

## 🎯 ПОШАГОВАЯ ИНСТРУКЦИЯ

### Шаг 1: Подключение к серверу

```bash
ssh root@5.129.248.224
# Пароль: REPLACE_WITH_SERVER_PASSWORD
```

### Шаг 2: Обновление системы

```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git build-essential nginx postgresql-client
```

### Шаг 3: Установка Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Проверка
node -v  # должно быть v20.x.x
npm -v
```

### Шаг 4: Установка PM2

```bash
npm install -g pm2

# Проверка
pm2 -v
```

### Шаг 5: Клонирование проекта

```bash
# Создать директорию
mkdir -p /var/www
cd /var/www

# Клонировать репозиторий
git clone https://github.com/PosPk/kamhub.git kamchatour
cd kamchatour

# Переключиться на рабочую ветку
git checkout cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b
```

### Шаг 6: Создание .env.production

```bash
cd /var/www/kamchatour
nano .env.production
```

**Вставить следующее содержимое:**

```bash
# DATABASE
DATABASE_URL=postgresql://localhost:5432/kamhub
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

# SECURITY
JWT_SECRET=production-secret-kamchatour-2025-random-string-change-this
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# APPLICATION
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://5.129.248.224
PORT=3000

# YANDEX WEATHER API (КРИТИЧНО!)
YANDEX_WEATHER_API_KEY=REPLACE_WITH_YANDEX_WEATHER_API_KEY

# YANDEX MAPS (опционально)
YANDEX_MAPS_API_KEY=

# TIMEWEB CLOUD
TIMEWEB_TOKEN=REPLACE_WITH_TIMEWEB_TOKEN

# S3 STORAGE
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY=REPLACE_WITH_S3_ACCESS_KEY
S3_SECRET_KEY=REPLACE_WITH_S3_SECRET_KEY
S3_REGION=ru-1

# DeepSeek AI (опционально)
DEEPSEEK_API_KEY=

# NOTIFICATIONS (опционально)
SMTP_HOST=smtp.timeweb.ru
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**Сохранить:** `Ctrl+X`, `Y`, `Enter`

### Шаг 7: Установка зависимостей

```bash
cd /var/www/kamchatour
npm ci --production=false
```

**Это займёт 2-3 минуты**

### Шаг 8: Сборка проекта

```bash
npm run build
```

**Это займёт 2-3 минуты**

### Шаг 9: Запуск через PM2

```bash
# Запустить приложение
pm2 start npm --name "kamchatour-hub" -- start

# Сохранить конфигурацию
pm2 save

# Автозапуск при перезагрузке
pm2 startup systemd -u root --hp /root
# Скопировать и выполнить команду которую покажет PM2

# Проверить статус
pm2 status
pm2 logs kamchatour-hub
```

### Шаг 10: Настройка Nginx

```bash
nano /etc/nginx/sites-available/kamchatour
```

**Вставить:**

```nginx
server {
    listen 80;
    server_name 5.129.248.224;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
```

**Сохранить:** `Ctrl+X`, `Y`, `Enter`

**Активировать:**

```bash
# Удалить default конфиг
rm -f /etc/nginx/sites-enabled/default

# Активировать наш конфиг
ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

### Шаг 11: Настройка Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Проверка
ufw status
```

---

## ✅ ПРОВЕРКА РАБОТЫ

### 1. Проверка PM2

```bash
pm2 status
# Должно показать: kamchatour-hub | online

pm2 logs kamchatour-hub --lines 50
# Должно показать логи без ошибок
```

### 2. Проверка через curl

```bash
# Health check
curl http://localhost:3000/api/health

# Weather API (Yandex)
curl "http://localhost:3000/api/weather?lat=53&lng=158"

# Через Nginx
curl http://5.129.248.224/api/health
```

### 3. Проверка в браузере

Открыть: **http://5.129.248.224**

Должна загрузиться главная страница с виджетом погоды.

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

### PM2:
```bash
pm2 status                    # Статус приложений
pm2 logs kamchatour-hub       # Логи в реальном времени
pm2 restart kamchatour-hub    # Перезапуск
pm2 stop kamchatour-hub       # Остановка
pm2 monit                     # Мониторинг ресурсов
```

### Nginx:
```bash
systemctl status nginx        # Статус Nginx
nginx -t                      # Проверка конфигурации
systemctl reload nginx        # Перезагрузка конфига
tail -f /var/log/nginx/error.log  # Логи ошибок
```

### Система:
```bash
htop                          # Мониторинг системы
df -h                         # Использование диска
free -h                       # Использование памяти
```

---

## 🔄 ОБНОВЛЕНИЕ ПРИЛОЖЕНИЯ

```bash
cd /var/www/kamchatour
git pull origin cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b
npm ci
npm run build
pm2 restart kamchatour-hub
```

---

## 🚨 TROUBLESHOOTING

### Проблема: PM2 показывает "errored"

```bash
pm2 logs kamchatour-hub --err --lines 100
# Смотрим логи ошибок

# Обычно помогает:
cd /var/www/kamchatour
npm run build
pm2 restart kamchatour-hub
```

### Проблема: Nginx 502 Bad Gateway

```bash
# Проверить что PM2 запущен
pm2 status

# Если stopped - запустить
pm2 start kamchatour-hub

# Проверить логи
tail -f /var/log/nginx/error.log
```

### Проблема: Погода не работает

```bash
# Проверить API ключ в .env.production
cat /var/www/kamchatour/.env.production | grep YANDEX_WEATHER

# Должно быть:
# YANDEX_WEATHER_API_KEY=REPLACE_WITH_YANDEX_WEATHER_API_KEY

# Перезапустить
pm2 restart kamchatour-hub
```

### Проблема: Порт 3000 занят

```bash
# Найти процесс
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Или сменить порт в .env.production
PORT=3001
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После успешного деплоя:

✅ **PM2 Status:** online  
✅ **URL:** http://5.129.248.224  
✅ **Health API:** http://5.129.248.224/api/health  
✅ **Weather API:** http://5.129.248.224/api/weather?lat=53&lng=158  
✅ **Виджет погоды:** Показывает данные Yandex  
✅ **Nginx:** Работает как reverse proxy  
✅ **Firewall:** Настроен (80, 443, 22)  

---

## 🎯 ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] SSH подключение работает
- [ ] Node.js 20 установлен
- [ ] PM2 установлен
- [ ] Репозиторий склонирован
- [ ] .env.production создан с API ключом
- [ ] npm ci выполнен
- [ ] npm run build выполнен
- [ ] PM2 запущен (online)
- [ ] Nginx настроен
- [ ] Firewall настроен
- [ ] curl http://localhost:3000/api/health работает
- [ ] http://5.129.248.224 открывается в браузере
- [ ] Виджет погоды показывает данные

---

## 📞 ПОДДЕРЖКА

**Если возникли проблемы:**

1. Проверить логи: `pm2 logs kamchatour-hub`
2. Проверить Nginx: `tail -f /var/log/nginx/error.log`
3. Проверить .env: `cat /var/www/kamchatour/.env.production`
4. Перезапустить: `pm2 restart kamchatour-hub`

---

**Время деплоя:** ~20-30 минут  
**Сложность:** Средняя  
**Статус:** Готово к деплою ✅

**ВАЖНО:** Yandex Weather API key уже добавлен в инструкцию!
