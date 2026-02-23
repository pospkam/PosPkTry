# TOOLS — Инструменты и конвенции проекта Kamhub

## Стек и окружение

- **Runtime:** Node.js (LTS), npm
- **Framework:** Next.js 15 (App Router)
- **Язык:** TypeScript (strict mode)
- **CSS:** Tailwind CSS
- **БД:** PostgreSQL (Timeweb Cloud)
- **Тесты:** Vitest
- **OS:** Ubuntu 24.04 (dev container)

## Основные команды

```bash
npm run dev          # Dev-сервер на порту 3000
npm run build        # Продакшен сборка (Next.js)
npm test             # Тесты (vitest)
npm run lint         # ESLint проверка
npm run type-check   # npx tsc --noEmit
```

## Переменные окружения

Файл `.env.local` (не в git). Обязательные:

```
JWT_SECRET=           # минимум 32 символа
DATABASE_URL=         # postgresql://user:pass@host:5432/db
NEXTAUTH_SECRET=      # произвольная строка
TIMEWEB_TOKEN=        # API токен Timeweb Cloud
```

Опциональные AI-провайдеры:
```
GROQ_API_KEY=
DEEPSEEK_API_KEY=
MINIMAX_API_KEY=
XAI_API_KEY=
```

## Структура директорий

```
app/          — Next.js App Router: страницы и API routes
components/   — React компоненты
lib/          — Утилиты, сервисы, хелперы
types/        — TypeScript типы
hooks/        — React хуки
contexts/     — React контексты (Auth, Theme, Role, Orders)
database/     — SQL схемы
migrations/   — БД миграции
public/       — Статика
```

## Конвенции кода

### Файлы страниц (Next.js)
Никогда не смешивать `'use client'` и `export const metadata` в одном файле:
```
app/tours/page.tsx          # Server component: только metadata + import Client
app/tours/_ToursPageClient.tsx  # Client: вся логика с 'use client'
```

### Коммиты
Conventional Commits:
- `feat:` — новая функциональность
- `fix:` — исправление ошибок
- `docs:` — документация
- `refactor:` — рефакторинг без изменения поведения

### Именование
- Компоненты: `PascalCase`
- Хуки: `useXxx`
- API routes: `app/api/[resource]/route.ts`
- Client-компоненты страниц: `_XxxPageClient.tsx` (с префиксом `_`)

## Инструменты разработки

### Проверка типов локально
```bash
npx tsc --noEmit 2>&1 | head -50
```

### Поиск ошибок в конкретном файле
```bash
npx tsc --noEmit 2>&1 | grep "components/admin"
```

### Линтинг одного файла
```bash
npx eslint components/MyComponent.tsx
```

### React Doctor — аудит кода
```bash
npx -y react-doctor@latest
```

### Анализ бандла
```bash
ANALYZE=true npm run build
```

## Деплой

Платформа: Timeweb Cloud Apps  
Автодеплой: push в ветку `main`  
Продакшен: https://pospk-kamhub-c8e0.twc1.net

### Ручной деплой через MCP
Через GitHub Copilot с Timeweb MCP Server (`.vscode/mcp.json`).

## База данных

**Хост:** 8ad609fcbfd2ad0bd069be47.twc1.net  
**Порт:** 5432

Миграции: `lib/database/migrations/`  
Схемы: `database/*.sql`

## Известные ограничения

- `app/api/**/*` исключён из TypeScript проверки в `tsconfig.json`
- `timeweb-mcp-server.ts` исключён из сборки (зависимость не установлена)
- `sentry.{client,edge,server}.config.ts` исключены из tsconfig
- `pillars/` — legacy директория, не используется в основном коде

## Пакеты, которых НЕТ в package.json

Следующие пакеты отсутствуют — использовать альтернативы:
- `tailwind-merge` → использовать `clsx` напрямую (`lib/utils.ts: cn()`)
- `@modelcontextprotocol/sdk` → файл `timeweb-mcp-server.ts` изолирован
