# 🔐 ENVIRONMENT VARIABLES - KAMHUB

**Проект:** KamHub v1.0.0  
**Окружение:** Production (Timeweb Cloud)

---

## 📋 ПОЛНЫЙ СПИСОК ПЕРЕМЕННЫХ

### 1. **APPLICATION** (Приложение)

```env
# Режим работы
NODE_ENV=production

# Порт приложения
PORT=3000

# Базовый URL приложения
NEXT_PUBLIC_BASE_URL=https://kamhub.ru

# API URL
NEXT_PUBLIC_API_URL=https://kamhub.ru/api
```

---

### 2. **DATABASE** (База данных)

```env
# PostgreSQL Connection String
DATABASE_URL=postgresql://kamhub_user:ВАШ_ПАРОЛЬ@localhost:5432/kamhub

# SSL для базы данных (для Timeweb обычно false)
DATABASE_SSL=false

# Connection Pool настройки
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE=10000
DATABASE_POOL_ACQUIRE=30000
```

**Как получить:**
1. Создать БД на сервере: `createdb kamhub`
2. Создать пользователя: `CREATE USER kamhub_user WITH PASSWORD '...'`
3. Дать права: `GRANT ALL PRIVILEGES ON DATABASE kamhub TO kamhub_user`

---

### 3. **AUTHENTICATION** (Аутентификация)

```env
# JWT Secret (минимум 32 символа)
JWT_SECRET=ваш_суперсекретный_ключ_для_jwt_минимум_32_символа

# Время жизни токена
JWT_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=ваш_суперсекретный_ключ_для_сессий_минимум_32_символа
```

**Как создать секреты:**
```bash
# В терминале выполнить:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 4. **CLOUDPAYMENTS** (Платежная система)

```env
# Public Key (можно показывать в коде)
CLOUDPAYMENTS_PUBLIC_KEY=pk_ваш_публичный_ключ
NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_KEY=pk_ваш_публичный_ключ

# API Secret (держать в секрете!)
CLOUDPAYMENTS_API_SECRET=ваш_секретный_api_ключ

# Webhook Secret (для валидации webhook'ов)
CLOUDPAYMENTS_WEBHOOK_SECRET=ваш_webhook_секрет
```

**Где получить:**
1. Зарегистрироваться на https://cloudpayments.ru
2. Личный кабинет → API
3. Создать ключи для production
4. Настроить webhook: `https://kamhub.ru/api/webhooks/cloudpayments`

---

### 5. **AI PROVIDERS** (AI провайдеры)

```env
# GROQ (основной, бесплатный)
GROQ_API_KEY=gsk_ваш_groq_api_key

# DeepSeek (альтернативный, дешевый)
DEEPSEEK_API_KEY=sk-ваш_deepseek_api_key

# OpenRouter (резервный, платный)
OPENROUTER_API_KEY=sk-or-v1-ваш_openrouter_api_key
```

**Где получить:**
- GROQ: https://console.groq.com/keys (бесплатно, 30 req/min)
- DeepSeek: https://platform.deepseek.com/ ($0.14/$1.10 за 1M токенов)
- OpenRouter: https://openrouter.ai/ (платно, мультимодель)

**Рекомендация:** 
- Для MVP достаточно только GROQ (бесплатный)
- Для production лучше настроить все 3 для failover

---

### 6. **EMAIL** (Email уведомления)

```env
# SMTP Server (Yandex рекомендуется для России)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true

# SMTP Credentials
SMTP_USER=noreply@kamhub.ru
SMTP_PASSWORD=ваш_пароль_от_email

# From Address
SMTP_FROM="KamHub <noreply@kamhub.ru>"
```

**Настройка Yandex Mail:**
1. Зарегистрировать домен kamhub.ru на Яндекс.Почте
2. Создать почтовый ящик noreply@kamhub.ru
3. Включить "Доступ по SMTP"
4. Создать пароль для приложений
5. Использовать этот пароль в SMTP_PASSWORD

**Альтернативы:**
- Mail.ru: smtp.mail.ru:465
- Gmail: smtp.gmail.com:587 (нужен App Password)
- SendGrid: smtp.sendgrid.net:587 (платный, но надежный)

---

### 7. **YANDEX MAPS** (Карты)

```env
# Яндекс.Карты API ключ
NEXT_PUBLIC_YANDEX_MAPS_KEY=ваш_yandex_maps_api_key
```

**Где получить:**
1. https://developer.tech.yandex.ru/
2. Зарегистрироваться
3. Создать API ключ для JavaScript API
4. Разрешить домен kamhub.ru

**Бесплатно:** До 25,000 запросов/день

---

### 8. **TELEGRAM BOT** (Опционально)

```env
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=123456789:ВАШТОКЕН

# Chat ID для уведомлений
TELEGRAM_CHAT_ID=ваш_chat_id
```

**Как создать:**
1. Открыть @BotFather в Telegram
2. Отправить /newbot
3. Указать имя бота (например, KamHubBot)
4. Получить token
5. Получить chat_id: https://api.telegram.org/bot<TOKEN>/getUpdates

---

### 9. **S3 STORAGE** (Timeweb Object Storage)

```env
# S3 Endpoint (Timeweb)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1

# Access Keys (УЖЕ ЕСТЬ у вас!)
S3_ACCESS_KEY_ID=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_ACCESS_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX

# Bucket Name
S3_BUCKET=kamhub-uploads

# Public URL
NEXT_PUBLIC_S3_ENDPOINT=https://s3.twcstorage.ru
```

**Настройка:**
1. Создать bucket `kamhub-uploads` в Timeweb Console
2. Настроить CORS для публичного доступа
3. Настроить политику доступа

---

### 10. **SWIFT STORAGE** (Альтернативный)

```env
# Swift Endpoint
SWIFT_ENDPOINT=https://swift.twcstorage.ru
SWIFT_AUTH_URL=https://swift.twcstorage.ru/auth/v1.0

# Credentials (УЖЕ ЕСТЬ у вас!)
SWIFT_USER=pa422108:swift
SWIFT_KEY=D7Chc5DqTHtC5pQhEHaQVrkoBOZzanUHGaujCvOw

# Container
SWIFT_CONTAINER=kamhub-storage
```

---

### 11. **MONITORING** (Мониторинг, опционально)

```env
# Sentry для отслеживания ошибок
SENTRY_DSN=https://ваш_sentry_dsn@sentry.io/проект
NEXT_PUBLIC_SENTRY_DSN=https://ваш_sentry_dsn@sentry.io/проект

# Google Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-ВАНШИД

# Yandex Metrika
NEXT_PUBLIC_YANDEX_METRIKA=ВАШ_НОМЕР_СЧЕТЧИКА
```

---

### 12. **SECURITY** (Безопасность)

```env
# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# CORS
ALLOWED_ORIGINS=https://kamhub.ru,https://www.kamhub.ru

# CSRF Token
CSRF_SECRET=ваш_csrf_секрет_минимум_32_символа
```

---

## 🛠️ СОЗДАНИЕ .env ФАЙЛА

### На локальной машине:

```bash
# Скопировать шаблон
cp .env.example .env.production

# Редактировать
nano .env.production

# Заменить все "ЗАМЕНИТЕ" на реальные значения
```

### На сервере:

```bash
# Создать файл
nano /var/www/kamhub/.env

# Вставить содержимое
# (скопировать из .env.production.template)

# Установить безопасные права
chmod 600 /var/www/kamhub/.env
chown root:root /var/www/kamhub/.env
```

---

## ✅ ПРОВЕРКА ПЕРЕМЕННЫХ

### Проверить что все переменные установлены:

```bash
# На сервере
cd /var/www/kamhub

# Проверить наличие .env
ls -la .env

# Проверить содержимое (БЕЗ секретов в логах!)
cat .env | grep -v "SECRET\|PASSWORD\|KEY" | head -20

# Проверить что приложение видит переменные
node -e "require('dotenv').config(); console.log('Database:', process.env.DATABASE_URL ? '✅' : '❌');"
```

---

## 🚨 БЕЗОПАСНОСТЬ

### Важно:
- ❌ **НИКОГДА не коммитить .env файлы в Git!**
- ✅ Использовать только .env.example или .env.template
- ✅ Хранить production ключи в безопасном месте
- ✅ Регулярно ротировать секреты
- ✅ Использовать разные ключи для dev/staging/production

### Права доступа:
```bash
# Только root может читать
chmod 600 .env
chown root:root .env

# Проверить
ls -la .env
# Должно быть: -rw------- 1 root root
```

---

## 📊 МИНИМАЛЬНЫЕ ТРЕБОВАНИЯ ДЛЯ MVP

Для запуска MVP **ОБЯЗАТЕЛЬНО** нужны:

```
✅ DATABASE_URL
✅ JWT_SECRET
✅ CLOUDPAYMENTS_PUBLIC_KEY
✅ CLOUDPAYMENTS_API_SECRET
✅ GROQ_API_KEY (или DEEPSEEK_API_KEY)
✅ NEXT_PUBLIC_YANDEX_MAPS_KEY
✅ SMTP_* (все 5 переменных)
```

**Опционально** (можно добавить позже):
```
🟡 TELEGRAM_BOT_TOKEN
🟡 SENTRY_DSN
🟡 GOOGLE_ANALYTICS
🟡 DEEPSEEK_API_KEY
🟡 OPENROUTER_API_KEY
```

---

**Создано:** 7 ноября 2025  
**Статус:** ✅ **ГОТОВО К ИСПОЛЬЗОВАНИЮ**

