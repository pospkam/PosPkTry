# Исправление ошибки регистрации партнера ✅

## Проблема

При регистрации партнера возникала ошибка:
```
SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

## Причина

1. **Отсутствие DATABASE_URL в .env файле**
   - На сервере не была настроена переменная окружения DATABASE_URL
   - Приложение использовало значение по умолчанию без пароля
   - PostgreSQL требует аутентификацию с паролем

2. **Несоответствие структуры таблиц**
   - Существующая таблица `partners` имела другую структуру (для бизнес-объектов)
   - Не было таблицы для хранения заявок на регистрацию партнеров
   - Таблица `users` не имела поля `password`

## Решение

### 1. Настройка подключения к БД

**Файл**: `/var/www/kamhub/.env`

Добавлены переменные окружения:
```bash
DATABASE_URL=postgresql://kamuser:kamchatour2024@localhost:5432/kamchatour
JWT_SECRET=kamchatour-super-secret-jwt-key-2024-production
```

**Настройка PostgreSQL**:
```sql
-- Установлен пароль для пользователя kamuser
ALTER USER kamuser WITH PASSWORD 'kamchatour2024';

-- Предоставлены права доступа
GRANT ALL PRIVILEGES ON DATABASE kamchatour TO kamuser;
GRANT ALL PRIVILEGES ON SCHEMA public TO kamuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kamuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kamuser;
```

### 2. Создание структуры БД

**Таблица для заявок партнеров**:
```sql
CREATE TABLE partner_applications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  
  -- Дополнительная информация
  description TEXT,
  address TEXT,
  website VARCHAR(500),
  logo_url TEXT,
  
  -- Направления деятельности
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Статус модерации
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Даты
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  
  -- Модератор
  approved_by UUID REFERENCES users(id)
);
```

**Индексы**:
```sql
CREATE INDEX idx_partner_applications_user_id ON partner_applications(user_id);
CREATE INDEX idx_partner_applications_email ON partner_applications(email);
CREATE INDEX idx_partner_applications_status ON partner_applications(status);
CREATE INDEX idx_partner_applications_roles ON partner_applications USING GIN (roles);
```

**Обновление таблицы users**:
```sql
-- Добавлено поле password
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Обновлен constraint для ролей
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('tourist', 'operator', 'guide', 'provider', 'partner', 'admin'));
```

### 3. Обновление API endpoint

**Файл**: `/workspace/app/api/partners/register/route.ts`

Изменена таблица для сохранения заявок:
```typescript
// Было: partners
// Стало: partner_applications

const partnerResult = await query(
  `INSERT INTO partner_applications (
    user_id, name, email, phone, description, 
    address, website, logo_url, roles, status
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
  RETURNING id`,
  [userId, data.name, data.email, data.phone, 
   data.description || null, data.address || null, 
   data.website || null, data.logoUrl || null, 
   JSON.stringify(data.roles), 'pending']
);
```

## Результат

### ✅ Проблема решена

**Тестовая регистрация**:
```bash
curl -X POST http://5.129.248.224/api/partners/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тестовая компания",
    "email": "test@example.com",
    "phone": "+79991234567",
    "password": "testpassword123",
    "description": "Тестовое описание",
    "address": "г. Петропавловск-Камчатский",
    "website": "https://example.com",
    "roles": ["operator", "transfer"]
  }'
```

**Ответ**:
```json
{
  "success": true,
  "applicationId": 1,
  "userId": "ddeaa0ed-d366-4f17-9962-203c1d2d46d3",
  "message": "Заявка успешно отправлена на модерацию"
}
```

**Проверка в БД**:

1. **Пользователь создан**:
```sql
SELECT id, email, name, role FROM users WHERE email = 'test@example.com';
```
```
id                                   | email            | name              | role
-------------------------------------|------------------|-------------------|--------
ddeaa0ed-d366-4f17-9962-203c1d2d46d3 | test@example.com | Тестовая компания | partner
```

2. **Заявка создана**:
```sql
SELECT * FROM partner_applications WHERE id = 1;
```
- ID: 1
- User ID: ddeaa0ed-d366-4f17-9962-203c1d2d46d3
- Name: Тестовая компания
- Email: test@example.com
- Phone: +79991234567
- Status: pending
- Roles: ["operator", "transfer"]

## Процесс регистрации партнера

1. **Пользователь заполняет форму** (3 шага)
   - Основная информация
   - О компании
   - Направления деятельности

2. **Данные отправляются на сервер**
   - POST /api/partners/register

3. **Создается пользователь в таблице users**
   - Role: 'partner'
   - Password: хешируется с помощью bcrypt

4. **Создается заявка в partner_applications**
   - Status: 'pending'
   - Связь с пользователем через user_id

5. **Администратор модерирует заявку**
   - Может одобрить (approved)
   - Может отклонить (rejected)

6. **После одобрения партнер получает доступ**
   - К личному кабинету
   - К функционалу платформы

## Технические детали

### Безопасность
- ✅ Пароли хешируются с помощью bcrypt (12 раундов)
- ✅ Email уникален в базе данных
- ✅ Валидация на клиенте и сервере
- ✅ SQL-инъекции предотвращены (параметризованные запросы)

### База данных
- ✅ PostgreSQL 16.10
- ✅ Пользователь: kamuser
- ✅ База: kamchatour
- ✅ Все права предоставлены

### Деплой
- ✅ Код задеплоен на сервер 5.129.248.224
- ✅ PM2 перезапущен
- ✅ Приложение работает корректно

## Коммиты

1. **3f431801**: Создание системы определения устройства + device.ts
2. **6876f3fe**: Многошаговая форма с автосохранением, drag&drop и валидацией
3. **52f03812**: Документация по редизайну формы регистрации партнера
4. **63b26b78**: Исправление регистрации партнера - добавлена таблица partner_applications

---

**Дата исправления**: 2025-11-15  
**Статус**: ✅ Полностью исправлено и протестировано
