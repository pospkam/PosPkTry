# 🚀 Ручной деплой KamHub на ваш Timeweb сервер

**Сервер:** 5.129.248.224  
**Дата:** 5 ноября 2025

---

## 📋 ЧТО У ВАС ЕСТЬ

✅ **VDS сервер Timeweb:**
- IP: `5.129.248.224`
- User: `root`
- Password: `REPLACE_WITH_SERVER_PASSWORD`
- Ссылка: https://timeweb.cloud/my/servers/5898003

✅ **S3 хранилище:**
- Endpoint: `https://s3.twcstorage.ru`
- Bucket: `d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50`
- Access Key: `REPLACE_WITH_S3_ACCESS_KEY`
- Secret Key: `REPLACE_WITH_S3_SECRET_KEY`

✅ **API Token:**
- Для автоматизации через Timeweb API

---

## 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ (30-40 минут)

### ШАГ 1: Создайте облачную БД PostgreSQL

**ВАЖНО:** Сначала создайте базу данных в панели Timeweb!

1. Откройте https://timeweb.cloud/my
2. Нажмите **"Облачные базы данных"**
3. Нажмите **"Создать БД"**
4. Выберите:
   ```
   Тип: PostgreSQL 15
   Конфигурация: 2 GB RAM, 10 GB Disk
   Локация: Москва (или ближайший к вам)
   Имя: kamhub-db
   ```
5. Нажмите **"Создать"**
6. **Дождитесь создания** (1-2 минуты)
7. **Сохраните данные подключения:**
   ```
   Host: xxxxx.timeweb.cloud
   Port: 5432
   Database: kamhub
   User: gen_user
   Password: [сгенерированный пароль]
   ```

8. **Включите PostGIS расширение:**
   - В панели БД нажмите **"Консоль"**
   - Выполните команду:
     ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     ```
   - Вы должны увидеть: `CREATE EXTENSION`

---

### ШАГ 2: Подключитесь к VDS серверу

**Вариант А: Через веб-консоль Timeweb (проще)**

1. Откройте https://timeweb.cloud/my/servers/5898003
2. Нажмите кнопку **"Консоль"**
3. Откроется терминал в браузере
4. Вы уже авторизованы как root!

**Вариант Б: Через SSH (Windows PowerShell)**

1. Откройте PowerShell
2. Выполните:
   ```powershell
   ssh root@5.129.248.224
   ```
3. Введите пароль: `REPLACE_WITH_SERVER_PASSWORD`
4. При первом подключении напишите `yes` и нажмите Enter

---

### ШАГ 3: Автоматическая установка на сервере

Скопируйте и вставьте **весь блок** команд в терминал:

```bash
# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка базовых пакетов
echo "📦 Установка базовых пакетов..."
apt install -y curl wget git build-essential ufw fail2ban htop

# Установка Node.js 20
echo "📦 Установка Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Проверка версии
node -v
npm -v

# Установка PM2
echo "📦 Установка PM2..."
npm install -g pm2

# Установка Nginx
echo "📦 Установка Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Установка PostgreSQL клиента
echo "📦 Установка PostgreSQL клиента..."
apt install -y postgresql-client

# Настройка файрвола
echo "🔒 Настройка файрвола..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Настройка Fail2Ban
echo "🔒 Настройка Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo "✅ Базовая установка завершена!"
```

**Это займет 3-5 минут.** Дождитесь завершения!

---

### ШАГ 4: Клонируйте репозиторий

**ВАЖНО:** Если репозиторий еще не на GitHub/GitLab, нужно его туда загрузить!

```bash
# Создайте директорию
mkdir -p /var/www
cd /var/www

# Клонируйте репозиторий
# ЗАМЕНИТЕ на ваш реальный URL репозитория!
git clone https://github.com/YOUR_USERNAME/kamhub.git

# Перейдите в проект
cd kamhub

# Проверьте содержимое
ls -la
```

**Если у вас нет репозитория на GitHub:**

Можно загрузить файлы через SCP с вашего локального компьютера:

```powershell
# На вашем Windows компьютере (в PowerShell)
cd C:\Users\Администратор.DESKTOP-GDHBNEF\kamhub

# Создайте архив (если установлен tar)
tar -czf kamhub.tar.gz .

# Загрузите на сервер
scp kamhub.tar.gz root@5.129.248.224:/var/www/

# Затем на сервере распакуйте:
cd /var/www
tar -xzf kamhub.tar.gz -C kamhub
cd kamhub
```

---

### ШАГ 5: Настройте .env файл

```bash
# Создайте .env файл
nano /var/www/kamhub/.env
```

**Вставьте следующее** (отредактируйте DATABASE_URL с данными из Шага 1):

```env
# База данных (ВСТАВЬТЕ ВАШИ ДАННЫЕ ИЗ ШАГА 1!)
DATABASE_URL=postgresql://gen_user:PASSWORD@xxxxx.timeweb.cloud:5432/kamhub

# S3 хранилище (уже настроено)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET_ID=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY_ID=REPLACE_WITH_S3_ACCESS_KEY
S3_SECRET_ACCESS_KEY=REPLACE_WITH_S3_SECRET_KEY
S3_REGION=ru-1
NEXT_PUBLIC_STORAGE_URL=https://s3.twcstorage.ru/d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50

# AI (пока оставьте пустым, можно добавить позже)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Карты (пока пусто)
YANDEX_MAPS_API_KEY=

# Платежи (пока пусто)
CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=

# Безопасность (автосгенерируем ниже)
JWT_SECRET=
CSRF_SECRET=

# Приложение
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_APP_URL=http://5.129.248.224
```

**Сохраните файл:**
- Нажмите `Ctrl + X`
- Нажмите `Y`
- Нажмите `Enter`

**Генерируем секретные ключи:**

```bash
# Генерируем JWT_SECRET и добавляем в .env
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> /var/www/kamhub/.env

# Генерируем CSRF_SECRET
CSRF_SECRET=$(openssl rand -base64 32)
echo "CSRF_SECRET=$CSRF_SECRET" >> /var/www/kamhub/.env

# Проверяем .env
cat /var/www/kamhub/.env
```

---

### ШАГ 6: Установите зависимости

```bash
cd /var/www/kamhub

# Установка (займет 2-3 минуты)
npm install

# Проверка
echo "✅ Зависимости установлены"
```

---

### ШАГ 7: Примените миграции БД

```bash
# Проверьте подключение к БД
npm run db:test

# Если ошибка - проверьте DATABASE_URL в .env!

# Примените миграции
npm run migrate:up

# Проверьте статус
npm run migrate:status

# Вы должны увидеть список примененных миграций
```

---

### ШАГ 8: Соберите проект

```bash
cd /var/www/kamhub

# Сборка (займет 2-5 минут)
npm run build

# Должно завершиться без ошибок!
```

**Если есть ошибки TypeScript:**
- Это нормально для некоторых проектов
- Можно продолжать, если сборка завершилась

---

### ШАГ 9: Запустите через PM2

```bash
cd /var/www/kamhub

# Создайте директорию для логов
mkdir -p logs

# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск
pm2 startup

# ВАЖНО: PM2 покажет команду - скопируйте и выполните её!
# Она будет выглядеть примерно так:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Проверьте статус
pm2 status

# Посмотрите логи
pm2 logs kamhub --lines 50
```

**Приложение должно быть в статусе "online"!**

---

### ШАГ 10: Настройте Nginx

```bash
# Создайте конфигурацию Nginx
nano /etc/nginx/sites-available/kamhub
```

**Вставьте:**

```nginx
server {
    listen 80;
    server_name 5.129.248.224;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Увеличиваем таймауты для AI
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

```bash
# Включите конфигурацию
ln -s /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/

# Удалите дефолтный конфиг
rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Должно быть: "syntax is ok" и "test is successful"

# Перезапустите Nginx
systemctl restart nginx

# Проверьте статус
systemctl status nginx
```

---

### ШАГ 11: ПРОВЕРЬТЕ РАБОТУ! 🎉

**Откройте в браузере:**

```
http://5.129.248.224
```

**Вы должны увидеть главную страницу KamHub!** 🚀

**Проверьте также:**
- http://5.129.248.224/api/health - Должно вернуть `{"success":true}`
- http://5.129.248.224/auth/login - Страница входа

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

### Управление PM2

```bash
# Статус приложения
pm2 status

# Логи в реальном времени
pm2 logs kamhub

# Только ошибки
pm2 logs kamhub --err

# Перезапуск
pm2 restart kamhub

# Остановка
pm2 stop kamhub

# Удаление из PM2
pm2 delete kamhub
```

### Просмотр логов

```bash
# Логи PM2
pm2 logs kamhub --lines 100

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи приложения
tail -f /var/www/kamhub/logs/pm2-error.log
```

### Мониторинг ресурсов

```bash
# Интерактивный мониторинг PM2
pm2 monit

# Использование CPU/RAM
htop

# Место на диске
df -h

# Проверка портов
netstat -tulpn | grep LISTEN
```

---

## 🔄 ОБНОВЛЕНИЕ ПРОЕКТА

Когда нужно обновить код:

```bash
# Подключитесь к серверу
ssh root@5.129.248.224

# Перейдите в проект
cd /var/www/kamhub

# Получите последние изменения
git pull origin main

# Установите новые зависимости (если есть)
npm install

# Примените новые миграции (если есть)
npm run migrate:up

# Пересоберите
npm run build

# Перезапустите PM2
pm2 reload kamhub

# Проверьте статус
pm2 status
pm2 logs kamhub --lines 50
```

---

## 🆘 РЕШЕНИЕ ПРОБЛЕМ

### Проблема: Не могу подключиться к серверу

```bash
# Проверьте доступность сервера
ping 5.129.248.224

# Проверьте SSH
ssh root@5.129.248.224

# Если не работает - используйте веб-консоль Timeweb
```

### Проблема: "Cannot connect to database"

```bash
# Проверьте DATABASE_URL
cat /var/www/kamhub/.env | grep DATABASE_URL

# Проверьте подключение к БД
psql "postgresql://user:pass@host:5432/kamhub" -c "SELECT 1"

# Проверьте PostGIS
psql "postgresql://user:pass@host:5432/kamhub" -c "SELECT PostGIS_version()"
```

### Проблема: PM2 не запускается

```bash
# Проверьте Node.js
node -v

# Проверьте PM2
pm2 -v

# Очистите логи и перезапустите
pm2 flush
pm2 delete kamhub
pm2 start ecosystem.config.js
```

### Проблема: Nginx показывает ошибку

```bash
# Проверьте конфигурацию
nginx -t

# Проверьте логи
tail -f /var/log/nginx/error.log

# Перезапустите Nginx
systemctl restart nginx

# Проверьте статус
systemctl status nginx
```

### Проблема: Порт 8080 занят

```bash
# Найдите процесс на порту 8080
lsof -i :8080

# Или
netstat -tulpn | grep 8080

# Убейте процесс (замените PID)
kill -9 PID

# Или остановите через PM2
pm2 stop kamhub
pm2 start kamhub
```

---

## 📊 СЛЕДУЮЩИЕ ШАГИ

После успешного деплоя:

### 1. Получите API ключи (бесплатно)

**GROQ API (AI):**
- https://console.groq.com → Create API Key
- Добавьте в `.env`: `GROQ_API_KEY=gsk_...`
- Перезапустите: `pm2 restart kamhub`

**Yandex Maps:**
- https://developer.tech.yandex.ru → JavaScript API
- Добавьте в `.env`: `YANDEX_MAPS_API_KEY=...`

### 2. Настройте домен (опционально)

Если у вас есть домен:

1. В панели регистратора домена добавьте A-запись:
   ```
   Тип: A
   Имя: @
   Значение: 5.129.248.224
   ```

2. Обновите Nginx конфиг:
   ```bash
   nano /etc/nginx/sites-available/kamhub
   # Замените: server_name your-domain.ru;
   ```

3. Установите SSL:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d your-domain.ru
   ```

### 3. Настройте backup

```bash
# Создайте скрипт backup
nano /root/backup-kamhub.sh
```

Вставьте:

```bash
#!/bin/bash
DB_URL=$(grep DATABASE_URL /var/www/kamhub/.env | cut -d '=' -f2)
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"

mkdir -p $BACKUP_DIR
pg_dump "$DB_URL" > $BACKUP_DIR/kamhub_$DATE.sql
find $BACKUP_DIR -name "kamhub_*.sql" -mtime +7 -delete

echo "Backup completed: kamhub_$DATE.sql"
```

```bash
chmod +x /root/backup-kamhub.sh

# Добавьте в cron (каждый день в 3:00)
crontab -e
# Добавьте строку:
0 3 * * * /root/backup-kamhub.sh >> /var/log/backup.log 2>&1
```

### 4. Создайте первого админа

```bash
# Подключитесь к БД
psql "postgresql://user:pass@host:5432/kamhub"

# Создайте админа
INSERT INTO users (email, name, role) 
VALUES ('admin@kamhub.ru', 'Администратор', 'admin');

# Выйдите
\q
```

Теперь можете войти как admin через интерфейс!

---

## 🎉 ГОТОВО!

**Ваш KamHub работает на Timeweb Cloud!**

✅ **URL:** http://5.129.248.224  
✅ **Админка:** http://5.129.248.224/hub/admin  
✅ **API Health:** http://5.129.248.224/api/health

### Полезные ссылки:

- 🌐 Панель Timeweb: https://timeweb.cloud/my
- 🖥️ Ваш сервер: https://timeweb.cloud/my/servers/5898003
- 💾 S3 хранилище: https://timeweb.cloud/my/storage/422469/dashboard
- 📖 Документация: `docs/ARCHITECTURE_GUIDE.md`

**Успешной работы! 🚀**



