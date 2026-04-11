# Skill: db-preflight

Перед написанием любого кода, который работает с базой данных (API route, SQL-запрос, UI с данными из БД), ты ОБЯЗАН выполнить предварительную проверку схемы.

## Когда активировать

Этот skill активируется автоматически когда задача включает:
- Создание или изменение API route с SQL-запросами
- Создание UI-страницы, которая отображает данные из БД
- Любое упоминание таблиц: `operator_tours`, `operator_bookings`, `operator_settings`, `partners`, или любых `operator_*` таблиц
- Фразы: "добавь поле", "покажи данные", "создай страницу", "создай endpoint"

## Обязательные запросы (выполнить через mcp__postgres__query)

### 1. Проверка таблиц

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'operator_%'
ORDER BY table_name;
```

### 2. Схема целевой таблицы

Для КАЖДОЙ таблицы, которую планируешь использовать:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{TABLE_NAME}'
ORDER BY ordinal_position;
```

### 3. Проверка связей (если JOIN)

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = '{TABLE_NAME}';
```

## Что делать с результатами

1. **Записать** реальные имена колонок и типы данных
2. **Сверить** с тем что ты собирался написать
3. **Исправить** любые расхождения ДО написания кода
4. **Отметить** колонки которые НЕ существуют в проде (из непримененных миграций)

## Частые ловушки (исторические баги)

| Ты думаешь | На самом деле |
|-----------|--------------|
| `status` | `booking_status` (в operator_bookings) |
| `total_price` | `final_price` (в operator_bookings) |
| `group_size` | `participants` (в operator_bookings) |
| `photos` — JSONB | `photos` — TEXT[] |
| `included` — TEXT | `included` — JSONB |
| `operator_staff` существует | ДА, в проде (миграция 050 применена) |
| `operator_ai_config` существует | ДА, в проде (миграция 053 применена) |
| `operator_ai_actions` существует | ДА, в проде (миграция 055 применена) |

## Запрещено

- Писать SQL без предварительного запроса схемы
- Угадывать имена колонок по миграциям, памяти или документации
- Создавать UI для таблиц из непримененных миграций без подтверждения пользователя
- Использовать `SELECT *` — только явные колонки
