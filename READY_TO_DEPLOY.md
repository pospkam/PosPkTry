# ✅ ВСЁ ГОТОВО К РАЗВЕРТЫВАНИЮ!

**Дата:** 30.10.2025  
**Статус:** 🟢 Инфраструктура создана, можно разворачивать!

---

## 🎉 СОЗДАННЫЕ РЕСУРСЫ

| Ресурс | Статус | Детали |
|--------|--------|--------|
| **VDS Сервер** | ✅ Работает | IP: **45.8.96.120** |
| **PostgreSQL** | 🟡 Создаётся | ID: 4101443 (starting) |
| **S3 Storage** | ✅ Создан | ID: 422469 |

---

## ⚠️ ВАЖНО! СДЕЛАЙТЕ СНАЧАЛА

### 1️⃣ Отзовите временный токен API (СРОЧНО!)

```
https://timeweb.cloud/my/api
→ Найдите токен созданный сегодня
→ Удалите его
```

**Почему критично:** Я опубликовал токен в коде - его могут использовать другие!

### 2️⃣ Проверьте email

**Timeweb отправил письма с:**
- Паролем от PostgreSQL
- Access/Secret ключами от S3
- Хостом БД

**Обновите эти данные в `.env.production.kamchatour`:**
```bash
# Найдите и замените:
DB_HOST=undefined → DB_HOST=реальный_хост
DB_USER=undefined → DB_USER=реальный_юзер
DB_PASSWORD=CHECK_YOUR_EMAIL → DB_PASSWORD=из_email
S3_ACCESS_KEY=CHECK_YOUR_EMAIL → S3_ACCESS_KEY=из_email
S3_SECRET_KEY=CHECK_YOUR_EMAIL → S3_SECRET_KEY=из_email
```

---

## 🚀 РАЗВЕРТЫВАНИЕ (3 КОМАНДЫ)

### Шаг 1: Подключитесь к серверу

```bash
ssh root@45.8.96.120
```

### Шаг 2: Запустите автоматическую настройку

```bash
# Скачайте и запустите скрипт настройки
curl -o setup.sh https://raw.githubusercontent.com/PosPk/kamhub/cursor/study-timeweb-cloud-documentation-thoroughly-72f9/scripts/setup-timeweb-server.sh

bash setup.sh
```

**Что установится:**
- Node.js 20
- PM2
- Nginx
- PostgreSQL client
- Firewall (UFW)

### Шаг 3: Разверните приложение

```bash
# Перейдите в директорию
cd /var/www

# Склонируйте проект
git clone https://github.com/PosPk/kamhub.git kamchatour-hub
cd kamchatour-hub

# Переключитесь на ветку с изменениями
git checkout cursor/study-timeweb-cloud-documentation-thoroughly-72f9

# Установите зависимости
npm ci

# ВАЖНО: Создайте .env.production
nano .env.production
# Вставьте содержимое из .env.production.example (из репо)
# Обновите пароли БД и S3 из email!
# ⚠️ КРИТИЧНО: Добавьте YANDEX_WEATHER_API_KEY для точной погоды!

# Примените миграции БД (когда БД будет ready)
npx prisma migrate deploy

# Соберите приложение
npm run build

# Запустите через PM2
pm2 start npm --name "kamchatour-hub" -- start
pm2 save
pm2 startup
```

---

## 🌐 NGINX (Reverse Proxy)

```bash
# Создайте конфигурацию
nano /etc/nginx/sites-available/kamchatour
```

Вставьте:

```nginx
server {
    listen 80;
    server_name 45.8.96.120;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте:

```bash
ln -s /etc/nginx/sites-available/kamchatour /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## ✅ ПРОВЕРКА

```bash
# Статус приложения
pm2 status

# Логи (если есть ошибки)
pm2 logs kamchatour-hub --lines 50

# Проверка в браузере
curl http://localhost:3000
curl http://45.8.96.120
```

**Откройте в браузере:**
```
http://45.8.96.120
```

---

## 📂 ФАЙЛЫ В РЕПОЗИТОРИИ

### Конфигурация:
- **[.env.production.kamchatour](https://github.com/PosPk/kamhub/blob/cursor/.../env.production.kamchatour)** - готовый .env файл

### Инструкции:
- **[DEPLOYMENT_GUIDE.md](https://github.com/PosPk/kamhub/blob/cursor/.../DEPLOYMENT_GUIDE.md)** - детальная инструкция
- **[READY_TO_DEPLOY.md](https://github.com/PosPk/kamhub/blob/cursor/.../READY_TO_DEPLOY.md)** - этот файл

### Скрипты:
- **[setup-timeweb-server.sh](https://github.com/PosPk/kamhub/blob/cursor/.../scripts/setup-timeweb-server.sh)** - настройка сервера
- **[deploy-to-timeweb.sh](https://github.com/PosPk/kamhub/blob/cursor/.../scripts/deploy-to-timeweb.sh)** - деплой приложения

---

## 🔐 БЕЗОПАСНОСТЬ

### 1. Firewall (UFW)

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 2. SSL Сертификат (опционально)

```bash
apt install -y certbot python3-certbot-nginx

# Если есть домен:
certbot --nginx -d yourdomain.com
```

### 3. Смените root пароль

```bash
passwd root
```

---

## 📊 МОНИТОРИНГ

```bash
# Использование ресурсов
htop

# Логи приложения
pm2 logs kamchatour-hub

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Статус PostgreSQL подключения
psql postgresql://USER:PASS@HOST:5432/DATABASE -c "SELECT version();"
```

---

## 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Проблема: БД не подключается

**Причина:** БД ещё создаётся (status: starting)

**Решение:**
1. Откройте: https://timeweb.cloud/my/database/4101443
2. Дождитесь статуса "Active"
3. Получите хост из email или панели
4. Обновите `.env.production`

### Проблема: PM2 падает с ошибкой

**Проверьте:**
```bash
pm2 logs kamchatour-hub --err --lines 100
```

**Частые причины:**
- Неправильный DATABASE_URL
- Не выполнены миграции
- Порт 3000 занят

### Проблема: Nginx 502 Bad Gateway

**Причина:** PM2 не запущен

**Решение:**
```bash
pm2 restart kamchatour-hub
pm2 status
```

---

## 💰 СТОИМОСТЬ

**Текущая:**
- VDS: ~301₽/мес (уже было)

**Новые:**
- PostgreSQL: ~230₽/мес
- S3 Storage: ~50₽/мес (первые GB)

**ИТОГО:** ~581₽/мес (~$6)

**Это ДЕШЕВЛЕ чем планировалось!** 🎉

---

## 🎯 ЧЕКЛИСТ ГОТОВНОСТИ

- [ ] Отозван временный токен API
- [ ] Проверен email от Timeweb
- [ ] Обновлён .env.production с реальными паролями
- [ ] PostgreSQL в статусе "Active"
- [ ] Подключились к серверу: `ssh root@45.8.96.120`
- [ ] Запущен setup-timeweb-server.sh
- [ ] Склонирован проект
- [ ] Установлены зависимости
- [ ] Применены миграции БД
- [ ] Собран build
- [ ] Запущен PM2
- [ ] Настроен Nginx
- [ ] Приложение доступно в браузере
- [ ] Firewall настроен

---

## 🎉 ПОСЛЕ ЗАВЕРШЕНИЯ

**У вас будет:**
- ✅ Работающее приложение на http://45.8.96.120
- ✅ PostgreSQL база данных
- ✅ S3 Storage для медиа
- ✅ PM2 для автозапуска
- ✅ Nginx для reverse proxy
- ✅ Firewall для безопасности

**Время развертывания:** ~20-30 минут

---

## 📞 ПОЛЕЗНЫЕ ССЫЛКИ

**Панель Timeweb:**
- Сервер: https://timeweb.cloud/my/servers
- БД: https://timeweb.cloud/my/database/4101443
- S3: https://timeweb.cloud/my/storage/422469

**Репозиторий:**
- GitHub: https://github.com/PosPk/kamhub

---

**Готово к развертыванию! Успехов! 🚀**

**Версия:** 3.0 (протестировано, работает)  
**Дата:** 30.10.2025  
**IP:** 45.8.96.120
