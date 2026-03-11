# Tech Debt: TypeScript Build Errors in API Routes

**Дата анализа:** 11 марта 2026
**Общее количество TS ошибок в `app/api/`:** ~847

Файл `app/api/**/*` исключён из `tsconfig.json` (`exclude`) чтобы не блокировать деплой пока ошибки не исправлены.
ESLint включён полностью. TypeScript включён для всей кодовой базы **кроме** `app/api/`.

---

## Статус проверок качества

| Проверка | Было | Стало |
|---------|------|-------|
| `typescript.ignoreBuildErrors` | `true` | `false` |
| `eslint.ignoreDuringBuilds` | `true` | `false` |
| `app/api/**/*` в tsconfig exclude | нет | **да** (временно) |
| TS ошибки вне API | 15 | **0** (исправлены) |
| ESLint ошибки | 2 | **0** (исправлены) |

---

## Исправленные ошибки (11 марта 2026)

| Файл | Строка | Ошибка | Фикс |
|------|--------|--------|------|
| `app/partner/tours/add/_AddTourPageClient.tsx` | 417 | `'Image' is not defined` | Добавлен `import Image from 'next/image'` |
| `components/shared/ModernTourSearch.tsx` | 60 | `missing display name` | Добавлен `TourCard.displayName = 'TourCard'` |
| `components/admin/shared/DataTable.tsx` | 64 | `'aValue' is of type 'unknown'` | Cast `aValue as string \| number` |
| `lib/auth/gear-helpers.ts` | 255 | `null not assignable to Record<string, unknown>` | Return type → `\| null` |
| `lib/auth/gear-helpers.ts` | 395 | `string[] not assignable to (string\|number\|null)[]` | Params type → включает `string[]` |
| `lib/auth/guide-helpers.ts` | 290 | `null not assignable to Record<string, unknown>` | Return type → `\| null` |
| `lib/auth/tourist-helpers.ts` | 114 | `tripCount is of type 'unknown'` | `Number(profile.total_trips ?? 0)` |
| `lib/auth/tourist-helpers.ts` | 192 | `Property 'length' does not exist on '{}'` | Cast `profile.interests as string[]` |
| `lib/auth/tourist-helpers.ts` | 244 | `null not assignable to Record<string, unknown>` | Return type → `\| null` |
| `lib/auth/transfer-helpers.ts` | 345 | `null not assignable to Record<string, unknown>` | Return type → `\| null` |
| `lib/monitoring.ts` | 58 | `Console overlaps with Record<string, ...>` | Double cast `as unknown as Record<...>` |

---

## Каталог ошибок в `app/api/` (~847 ошибок)

### Топ категории ошибок (по паттерну)

| Категория | Кол-во (прим.) | Пример файла | Быстрый фикс |
|-----------|----------------|--------------|--------------|
| `Type 'null' not assignable` | ~200 | `app/api/tours/route.ts` | Добавить `\| null` к return type |
| `Property '...' does not exist on type 'unknown'` (DB rows) | ~180 | `app/api/bookings/[id]/route.ts` | Типизировать rows через интерфейс |
| `'date' is of type 'unknown'` | ~120 | `app/api/accommodations/[id]/availability/route.ts` | `String(row.date)` или typed interface |
| `Argument of type 'unknown' not assignable` | ~100 | `app/api/operator/tours/route.ts` | Добавить type guards или `as string` |
| `Object is possibly 'null' or 'undefined'` | ~80 | `app/api/admin/users/route.ts` | Optional chaining `?.` или null check |
| `Cannot find name` / импорты | ~30 | Разные | Добавить правильный импорт |
| Прочие | ~137 | — | — |

### Приоритет исправления

#### 🔴 КРИТИЧНЫЕ (исправить в первую очередь)
Файлы с логикой бронирования и оплаты — там ошибки могут привести к runtime exceptions:

| Файл | Приоритет | Примечание |
|------|-----------|------------|
| `app/api/bookings/**/*.ts` | P0 | Критичная бизнес-логика |
| `app/api/payments/**/*.ts` | P0 | Финансовые операции |
| `app/api/auth/**/*.ts` | P0 | Безопасность |
| `app/api/tours/**/*.ts` | P1 | Основной контент |
| `app/api/operator/**/*.ts` | P1 | Партнёры |

#### 🟡 СРЕДНИЕ
| Файл | Приоритет |
|------|-----------|
| `app/api/admin/**/*.ts` | P2 |
| `app/api/notifications/**/*.ts` | P2 |
| `app/api/reviews/**/*.ts` | P2 |

#### 🟢 НИЗКИЕ (стабы/заглушки)
| Файл | Приоритет |
|------|-----------|
| `app/api/metrics/**/*.ts` | P3 |
| `app/api/reports/**/*.ts` | P3 |
| `app/api/availability/**/*.ts` | P3 |

---

## План устранения

### Итерация 1 (следующий PR)
Убрать `app/api/**/*` из exclusions для группы критичных файлов:
1. Исправить `app/api/bookings/`, `app/api/payments/`, `app/api/auth/` (~200 ошибок)
2. Создать typed interfaces для DB row результатов в `lib/types/db-rows.ts`
3. Обновить tsconfig: заменить полный exclude на более точное исключение

### Итерация 2
4. Исправить `app/api/tours/`, `app/api/operator/` (~200 ошибок)

### Итерация 3
5. Исправить оставшиеся API routes (~450 ошибок)
6. Убрать `app/api/**/*` из tsconfig exclude полностью

---

## Часто встречающийся паттерн и его фикс

### Проблема: DB rows типизированы как `unknown`

```typescript
// ❌ Ошибка
const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
const booking = result.rows[0];
return { status: booking.status }; // TS: 'status' does not exist on type 'Record<string, unknown>'
```

### Решение A: Typed interface (рекомендуется)
```typescript
// ✅ Правильно
interface BookingRow {
  id: string;
  status: string;
  total_price: number;
  created_at: Date;
}
const result = await pool.query<BookingRow>('SELECT * FROM bookings WHERE id = $1', [id]);
const booking = result.rows[0];
return { status: booking.status }; // OK
```

### Решение B: Type assertion (быстрый)
```typescript
// ✅ Приемлемо для быстрого фикса
const booking = result.rows[0] as Record<string, unknown>;
return { status: booking.status as string };
```

### Проблема: Функция не возвращает `null` в типе
```typescript
// ❌ Ошибка
async function getStats(id: string): Promise<Record<string, unknown>> {
  if (!found) return null; // TS error
}

// ✅ Фикс
async function getStats(id: string): Promise<Record<string, unknown> | null> {
  if (!found) return null; // OK
}
```

---

## Топ-10 паттернов фиксов

### 1. DB row без типа → typed interface
```typescript
// ❌
const r = await pool.query('SELECT id, status FROM bookings WHERE id=$1', [id]);
const b = r.rows[0];
b.status; // unknown

// ✅ (рекомендуется — создать в lib/types/db-rows.ts)
interface BookingRow { id: string; status: string; total_price: number; }
const r = await pool.query<BookingRow>('SELECT ...', [id]);
r.rows[0].status; // string
```

### 2. `return null` в функции с non-nullable return type
```typescript
// ❌
async function find(id: string): Promise<Tour> { return null; }

// ✅
async function find(id: string): Promise<Tour | null> { return null; }
```

### 3. `any` → `unknown` + type guard
```typescript
// ❌
function process(data: any) { return data.name; }

// ✅
function process(data: unknown) {
  if (typeof data === 'object' && data && 'name' in data)
    return (data as { name: string }).name;
}
```

### 4. `req.body` / `JSON.parse` → typed zod или assertion
```typescript
// ❌
const { email } = await req.json(); // unknown

// ✅ быстрый
const body = await req.json() as { email: string; password: string };
const { email, password } = body;
```

### 5. `Object is possibly null/undefined` → optional chaining
```typescript
// ❌
const name = user.profile.name;

// ✅
const name = user?.profile?.name ?? '';
```

### 6. `string[] not assignable to (string|number|null)[]`
```typescript
// ❌
function foo(ids: (string|number|null)[]) {}
const arr: string[] = ['a'];
foo(arr); // error

// ✅
foo(arr as (string|number|null)[]);
// или расширить тип параметра: ids: string[]
```

### 7. Implicit `any` в catch
```typescript
// ❌
} catch (e) { console.error(e.message); } // e is unknown

// ✅
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
}
```

### 8. `Promise<void>` vs `Promise<NextResponse>`
```typescript
// ❌
export async function GET(): Promise<void> {
  return NextResponse.json({}); // Type 'NextResponse' not assignable
}

// ✅
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({});
}
// или просто убрать return type — Next.js выводит его сам
```

### 9. Array.prototype методы на `unknown`
```typescript
// ❌
const tags = profile.tags; // unknown
tags.map(t => t); // error

// ✅
const tags = Array.isArray(profile.tags) ? profile.tags as string[] : [];
```

### 10. Missing return type на async handler
```typescript
// ❌ (ESLint @typescript-eslint/explicit-function-return-type)
export async function POST(req: NextRequest) { ... }

// ✅
export async function POST(req: NextRequest): Promise<NextResponse> { ... }
```

---

## Ветка и PR для Итерации 1

```
Ветка:  fix/api-ts-errors-p0-bookings-payments-auth
PR:     fix: TypeScript errors in P0 API routes (bookings, payments, auth)
```

**Описание PR:**
```
## Summary
- Fix ~200 TS errors in app/api/bookings/, app/api/payments/, app/api/auth/
- Create lib/types/db-rows.ts with typed interfaces for DB query results
- Update tsconfig.json: replace `app/api/**/*` with more targeted excludes

## Test plan
- [ ] npm run build exits 0
- [ ] Booking flow works end-to-end
- [ ] Payment status updates correctly
- [ ] Login/logout not broken
```
