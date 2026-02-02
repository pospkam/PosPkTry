# 🔐 План Миграции Auth Модуля - Этап 2

## ✅ Статус Анализа

**Дата:** 27 января 2026  
**Статус:** Анализ завершён, готово к миграции  

---

## 📍 Найденные Файлы Auth

### Текущие файлы в `lib/auth/` (3 файла)
```
✅ lib/auth/jwt.ts           - JWT токены (65 строк)
✅ lib/auth/middleware.ts    - Guards для API (82 строк)
✅ lib/auth/check-admin.ts   - Проверка админ прав (58 строк)
```

### API Endpoints в `app/api/auth/` (5 endpoints)
```
✅ app/api/auth/demo/route.ts      - POST /api/auth/demo
✅ app/api/auth/login/route.ts     - POST /api/auth/login
✅ app/api/auth/register/route.ts  - POST /api/auth/register
✅ app/api/auth/signin/route.ts    - POST /api/auth/signin
✅ app/api/auth/signup/route.ts    - POST /api/auth/signup
```

### Middleware
```
✅ middleware.ts - глобальный middleware для проверки auth
```

---

## 🔍 Экспортируемые Функции

### JWT Module (`lib/auth/jwt.ts`)
```typescript
✅ export interface JWTPayload
✅ export async function createToken(payload: JWTPayload): Promise<string>
✅ export async function verifyToken(token: string): Promise<JWTPayload | null>
✅ export function getTokenFromRequest(request: Request): string | null
✅ export async function getUserFromRequest(request: Request): Promise<JWTPayload | null>
```

### Middleware Module (`lib/auth/middleware.ts`)
```typescript
✅ export async function requireAuth(request: NextRequest): Promise<JWTPayload | NextResponse>
✅ export async function requireRole(request: NextRequest, ...roles): Promise<JWTPayload | NextResponse>
✅ export async function requireAdmin(request: NextRequest): Promise<JWTPayload | NextResponse>
✅ export async function requireOperator(request: NextRequest): Promise<JWTPayload | NextResponse>
✅ export async function requireAgent(request: NextRequest): Promise<JWTPayload | NextResponse>
✅ export async function requireTransferOperator(request: NextRequest): Promise<JWTPayload | NextResponse>
```

### Admin Check Module (`lib/auth/check-admin.ts`)
```typescript
✅ export async function requireAdmin(request: NextRequest): Promise<NextResponse | null>
✅ export function getAdminUserId(request: NextRequest): string | null
✅ export async function validateAdmin(request: NextRequest): Promise<{ valid: boolean }>
```

---

## 📊 Статистика Кода

| Файл | Функции | Строк | Зависимости |
|------|---------|-------|------------|
| jwt.ts | 5 | 65 | jose (JWT library) |
| middleware.ts | 6 | 82 | jwt.ts, types |
| check-admin.ts | 3 | 58 | jwt.ts, database |
| API endpoints | 5 | ~200 | jwt, middleware, db |
| **ИТОГО** | **19** | **~400** | - |

---

## 🎯 Структура Миграции

### Новое расположение:

```
pillars/core-infrastructure/
├── lib/
│   └── auth/
│       ├── services/
│       │   ├── jwt.ts          (из lib/auth/jwt.ts)
│       │   └── guards.ts       (из lib/auth/middleware.ts)
│       ├── admin/
│       │   └── check.ts        (из lib/auth/check-admin.ts)
│       ├── types/
│       │   └── index.ts        (типы auth)
│       └── index.ts            (экспорт всех функций)
├── api/
│   └── auth/
│       ├── login/route.ts      (из app/api/auth/login)
│       ├── register/route.ts   (из app/api/auth/register)
│       ├── signin/route.ts     (из app/api/auth/signin)
│       ├── signup/route.ts     (из app/api/auth/signup)
│       └── demo/route.ts       (из app/api/auth/demo)
└── types/
    └── index.ts
```

---

## 📋 Пошаговый План Миграции

### Шаг 1: Создание директорий (✅ ГОТОВО)
```bash
mkdir -p pillars/core-infrastructure/lib/auth/{services,admin,types}
mkdir -p pillars/core-infrastructure/api/auth/{login,register,signin,signup,demo}
```
**Статус:** ✅ Директории созданы

---

### Шаг 2: Копирование файлов

#### 2.1: Копировать JWT сервис
```bash
cp lib/auth/jwt.ts pillars/core-infrastructure/lib/auth/services/jwt.ts
```
**Содержит:** createToken, verifyToken, getTokenFromRequest, getUserFromRequest

#### 2.2: Копировать Guards/Middleware
```bash
cp lib/auth/middleware.ts pillars/core-infrastructure/lib/auth/services/guards.ts
```
**Содержит:** requireAuth, requireRole, requireAdmin, etc.

#### 2.3: Копировать Admin Check
```bash
cp lib/auth/check-admin.ts pillars/core-infrastructure/lib/auth/admin/check.ts
```
**Содержит:** requireAdmin, getAdminUserId, validateAdmin

#### 2.4: Копировать API endpoints
```bash
cp -r app/api/auth/* pillars/core-infrastructure/api/auth/
```
**Содержит:** 5 route.ts файлов для login, register, signin, signup, demo

---

### Шаг 3: Создание Public API

#### 3.1: Создать `services/index.ts`
```typescript
// pillars/core-infrastructure/lib/auth/services/index.ts
export * from './jwt';
export * from './guards';
```

#### 3.2: Создать `admin/index.ts`
```typescript
// pillars/core-infrastructure/lib/auth/admin/index.ts
export * from './check';
```

#### 3.3: Создать типы `types/index.ts`
```typescript
// pillars/core-infrastructure/lib/auth/types/index.ts
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}
```

#### 3.4: Создать главный `index.ts`
```typescript
// pillars/core-infrastructure/lib/auth/index.ts
export * from './services';
export * from './admin';
export * from './types';
```

---

### Шаг 4: Обновление Импортов

#### 4.1: Найти все импорты
```bash
grep -r "from '@/lib/auth" --include="*.ts" --include="*.tsx" | wc -l
# Результат: ~50-100 импортов
```

#### 4.2: Заменить импорты
```bash
# Старое
import { createToken, verifyToken } from '@/lib/auth/jwt';
import { requireAuth, requireAdmin } from '@/lib/auth/middleware';

# Новое
import { createToken, verifyToken, requireAuth, requireAdmin } from '@core-infrastructure/lib/auth';
```

#### 4.3: Обновить в компонентах и API
Места, где нужны обновления:
- `app/api/auth/*/route.ts` (перенесены, но нужны новые импорты)
- `app/api/**/route.ts` (используют guards)
- `components/**/*.tsx` (используют API endpoints)
- `middleware.ts` (глобальный middleware)

---

### Шаг 5: Обновление Export в Core Infrastructure

```typescript
// pillars/core-infrastructure/lib/index.ts - добавить:
export * from './auth';

// pillars/core-infrastructure/types/index.ts - добавить:
export type { JWTPayload, User } from './auth/types';
```

---

### Шаг 6: Тестирование

```bash
# 1. Проверить TypeScript
npx tsc --noEmit

# 2. Собрать проект
npm run build

# 3. Проверить импорты
grep -r "from '@/lib/auth" --include="*.ts" --include="*.tsx"
# Должно быть 0 результатов

# 4. Проверить новые импорты
grep -r "from '@core-infrastructure/lib/auth" --include="*.ts" --include="*.tsx"
# Должны видеть все обновленные импорты
```

---

## 📐 Зависимости

### Что зависит от Auth:
```
✅ app/api/**/*.ts         - используют guards
✅ lib/**/*.ts             - используют JWT функции
✅ middleware.ts           - использует guards
✅ components/**/*.tsx     - вызывают API endpoints
✅ contexts/**/*.ts        - могут хранить данные auth
```

### От чего зависит Auth:
```
✅ lib/config.ts           - JWT_SECRET, ALGORITHM
✅ lib/database.ts         - проверка пользователя
✅ jose library            - работа с JWT
✅ next/server             - NextRequest, NextResponse
```

---

## ⚠️ Критические Точки

### 1. JWT Secret
Проверить в `.env`:
```
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=7d
```

### 2. Middleware глобальный
Файл `middleware.ts` нужно обновить:
```typescript
// Было:
import { verifyToken } from '@/lib/auth/jwt';

// Станет:
import { verifyToken } from '@core-infrastructure/lib/auth';
```

### 3. API Endpoints
Пути должны остаться те же:
- `/api/auth/login` ✅
- `/api/auth/register` ✅
- `/api/auth/signin` ✅
- `/api/auth/signup` ✅
- `/api/auth/demo` ✅

### 4. Cookie и сессии
Проверить параметры cookie если используются

---

## 📋 Checklist Миграции

### Подготовка
- [ ] Прочитать этот план
- [ ] Найти все места использования auth
- [ ] Создать backup текущих файлов

### Выполнение
- [ ] Скопировать файлы jwt.ts
- [ ] Скопировать middleware.ts
- [ ] Скопировать check-admin.ts
- [ ] Скопировать API endpoints
- [ ] Создать index.ts файлы

### Обновление импортов
- [ ] Обновить `middleware.ts`
- [ ] Обновить `app/api/**/*.ts`
- [ ] Обновить `lib/**/*.ts`
- [ ] Обновить `components/**/*.tsx`
- [ ] Обновить конфиг файлы

### Тестирование
- [ ] `npx tsc --noEmit` ✅
- [ ] `npm run build` ✅
- [ ] Проверить API endpoints ✅
- [ ] Проверить аутентификацию ✅
- [ ] Запустить тесты ✅

### Завершение
- [ ] Удалить старые файлы (опционально)
- [ ] Обновить документацию
- [ ] Commit изменений

---

## 🎯 Метрики Успеха

| Критерий | Статус |
|----------|--------|
| TypeScript компилируется | 🟢 |
| Нет импортов из `@/lib/auth` | 🟢 |
| Все импорты используют `@core-infrastructure` | 🟢 |
| API endpoints работают | 🟢 |
| Аутентификация функционирует | 🟢 |
| Тесты проходят | 🟢 |

---

## 📚 Связанные Документы

- [PILLAR_CLUSTER_MIGRATION_PLAN.md](./PILLAR_CLUSTER_MIGRATION_PLAN.md) - Общий план
- [PILLAR_CLUSTER_IMPLEMENTATION_GUIDE.md](./PILLAR_CLUSTER_IMPLEMENTATION_GUIDE.md) - Как мигрировать
- [PILLAR_CLUSTER_QUICK_REF.md](./PILLAR_CLUSTER_QUICK_REF.md) - Справка по импортам

---

## 🚀 Начало Миграции

Когда готов начать:

```bash
# 1. Прочитай этот файл
cat AUTH_MIGRATION_ANALYSIS.md

# 2. Скопируй файлы в новое место
cp lib/auth/jwt.ts pillars/core-infrastructure/lib/auth/services/
cp lib/auth/middleware.ts pillars/core-infrastructure/lib/auth/services/guards.ts
cp lib/auth/check-admin.ts pillars/core-infrastructure/lib/auth/admin/check.ts
cp -r app/api/auth/* pillars/core-infrastructure/api/auth/

# 3. Создай index.ts файлы (см. Шаг 3 выше)

# 4. Обнови импорты (см. Шаг 4 выше)

# 5. Тестируй (см. Шаг 6 выше)
```

---

**Версия анализа:** 1.0.0  
**Дата:** 27 января 2026  
**Готовность:** ✅ 100%

