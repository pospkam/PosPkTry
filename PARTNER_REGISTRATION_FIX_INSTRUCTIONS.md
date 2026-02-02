# Инструкция по исправлению регистрации партнеров

## Проблемы, которые были исправлены:

### 1. ✅ Таблица `users` теперь имеет поле `password_hash`
- Создана миграция 006
- Добавлено поле для хранения хешированных паролей

### 2. ✅ Таблица `partners` теперь связана с `users` через `user_id`
- Создана миграция 007
- Один партнер = один пользователь
- Один пользователь может иметь несколько партнерских аккаунтов (по одному на каждую категорию)

### 3. ✅ API `/api/partners/register` полностью переписан
- Хеширование пароля с bcrypt
- Создание пользователя в таблице `users`
- Создание партнера (партнеров) в таблице `partners`
- Генерация JWT токена для автоматической авторизации
- Транзакционная безопасность

### 4. ✅ Добавлена зависимость `bcryptjs`
- Установлен пакет для хеширования паролей
- Добавлены типы TypeScript

## Шаги для применения исправлений:

### Шаг 1: Установите зависимости
```bash
cd /workspace
npm install
```

Это установит:
- `bcryptjs@^2.4.3`
- `@types/bcryptjs@^2.4.6`

### Шаг 2: Примените миграции к базе данных

#### Вариант А: Через SSH на Timeweb сервере
```bash
# 1. Подключитесь к серверу
ssh root@147.45.102.76
# Пароль: cLE8n-fH+QM5@U

# 2. Перейдите в директорию проекта
cd /path/to/kamhub

# 3. Запустите миграции
npx ts-node scripts/run-migrations.ts
```

#### Вариант Б: Через Node.js скрипт
```bash
# Установите переменные окружения
export DATABASE_URL="postgresql://user:password@host:port/database"

# Запустите миграции
npx ts-node scripts/run-migrations.ts
```

#### Вариант В: Вручную через psql
```bash
# Подключитесь к PostgreSQL
psql $DATABASE_URL

# Выполните миграцию 006
\i lib/database/migrations/006_add_password_hash_to_users.sql

# Выполните миграцию 007
\i lib/database/migrations/007_add_user_id_to_partners.sql
```

### Шаг 3: Проверьте изменения

#### Проверка структуры таблицы users:
```sql
\d users
```

Должно содержать:
- `password_hash` VARCHAR(255)

#### Проверка структуры таблицы partners:
```sql
\d partners
```

Должно содержать:
- `user_id` UUID
- Внешний ключ `fk_partners_user_id`
- Индекс `idx_partners_user_id`
- Уникальный индекс `idx_partners_user_category`

### Шаг 4: Перезапустите приложение
```bash
# Если используете PM2
pm2 restart kamhub

# Если используете Docker
docker-compose restart

# Если запускаете напрямую
npm run build
npm start
```

## Тестирование:

### 1. Откройте форму регистрации партнера
```
http://your-domain.com/partner/register
```

### 2. Заполните форму:
- **Название компании**: "Тестовая компания"
- **Email**: "test@example.com"
- **Телефон**: "+7 (999) 123-45-67"
- **Пароль**: "test12345678"
- **Роль**: Выберите одну или несколько

### 3. Отправьте форму

### 4. Проверьте результат:

#### ✅ Успешная регистрация:
- Создан пользователь в таблице `users`
- Создан партнер (или партнеры) в таблице `partners`
- Пароль захеширован в БД
- JWT токен установлен в cookie
- Пользователь автоматически авторизован
- Перенаправление на `/partner/dashboard`

#### ❌ Ошибка "уже зарегистрирован":
- Email уже существует в БД
- Попробуйте другой email

#### ❌ Ошибка валидации:
- Проверьте формат данных
- Пароль должен быть минимум 8 символов

## SQL Запросы для проверки:

### Проверить созданного пользователя:
```sql
SELECT id, email, name, role, password_hash 
FROM users 
WHERE email = 'test@example.com';
```

### Проверить созданного партнера:
```sql
SELECT p.id, p.name, p.category, p.user_id, u.email
FROM partners p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'test@example.com';
```

### Проверить связь users ↔ partners:
```sql
SELECT 
  u.id as user_id,
  u.email,
  u.name as user_name,
  u.role as user_role,
  p.id as partner_id,
  p.name as partner_name,
  p.category,
  p.is_verified
FROM users u
LEFT JOIN partners p ON u.id = p.user_id
WHERE u.email = 'test@example.com';
```

## Откат изменений (если нужно):

### Откатить миграцию 007:
```sql
DROP INDEX IF EXISTS idx_partners_user_category;
DROP INDEX IF EXISTS idx_partners_user_id;
ALTER TABLE partners DROP CONSTRAINT IF EXISTS fk_partners_user_id;
ALTER TABLE partners DROP COLUMN IF EXISTS user_id;
```

### Откатить миграцию 006:
```sql
DROP INDEX IF EXISTS idx_users_email_password;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
```

## Важные заметки:

1. **Безопасность**: Пароли теперь хешируются с bcrypt (10 раундов)
2. **Транзакции**: Все операции выполняются в транзакции
3. **JWT**: Токен действителен 7 дней
4. **Валидация**: Email должен быть уникальным
5. **Верификация**: Партнеры требуют подтверждения администратором

## Что дальше:

1. Протестируйте регистрацию на staging окружении
2. Проверьте авторизацию после регистрации
3. Убедитесь, что dashboard доступен
4. Настройте email уведомления для админов о новых партнерах
5. Добавьте страницу верификации для админов

## Контакты для поддержки:

- GitHub Issue: https://github.com/PosPk/kamhub/issues
- Pull Request: https://github.com/PosPk/kamhub/pull/19
