# 🗄️ НАСТРОЙКА POSTGRESQL НА TIMEWEB CLOUD

**Дата:** 7 ноября 2025  
**Сервер:** root@5.129.248.224  
**Документация:** https://timeweb.cloud/

---

## 📋 ПЛАН НАСТРОЙКИ

### 1. Создание Облачной БД на Timeweb Cloud

#### Вариант A: Через панель управления (Рекомендуется)

**Шаги:**

1. **Войти в панель:** https://timeweb.cloud/
   - Email: ваш email
   - Используйте аккаунт pa422108

2. **Создать БД:**
   ```
   Сервисы → Облачные базы данных → Создать базу данных
   ```

3. **Выбрать параметры:**
   ```
   СУБД: PostgreSQL 15 или 16
   Конфигурация: Минимум 1 CPU, 2 GB RAM (для старта)
   Регион: ru-1 (Россия)
   Имя: kamhub-production
   ```

4. **Получить credentials:**
   ```
   После создания получите:
   - Host: xxx.timeweb.cloud
   - Port: 5432
   - Database: kamhub
   - User: pa422108
   - Password: [будет сгенерирован]
   ```

#### Вариант B: Через API Timeweb

**Используя токен из файла:**
```bash
TIMEWEB_TOKEN="REPLACE_WITH_TIMEWEB_TOKEN"

curl -X POST https://api.timeweb.cloud/api/v1/dbs \
  -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "postgres",
    "preset_id": 1,
    "name": "kamhub-production",
    "login": "kamhub_admin",
    "password": "генерируется_автоматически",
    "hash_type": "caching_sha2",
    "location": "ru-1"
  }'
```

---

### 2. Применение Схемы БД

После создания БД на Timeweb, применяем наши схемы:

#### Подготовка DATABASE_URL

```bash
# Формат для Timeweb PostgreSQL
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME"

# Пример (подставьте реальные данные):
DATABASE_URL="postgresql://kamhub_admin:YOUR_PASSWORD@kamhub-production.timeweb.cloud:5432/kamhub"
```

#### Применение схем

**Метод 1: Через psql (локально)**

```bash
# Установите PostgreSQL client, если нет
# Windows: скачать с postgresql.org

# Подключитесь к БД
psql "postgresql://kamhub_admin:PASSWORD@kamhub-production.timeweb.cloud:5432/kamhub"

# Применить схемы по очереди
\i scripts/schemas/01-core-tables.sql
\i scripts/schemas/02-auth-tables.sql
\i scripts/schemas/03-tour-tables.sql
\i scripts/schemas/04-booking-tables.sql
\i scripts/schemas/05-payment-tables.sql
\i scripts/schemas/06-review-tables.sql
\i scripts/schemas/07-partner-tables.sql
\i scripts/schemas/08-transfer-tables.sql
\i scripts/schemas/09-accommodation-tables.sql
\i scripts/schemas/10-gear-rental-tables.sql
\i scripts/schemas/11-car-rental-tables.sql
\i scripts/schemas/12-souvenir-tables.sql
\i scripts/schemas/13-notification-tables.sql
\i scripts/schemas/14-analytics-tables.sql
```

**Метод 2: Через скрипт на сервере**

```bash
# SSH подключение
ssh root@5.129.248.224
# Password: REPLACE_WITH_SERVER_PASSWORD

# На сервере установить PostgreSQL client
apt-get update
apt-get install -y postgresql-client

# Клонировать репозиторий (или загрузить файлы)
git clone https://github.com/PosPk/kamhub.git
cd kamhub

# Применить все схемы
export DATABASE_URL="postgresql://kamhub_admin:PASSWORD@kamhub-production.timeweb.cloud:5432/kamhub"
bash scripts/apply-all-schemas.sh
```

---

### 3. Создание объединенного SQL файла

Для упрощения, создадим один файл со всеми схемами:

```sql
-- scripts/full-schema.sql
-- Полная схема БД KamHub

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- [Вставить содержимое всех 14 файлов схем по очереди]
-- 01-core-tables.sql
-- 02-auth-tables.sql
-- ... и т.д.
```

Применить:
```bash
psql $DATABASE_URL -f scripts/full-schema.sql
```

---

### 4. Настройка подключения в приложении

**Обновить .env на сервере:**

```bash
# /var/www/kamhub/.env

# Database - Timeweb Cloud PostgreSQL
DATABASE_URL=postgresql://kamhub_admin:YOUR_PASSWORD@kamhub-production.timeweb.cloud:5432/kamhub

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# SSL для production
DATABASE_SSL=true
```

---

### 5. Проверка подключения

**Тестовый скрипт:**

```javascript
// scripts/test-db-connection.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Подключение к БД успешно!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL версия:', result.rows[0].version);
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`📋 Таблиц создано: ${tablesResult.rows.length}`);
    console.log('Таблицы:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    client.release();
    await pool.end();
    
    console.log('✅ Тест завершен успешно!');
  } catch (error) {
    console.error('❌ Ошибка подключения:', error);
    process.exit(1);
  }
}

testConnection();
```

Запуск:
```bash
node scripts/test-db-connection.js
```

---

## 📊 АЛЬТЕРНАТИВА: Managed PostgreSQL от Timeweb

Согласно https://timeweb.cloud/, Timeweb предоставляет **Облачные базы данных** (DBaaS):

### Преимущества Managed DB:

✅ **Автоматическое резервное копирование**  
✅ **Мониторинг 24/7**  
✅ **Масштабирование "на лету"**  
✅ **99.98% SLA**  
✅ **Автоматические обновления**  
✅ **Защита от DDoS**

### Создание через панель:

1. Панель управления → Облачные базы данных
2. PostgreSQL → Выбрать конфигурацию
3. Регион: ru-1 (Россия)
4. Получить credentials
5. Применить схемы

---

## 🔐 БЕЗОПАСНОСТЬ

### Рекомендации для production:

1. **SSL подключение обязательно:**
   ```javascript
   ssl: {
     rejectUnauthorized: true,
     ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
   }
   ```

2. **Whitelist IP адресов:**
   - В панели Timeweb: Настройки БД → Разрешенные IP
   - Добавить IP вашего сервера: 5.129.248.224

3. **Сильные пароли:**
   - Минимум 16 символов
   - Использовать генератор паролей

4. **Connection pooling:**
   ```javascript
   max: 10, // максимум подключений
   idleTimeoutMillis: 30000,
   connectionTimeoutMillis: 10000,
   ```

---

## 📋 ЧЕКЛИСТ НАСТРОЙКИ

- [ ] Создать PostgreSQL БД на Timeweb Cloud
- [ ] Получить credentials (host, user, password)
- [ ] Обновить DATABASE_URL в .env
- [ ] Применить схемы БД (все 14 файлов)
- [ ] Проверить подключение (test-db-connection.js)
- [ ] Настроить SSL
- [ ] Добавить whitelist IP
- [ ] Настроить backup (автоматически в Managed DB)
- [ ] Проверить все таблицы созданы
- [ ] Запустить миграции, если есть
- [ ] Протестировать API endpoints

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

После настройки БД:

1. ✅ Применить схемы
2. ✅ Протестировать подключение
3. ✅ Загрузить начальные данные (seed data)
4. ✅ Настроить S3 CDN
5. ✅ Завершить оставшиеся TODO
6. ✅ Деплой на Timeweb Cloud

---

**Готов к настройке БД!** 🗄️





