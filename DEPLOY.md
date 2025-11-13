# 🚀 Руководство по деплою KamHub

**Версия:** 1.0.0  
**Дата:** 5 ноября 2025

---

## ✅ ЧТО ГОТОВО К ДЕПЛОЮ

### Реализованные модули (99%):
- ✅ **6 ролей** с полноценными кабинетами
- ✅ **45 API эндпоинтов**
- ✅ **Система бронирований** с оплатой
- ✅ **AI-чат** (3 провайдера)
- ✅ **Трансферы** с блокировкой мест
- ✅ **Система лояльности**
- ✅ **Админ-панель**
- ✅ **B2B функционал** для агентов

---

## 🎯 ВАРИАНТЫ ДЕПЛОЯ

### 1. Timeweb Cloud (Рекомендуется для РФ) ⭐
**Плюсы:**
- Автодеплой из GitHub
- Бесплатный SSL
- Edge functions для AI
- CDN из коробки

**Минусы:**
- Serverless limits (10s timeout)
- Нужна внешняя БД

### 2. Timeweb Cloud (VDS) 🇷🇺 ⭐
**Плюсы:**
- Полный контроль над сервером
- PostgreSQL в облаке (готовая СУБД)
- Нет лимитов timeout
- Топ-1 по ценам в России (~1,200₽/мес)
- Поддержка 24/7 на русском

**Минусы:**
- Нужна настройка сервера

📖 **[→ Подробная инструкция по деплою на Timeweb Cloud](docs/TIMEWEB_DEPLOYMENT.md)**

### 3. Docker (Универсально)
**Плюсы:**
- Портируемость
- Docker Compose для всего стека

---

## 🚀 ДЕПЛОЙ НА TIMEWEB CLOUD (БЫСТРЫЙ СТАРТ)

### Шаг 1: Подготовка

```bash
# 1. Зарегистрируйтесь на Timeweb Cloud
# https://timeweb.cloud/

# 2. Создайте облачный сервер (VDS/VPS)
# Рекомендуемая конфигурация:
# - Ubuntu 22.04 LTS
# - 2 vCPU
# - 4 GB RAM
# - 50 GB SSD

# 3. Подключитесь к серверу
ssh root@your-server-ip
```

### Шаг 2: Настройка переменных окружения

Настройте переменные окружения на сервере:

```env
# База данных (используйте Timeweb Cloud Database или PostgreSQL на сервере)
DATABASE_URL=postgresql://user:password@host:5432/kamhub

# AI API ключи
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# Карты
YANDEX_MAPS_API_KEY=your_key

# Платежи
CLOUDPAYMENTS_PUBLIC_ID=pk_...
CLOUDPAYMENTS_API_SECRET=...

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Next.js
NEXT_PUBLIC_APP_URL=https://your-domain.ru
```

### Шаг 3: Деплой

```bash
# Production деплой
# Деплой на Timeweb Cloud через Docker
docker-compose up -d --build

# Или через Git (автоматический)
git add .
git commit -m "Deploy to production"
git push origin main
# Docker Compose автоматически запустит все сервисы
```

### Шаг 4: Настройка БД

```bash
# Если используете Timeweb Cloud Database
# Создайте PostgreSQL базу в панели: https://timeweb.cloud/docs/databases

# Или установите PostgreSQL на сервере
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Создайте базу данных
sudo -u postgres createdb kamhub

# Запустите миграции
npm run migrate:up
```

---

## 🐳 ДЕПЛОЙ ЧЕРЕЗ DOCKER

### Шаг 1: Создайте `.env` файл

```env
# .env
DATABASE_URL=postgresql://kamhub:kamhub123@postgres:5432/kamhub
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
YANDEX_MAPS_API_KEY=...
CLOUDPAYMENTS_PUBLIC_ID=pk_...
CLOUDPAYMENTS_API_SECRET=...
JWT_SECRET=your-jwt-secret-min-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:8080
```

### Шаг 2: Запустите Docker Compose

```bash
# Запуск всего стека (Next.js + PostgreSQL)
docker-compose up -d

# Проверка логов
docker-compose logs -f

# Остановка
docker-compose down
```

### Шаг 3: Инициализация БД

```bash
# Подключитесь к контейнеру
docker exec -it kamhub_postgres psql -U kamhub

# Или выполните миграции
docker exec kamhub_app npm run migrate:up
```

**Готово!** Приложение доступно на http://localhost:8080

---

## 🖥️ ДЕПЛОЙ НА TIMEWEB CLOUD VDS

> **✨ НОВОЕ!** Полная инструкция по деплою на Timeweb Cloud с автоматическими скриптами

📖 **[→ Читать подробное руководство: docs/TIMEWEB_DEPLOYMENT.md](docs/TIMEWEB_DEPLOYMENT.md)**

### Быстрый старт (30 минут)

**1. Создайте облачную БД PostgreSQL:**
- Зайдите на https://timeweb.cloud/
- Облачные базы данных → PostgreSQL 15
- Конфигурация: 2 GB RAM (~500₽/мес)
- Сохраните данные подключения

**2. Создайте VDS сервер:**
- VDS и VPS → Создать сервер
- Ubuntu 22.04, 2 vCPU, 4 GB RAM (~700₽/мес)
- Сохраните IP и пароль root

**3. Автоматическая установка:**
```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Скачайте и запустите скрипт
curl -o deploy.sh https://raw.githubusercontent.com/your-repo/kamhub/main/scripts/timeweb-quick-deploy.sh
bash deploy.sh
```

**Скрипт автоматически:**
- ✅ Установит Node.js 20, PM2, Nginx
- ✅ Склонирует репозиторий
- ✅ Установит зависимости
- ✅ Настроит .env файл
- ✅ Применит миграции БД
- ✅ Соберет и запустит проект
- ✅ Настроит файрвол и Fail2Ban

**4. Готово!** Откройте http://YOUR_SERVER_IP

### Дополнительно

**Настройка домена и SSL:**
```bash
# После привязки домена
certbot --nginx -d your-domain.ru
```

**Управление приложением:**
```bash
pm2 status          # Статус
pm2 logs kamhub     # Логи
pm2 restart kamhub  # Перезапуск
```

📖 **Полная инструкция с решением проблем:** [docs/TIMEWEB_DEPLOYMENT.md](docs/TIMEWEB_DEPLOYMENT.md)

---

## 📊 ЛОКАЛЬНЫЙ ЗАПУСК (РАЗРАБОТКА)

### Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/your-repo/kamhub.git
cd kamhub

# 2. Установите зависимости
npm install

# 3. Создайте .env.local
cp .env.example .env.local
# Отредактируйте и заполните API ключи

# 4. Запустите БД (если нет PostgreSQL)
docker run -d \
  --name kamhub-postgres \
  -e POSTGRES_USER=kamhub \
  -e POSTGRES_PASSWORD=kamhub123 \
  -e POSTGRES_DB=kamhub \
  -p 5432:5432 \
  postgis/postgis:15-3.3

# 5. Примените миграции
npm run migrate:up

# 6. Запустите dev сервер
npm run dev

# Откройте http://localhost:3002
```

---

## 🗄️ НАСТРОЙКА БАЗЫ ДАННЫХ

### Вариант 1: Timeweb Cloud Database

```bash
# Создайте PostgreSQL базу в панели управления
# https://timeweb.cloud/docs/databases

# Получите строку подключения из панели управления
# Пример: postgresql://user:password@db-host.timeweb.cloud:5432/kamhub

# Или создайте локальную БД на сервере
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres createdb kamhub
```

### Вариант 2: Supabase (бесплатно)

1. Зайдите на https://supabase.com
2. Создайте новый проект
3. Database → Settings → Connection String
4. Скопируйте в `DATABASE_URL`

### Вариант 3: Локальный PostgreSQL

```bash
# Установка (Ubuntu/Debian)
sudo apt-get install postgresql postgis

# Создание БД
sudo -u postgres psql
CREATE DATABASE kamhub;
CREATE USER kamhub WITH PASSWORD 'kamhub123';
GRANT ALL PRIVILEGES ON DATABASE kamhub TO kamhub;
\c kamhub
CREATE EXTENSION postgis;
\q

# Строка подключения
DATABASE_URL=postgresql://kamhub:kamhub123@localhost:5432/kamhub
```

### Применение миграций

```bash
# Проверить статус
npm run migrate:status

# Применить все миграции
npm run migrate:up

# Откатить последнюю
npm run migrate:down

# Проверить подключение
npm run db:test
```

---

## 🔑 ПОЛУЧЕНИЕ API КЛЮЧЕЙ

### 1. GROQ API (AI) - БЕСПЛАТНО ⭐

1. Зайдите на https://console.groq.com
2. Sign Up → Create API Key
3. Скопируйте ключ → `GROQ_API_KEY=gsk_...`

**Лимиты:** 14,400 запросов/день бесплатно

### 2. DeepSeek API (AI) - ПЛАТНО

1. https://platform.deepseek.com
2. Пополните баланс ($5 минимум)
3. API Keys → Create new key
4. `DEEPSEEK_API_KEY=sk-...`

**Цены:** ~$0.14 за 1M токенов (очень дешево!)

### 3. OpenRouter API (AI) - ПЛАТНО

1. https://openrouter.ai
2. Keys → Create API key
3. `OPENROUTER_API_KEY=sk-or-...`

**Плюс:** Доступ к 100+ моделям

### 4. Yandex Maps API - БЕСПЛАТНО

1. https://developer.tech.yandex.ru
2. JavaScript API → Получить ключ
3. `YANDEX_MAPS_API_KEY=...`

**Лимиты:** 25,000 запросов/день бесплатно

### 5. CloudPayments - ПЛАТНО

1. https://cloudpayments.ru
2. Зарегистрируйтесь
3. Настройки → API
4. `CLOUDPAYMENTS_PUBLIC_ID=pk_...`

**Комиссия:** 2.8% + 15₽ за транзакцию

### 6. Open-Meteo (Погода) - БЕСПЛАТНО ⭐

**НЕ ТРЕБУЕТ КЛЮЧА!** Просто работает из коробки.

---

## ✅ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

### Обязательно

- [ ] ✅ Заполнены все переменные окружения
- [ ] ✅ База данных создана и доступна
- [ ] ✅ Миграции применены (`npm run migrate:up`)
- [ ] ✅ Проект собирается без ошибок (`npm run build`)
- [ ] ✅ API ключи валидны (протестированы)

### Рекомендуется

- [ ] ⚠️ SSL сертификат настроен
- [ ] ⚠️ Домен привязан
- [ ] ⚠️ Backup БД настроен
- [ ] ⚠️ Мониторинг подключен (Sentry)
- [ ] ⚠️ Логи настроены

### Опционально

- [ ] 📧 Email SMTP настроен
- [ ] 📱 Telegram Bot настроен
- [ ] 💳 CloudPayments в production режиме
- [ ] 🔐 2FA для админов

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ

### 1. Проверка здоровья системы

```bash
# Health check
curl https://your-domain.ru/api/health

# Ответ должен быть:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "..."
  }
}
```

### 2. Проверка БД

```bash
curl https://your-domain.ru/api/health/db

# Должно вернуть:
{
  "success": true,
  "data": {
    "database": "connected",
    "timestamp": "..."
  }
}
```

### 3. Тест AI

```bash
curl -X POST https://your-domain.ru/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Привет!", "sessionId": "test"}'

# Должен вернуть ответ от AI
```

### 4. Проверка страниц

- ✅ https://your-domain.ru - Главная
- ✅ https://your-domain.ru/auth/login - Логин
- ✅ https://your-domain.ru/hub/tourist - Турист (после логина)
- ✅ https://your-domain.ru/hub/admin - Админ (для админов)

---

## 🔧 РЕШЕНИЕ ПРОБЛЕМ

### Ошибка: "Cannot connect to database"

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Проверьте доступность БД
psql $DATABASE_URL -c "SELECT 1"

# Проверьте расширения
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis"
```

### Ошибка: "AI API key invalid"

```bash
# Проверьте ключи
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Должен вернуть список моделей
```

### Ошибка при сборке: "Type errors"

```bash
# Проверьте типы
npm run type-check

# Исправьте ошибки и пересоберите
npm run build
```

### Ошибка: "Port 8080 already in use"

```bash
# Найдите процесс
lsof -i :8080

# Убейте процесс
kill -9 PID

# Или используйте другой порт
PORT=3000 npm start
```

---

## 📊 МОНИТОРИНГ

### Логи

```bash
# Docker logs
docker-compose logs -f

# PM2
pm2 logs kamhub

# Docker
docker-compose logs -f app

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Метрики

```bash
# PM2
pm2 monit

# Docker
docker stats

# Системные
htop
```

---

## 🔄 ОБНОВЛЕНИЕ

### Timeweb Cloud (через Docker)

```bash
git push origin main
# Docker Compose автоматически запустит все сервисы
```

### PM2

```bash
# На сервере
cd /var/www/kamhub
git pull origin main
npm install
npm run build
pm2 reload ecosystem.config.js
```

### Docker

```bash
# Пересоберите образ
docker-compose build

# Перезапустите
docker-compose up -d
```

---

## 🎉 ГОТОВО!

**Проект задеплоен!** 🚀

### Следующие шаги:

1. ✅ Настройте домен
2. ✅ Включите SSL
3. ✅ Настройте backup БД
4. ✅ Подключите мониторинг
5. ✅ Протестируйте все функции
6. ✅ Пригласите первых пользователей!

---

**Удачного деплоя!** 🎊

Если возникли проблемы:
- 📖 Читайте `docs/ARCHITECTURE_GUIDE.md`
- 🐛 Проверяйте логи
- 💬 Пишите в issues на GitHub

