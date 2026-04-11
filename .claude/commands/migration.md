Создай новую SQL-миграцию по стандарту проекта.

## Аргументы

`$ARGUMENTS` — описание того что мигрируем (например: "добавить таблицу operator_finance_settings")

## Шаг 1 — Получи следующий ID

Вызови `mcp__tourhab-dev__next_migration_id` чтобы узнать актуальный следующий номер.
НЕ угадывай номер по памяти — всегда смотри через MCP.

## Шаг 2 — Проверь что уже есть в БД

Через `mcp__postgres__query` проверь:
- Существует ли уже таблица/колонка/индекс, который ты собираешься создать
- Используй `information_schema.tables` или `information_schema.columns`
- Если уже существует — скажи об этом и ОСТАНОВИСЬ

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = '{TARGET_TABLE}';
```

## Шаг 3 — Создай файл миграции

Имя файла: `migrations/{NNN}_{snake_case_description}.sql`
Где `{NNN}` — padded номер из шага 1 (e.g. `0648_operator_finance_settings.sql`)

### Структура файла (обязательная):

```sql
-- Migration {NNN}: {краткое описание на русском}
-- Created: {дата YYYY-MM-DD}

BEGIN;

-- ============================================================
-- {Основное содержимое миграции}
-- ============================================================

{SQL здесь}

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS {table_name};  -- или ALTER TABLE ... DROP COLUMN ...
-- COMMIT;
```

### Правила SQL:

- **CREATE TABLE** — всегда `IF NOT EXISTS`
- **ALTER TABLE ADD COLUMN** — всегда `IF NOT EXISTS` (PostgreSQL 9.6+)
- **Индексы** — `CREATE INDEX IF NOT EXISTS`
- **Constraints** — проверяй через `information_schema.table_constraints` перед добавлением
- **Foreign keys** — на `operator_id` ссылаются на `operators(id) ON DELETE CASCADE`
- **Timestamps** — `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- **UUID** — `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **JSONB** — для гибких данных, не TEXT
- Никаких `DROP TABLE` без `IF EXISTS`
- Никаких `TRUNCATE` в миграциях

### Пример хорошей миграции:

```sql
-- Migration 0648: таблица настроек финансов оператора
-- Created: 2026-04-11

BEGIN;

CREATE TABLE IF NOT EXISTS operator_finance_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer'
                  CHECK (payout_method IN ('bank_transfer', 'card', 'sbp')),
  bank_details  JSONB,
  auto_payout   BOOLEAN NOT NULL DEFAULT false,
  payout_day    INTEGER CHECK (payout_day BETWEEN 1 AND 28),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_finance_settings_operator
  ON operator_finance_settings(operator_id);

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS operator_finance_settings;
-- COMMIT;
```

## Шаг 4 — Проверка

После создания файла:
1. Прочитай его снова и убедись что нет ошибок синтаксиса
2. Скажи: `Миграция готова: migrations/{NNN}_{name}.sql. Применить через: psql $DATABASE_URL < migrations/{NNN}_{name}.sql`
3. НЕ применяй миграцию к базе автоматически — только если пользователь явно попросит
