Проведи аудит кода в текущем репозитории на нарушения правил из CLAUDE.md.

## Что проверять

### 1. TypeScript
- Поиск `any` в `.ts` и `.tsx` файлах (запрещено — только `unknown` + type guards)
- `console.log` в продакшн-коде (запрещено — только `console.error` в catch)

### 2. Импорты
- `import pool from` (запрещено — только `import { pool } from '@/lib/db-pool'`)
- Default import вместо named export

### 3. SQL безопасность
- Конкатенация строк в SQL-запросах (запрещено — только $1, $2 параметры)
- `SELECT *` (запрещено — только явные колонки)
- `FROM operator_bookings` без JOIN на `operator_tours WHERE operator_id` (запрещено)

### 4. API routes
- POST/PATCH без Zod-валидации
- API route без `getSession()` check (кроме public: health, auth/signin, webhooks)
- SQL без try/catch

### 5. Дизайн-система
- Хардкод hex цветов (#fff, #000, #E8734A) вместо CSS vars
- `bg-white` вместо `card` или `bg-[var(--card-bg)]`
- `backdrop-blur` (запрещено)
- `rounded-2xl` (запрещено — максимум rounded-lg)
- Эмодзи в коде и UI

## Как искать

Используй Grep для поиска паттернов по файлам `.ts` и `.tsx` в директориях `app/` и `lib/`.
Для UI-проверок также проверяй `components/`.

## Формат отчёта

```
АУДИТ: {repo_name}
Дата: {текущая дата}

КРИТИЧНЫЕ (нужно исправить):
- [ ] {файл}:{строка} — {описание проблемы}

ПРЕДУПРЕЖДЕНИЯ (желательно):
- [ ] {файл}:{строка} — {описание}

СТАТИСТИКА:
| Проверка | Нарушений |
|----------|----------|
| any типы | ? |
| console.log | ? |
| SQL конкатенация | ? |
| Нет Zod | ? |
| Хардкод hex | ? |
| Нет auth check | ? |
```

Будь конкретен: точный файл, строка, что не так.
