# ✅ Чек-лист деплоя KamHub на Timeweb Cloud

**Сервер:** 5.129.248.224  
**Статус:** Готов к деплою

---

## 🎯 БЫСТРЫЙ СТАРТ

### ☑️ ШАГ 1: Создайте БД PostgreSQL (5 минут)

- [ ] Открыть https://timeweb.cloud/my
- [ ] Облачные базы данных → Создать БД
- [ ] PostgreSQL 15, 2 GB RAM, Москва
- [ ] Сохранить данные подключения
- [ ] Выполнить в консоли БД: `CREATE EXTENSION IF NOT EXISTS postgis;`

**Данные для сохранения:**
```
Host: _______________.timeweb.cloud
Port: 5432
Database: kamhub
User: gen_user
Password: _______________
```

---

### ☑️ ШАГ 2: Подключитесь к серверу (1 минута)

**Вариант А: Веб-консоль (проще)**
- [ ] Открыть https://timeweb.cloud/my/servers/5898003
- [ ] Нажать кнопку "Консоль"

**Вариант Б: SSH**
```bash
ssh root@5.129.248.224
# Пароль: xQvB1pv?yZTjaR
```

---

### ☑️ ШАГ 3: Установите ПО (5 минут)

Скопируйте весь блок в терминал:

```bash
apt update && apt upgrade -y && \
apt install -y curl wget git build-essential ufw fail2ban nginx postgresql-client && \
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
apt-get install -y nodejs && \
npm install -g pm2 && \
systemctl enable nginx && systemctl start nginx && \
ufw --force enable && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && \
systemctl enable fail2ban && systemctl start fail2ban && \
echo "✅ Установка завершена!"
```

---

### ☑️ ШАГ 4: Загрузите проект (2 минуты)

**Если репозиторий на GitHub:**
```bash
mkdir -p /var/www && cd /var/www
git clone YOUR_REPO_URL kamhub
cd kamhub
```

**Если загружаете с компьютера:**
```powershell
# На вашем Windows (в папке проекта):
tar -czf kamhub.tar.gz .
scp kamhub.tar.gz root@5.129.248.224:/var/www/

# На сервере:
mkdir -p /var/www/kamhub && cd /var/www
tar -xzf kamhub.tar.gz -C kamhub && cd kamhub
```

---

### ☑️ ШАГ 5: Настройте .env (3 минуты)

```bash
cd /var/www/kamhub

# Создайте .env
cat > .env << 'EOF'
# ЗАМЕНИТЕ на ваши данные из Шага 1!
DATABASE_URL=postgresql://gen_user:PASSWORD@xxxxx.timeweb.cloud:5432/kamhub

# S3 хранилище (уже настроено)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET_ID=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY_ID=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_ACCESS_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
S3_REGION=ru-1
NEXT_PUBLIC_STORAGE_URL=https://s3.twcstorage.ru/d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50

# AI (пока пусто)
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
YANDEX_MAPS_API_KEY=

# Платежи (пока пусто)
CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=

# Приложение
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_APP_URL=http://5.129.248.224
EOF

# Генерируем секретные ключи
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "CSRF_SECRET=$(openssl rand -base64 32)" >> .env

# Проверка
cat .env
```

**ВАЖНО:** Отредактируйте DATABASE_URL с реальными данными!

```bash
nano .env
# Исправьте строку DATABASE_URL
# Ctrl+X, Y, Enter для сохранения
```

---

### ☑️ ШАГ 6: Установите зависимости (3 минуты)

```bash
cd /var/www/kamhub
npm install
```

---

### ☑️ ШАГ 7: Примените миграции (1 минута)

```bash
npm run db:test      # Проверка подключения
npm run migrate:up   # Применение миграций
npm run migrate:status  # Проверка статуса
```

---

### ☑️ ШАГ 8: Соберите проект (3-5 минут)

```bash
npm run build
```

Дождитесь завершения без критических ошибок!

---

### ☑️ ШАГ 9: Запустите PM2 (1 минута)

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Выполните команду, которую покажет PM2!

pm2 status  # Должно быть "online"
pm2 logs kamhub --lines 20
```

---

### ☑️ ШАГ 10: Настройте Nginx (2 минуты)

```bash
cat > /etc/nginx/sites-available/kamhub << 'EOF'
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

ln -s /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

### ☑️ ШАГ 11: ПРОВЕРЬТЕ! 🎉

Откройте в браузере: **http://5.129.248.224**

- [ ] Главная страница открылась
- [ ] http://5.129.248.224/api/health возвращает success
- [ ] http://5.129.248.224/auth/login открывается
- [ ] `pm2 status` показывает "online"
- [ ] `pm2 logs kamhub` без критических ошибок

---

## 🎯 ПОСЛЕ ДЕПЛОЯ

### Получите API ключи (бесплатно):

- [ ] **GROQ API:** https://console.groq.com → Create API Key
- [ ] **Yandex Maps:** https://developer.tech.yandex.ru → JavaScript API
- [ ] Добавьте в `.env` и перезапустите: `pm2 restart kamhub`

### Настройте домен (опционально):

- [ ] Добавьте A-запись на `5.129.248.224`
- [ ] Обновите Nginx: `server_name your-domain.ru;`
- [ ] Установите SSL: `certbot --nginx -d your-domain.ru`

### Настройте backup:

- [ ] Создайте скрипт backup БД
- [ ] Добавьте в cron (каждый день в 3:00)
- [ ] Проверьте backup: `bash /root/backup-kamhub.sh`

### Создайте админа:

```bash
psql "postgresql://user:pass@host:5432/kamhub" -c \
"INSERT INTO users (email, name, role) VALUES ('admin@kamhub.ru', 'Admin', 'admin');"
```

---

## 📊 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Статус
pm2 status
pm2 logs kamhub
systemctl status nginx

# Перезапуск
pm2 restart kamhub
systemctl restart nginx

# Мониторинг
pm2 monit
htop
df -h

# Обновление
cd /var/www/kamhub
git pull
npm install
npm run build
pm2 reload kamhub
```

---

## 🆘 ПОМОЩЬ

**Полная инструкция:** `docs/TIMEWEB_MANUAL_DEPLOY.md`

**Техподдержка Timeweb:**
- 📞 8 (800) 700-32-92
- 💬 Чат на https://timeweb.cloud
- 📧 support@timeweb.cloud

---

**Время выполнения:** ~30 минут  
**Сложность:** Средняя  
**Стоимость:** ~1,200₽/месяц

✅ **Готово к деплою!**



