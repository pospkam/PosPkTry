# 🔐 ДЕПЛОЙ С SSH КЛЮЧОМ - TIMEWEB CLOUD

**Сервер:** 5.129.248.224  
**Дата:** 2025-11-12  
**Метод:** SSH Key Authentication

---

## 🔑 SSH КЛЮЧ

**Публичный ключ:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMBEVWLrVixyZ3I4kKAc3sNscUy1sa+odpVsUAuPx2Hx kamhub-ssh-20251018041151
```

**Отпечаток:**
```
SHA256:G7F/rTvUhB1kMYwNAWZHk+FBU4czoz/kxfGxTK2ZB0c (ED25519)
```

---

## 🚀 БЫСТРЫЙ СТАРТ (3 КОМАНДЫ)

Если SSH ключ уже настроен на вашей машине, просто:

```bash
# 1. Подключиться
ssh root@5.129.248.224

# 2. Скачать и запустить скрипт деплоя
curl -o /tmp/deploy.sh https://raw.githubusercontent.com/PosPk/kamhub/cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b/scripts/deploy-quick.sh && bash /tmp/deploy.sh

# 3. Или клонировать и деплоить вручную (см. ниже)
```

---

## 📋 ВАРИАНТ 1: С ЛОКАЛЬНОЙ МАШИНЫ

### Шаг 1: Сохраните приватный ключ

Если у вас есть приватный ключ (файл без .pub), сохраните его:

```bash
# Создать директорию для SSH ключей
mkdir -p ~/.ssh

# Сохранить приватный ключ (ВАЖНО: это приватная часть, не публичная!)
nano ~/.ssh/kamhub_ed25519
# Вставить ПРИВАТНЫЙ ключ (начинается с -----BEGIN OPENSSH PRIVATE KEY-----)
# Сохранить: Ctrl+X, Y, Enter

# Установить правильные права
chmod 600 ~/.ssh/kamhub_ed25519
```

### Шаг 2: Добавьте в SSH config (опционально)

```bash
nano ~/.ssh/config
```

Добавьте:
```
Host kamhub
    HostName 5.129.248.224
    User root
    IdentityFile ~/.ssh/kamhub_ed25519
    StrictHostKeyChecking no
```

### Шаг 3: Подключитесь

```bash
# С SSH config
ssh kamhub

# ИЛИ напрямую
ssh -i ~/.ssh/kamhub_ed25519 root@5.129.248.224
```

---

## 📋 ВАРИАНТ 2: НА СЕРВЕРЕ УЖЕ НАСТРОЕН КЛЮЧ

Если публичный ключ уже добавлен в `~/.ssh/authorized_keys` на сервере:

```bash
# Просто подключитесь
ssh root@5.129.248.224

# Если подключение работает - переходите к деплою!
```

---

## 🎯 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ

После успешного SSH подключения:

### Вариант А: Один скрипт (полностью автоматический)

```bash
# Запустить на сервере
cd /tmp
cat > deploy-kamhub.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "🚀 Kamchatour Hub - Автоматический деплой"

# Обновление системы
apt-get update -qq && apt-get upgrade -y -qq

# Установка зависимостей
apt-get install -y curl wget git build-essential nginx postgresql-client

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Установка PM2
npm install -g pm2

# Клонирование проекта
mkdir -p /var/www
cd /var/www
rm -rf kamchatour
git clone https://github.com/PosPk/kamhub.git kamchatour
cd kamchatour
git checkout cursor/bc-6746a212-ca75-4653-b1b4-40c07270c0d2-614b

# Создание .env.production
cat > .env.production << 'ENV_EOF'
DATABASE_URL=postgresql://localhost:5432/kamhub
DATABASE_SSL=false
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://5.129.248.224
PORT=3000
YANDEX_WEATHER_API_KEY=REPLACE_WITH_YANDEX_WEATHER_API_KEY
JWT_SECRET=production-secret-kamchatour-2025-secure-random-string
TIMEWEB_TOKEN=REPLACE_WITH_TIMEWEB_TOKEN
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY=REPLACE_WITH_S3_ACCESS_KEY
S3_SECRET_KEY=REPLACE_WITH_S3_SECRET_KEY
S3_REGION=ru-1
ENV_EOF

# Установка зависимостей и сборка
npm ci --production=false
npm run build

# Запуск через PM2
pm2 delete kamchatour-hub || true
pm2 start npm --name "kamchatour-hub" -- start
pm2 save
pm2 startup systemd -u root --hp /root | grep -v 'PM2' | bash || true

# Настройка Nginx
cat > /etc/nginx/sites-available/kamchatour << 'NGINX_EOF'
server {
    listen 80;
    server_name 5.129.248.224;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX_EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ Деплой завершен!"
echo "🌐 Приложение: http://5.129.248.224"
pm2 status

DEPLOY_SCRIPT

chmod +x deploy-kamhub.sh
bash deploy-kamhub.sh
```

### Вариант Б: Пошаговый (как в DEPLOY_MANUAL_TIMEWEB.md)

См. файл `DEPLOY_MANUAL_TIMEWEB.md` - все 11 шагов.

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

```bash
# На сервере
pm2 status
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/weather?lat=53&lng=158"

# В браузере
# http://5.129.248.224
```

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

### SSH:
```bash
# Подключение
ssh root@5.129.248.224

# С определенным ключом
ssh -i ~/.ssh/kamhub_ed25519 root@5.129.248.224

# Копирование файлов на сервер
scp файл root@5.129.248.224:/path/to/destination
scp -i ~/.ssh/kamhub_ed25519 файл root@5.129.248.224:/path
```

### PM2:
```bash
pm2 status
pm2 logs kamchatour-hub
pm2 restart kamchatour-hub
pm2 monit
```

### Обновление кода:
```bash
cd /var/www/kamchatour
git pull
npm ci
npm run build
pm2 restart kamchatour-hub
```

---

## 🚨 TROUBLESHOOTING

### Проблема: SSH ключ не работает

```bash
# Проверить права на ключ
ls -la ~/.ssh/kamhub_ed25519
# Должно быть: -rw------- (600)

# Установить правильные права
chmod 600 ~/.ssh/kamhub_ed25519

# Проверить что ключ добавлен в ssh-agent
ssh-add ~/.ssh/kamhub_ed25519

# Подробный вывод SSH
ssh -v root@5.129.248.224
```

### Проблема: "Permission denied (publickey)"

Значит публичный ключ не добавлен на сервер. Используйте пароль:

```bash
ssh root@5.129.248.224
# Пароль: REPLACE_WITH_SERVER_PASSWORD

# После подключения добавьте публичный ключ:
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMBEVWLrVixyZ3I4kKAc3sNscUy1sa+odpVsUAuPx2Hx kamhub-ssh-20251018041151" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

✅ **SSH подключение:** Работает без пароля  
✅ **PM2 Status:** online  
✅ **URL:** http://5.129.248.224  
✅ **Weather API:** Yandex (configured via env)  
✅ **Nginx:** Настроен  
✅ **Firewall:** Активен  

---

## 🎯 КРАТКАЯ ПАМЯТКА

```bash
# 1. Подключиться
ssh root@5.129.248.224

# 2. Создать и запустить скрипт деплоя
# (скопировать из Вариант А выше)

# 3. Проверить
pm2 status
curl http://localhost:3000/api/health

# 4. Открыть в браузере
# http://5.129.248.224
```

**Время деплоя:** ~15-20 минут (автоматический скрипт)  
**Время деплоя:** ~25-30 минут (пошаговый)

---

**Важно:** Yandex Weather API key должен храниться только в env (`YANDEX_WEATHER_API_KEY`). ✅
