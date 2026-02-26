# 🚀 PHASE 2E-1: ИСПРАВЛЕНИЕ 60 КРИТИЧНЫХ ПРОБЛЕМ

**Дата начала:** 28 января 2026
**Цель:** Исправить все блокирующие проблемы за 7 дней
**Статус:** ⏳ В процессе

---

## 📊 ПРИОРИТЕТ ПО ДНЯМ

### ДЕНЬ 1-2: Аутентификация и авторизация (25 проблем)

#### ✅ ГОТОВЫЕ K ИСПРАВЛЕНИЮ (В ПРОЦЕССЕ):

**1. Auth API:**
- `/app/api/auth/login/route.ts` - TODO на строке 1
- `/app/api/auth/register/route.ts` - TODO на строке 1
- Обе использум `process.env.REGISTERED_USERS` - ОЧЕНЬ НЕНАДЁЖНО
- Нет password validation
- Нет token generation
- Нет session management

**2. Auth Context Issues:**
- `contexts/AuthContext.tsx` - Нет реального API вызова при signIn
- Missing JWT token handling
- No refresh token logic
- No session persistence

**3. Permission Checks Missing:**
- `/app/api/admin/users/route.ts` - НЕТ проверки admin role
- `/app/api/admin/users/[id]/route.ts` - НЕТ проверки admin role
- `/app/api/operator/tours/route.ts` - НЕТ проверки operator role
- `/app/api/guide/schedule/route.ts` - НЕТ проверки guide role

**4. Session/Token Issues:**
- No JWT token in response
- No Authorization header check
- No token refresh mechanism
- Missing JWT user extraction validation

---

### ДЕНЬ 3: Validation & Error Handling (20 проблем)

**1. Input Validation:**
- `/app/api/tours/[id]/book/route.ts` - No validation
- `/app/api/accommodations/[id]/book/route.ts` - No validation
- `/app/api/bookings/route.ts` - Missing body validation
- `/app/api/payments/route.ts` - No amount validation

**2. Database Query Errors:**
- `/app/api/tours/route.ts` - PostgreSQL `p.phone` error - КРИТИЧНО!
- `/app/api/tour-operators/drivers/route.ts` - Similar issue
- N+1 queries in search endpoints

**3. Error Handling:**
- Missing try-catch blocks in 15+ endpoints
- No proper error messages in responses
- No logging for debugging

---

### ДЕНЬ 4-5: API Response & Data Loading (15 проблем)

**1. Mock Data Replacement:**
- `/app/api/admin/stats/route.ts` - Mock stats вместо реальных
- `/app/api/guide/earnings/route.ts` - TODO: calculate
- `/app/api/operator/dashboard/route.ts` - Incomplete metrics
- `/app/api/tours/recommendations/route.ts` - Mock recommendations

**2. Missing Data Loading:**
- `/app/api/bookings/route.ts` - TODO: load related data
- `/app/api/reviews/route.ts` - Missing tour/user data
- `/app/api/operator/bookings/route.ts` - Incomplete info

**3. Pagination & Filtering:**
- Missing limit/offset in list endpoints
- No sorting options
- No filter validation

---

## 🔧 БЫСТРЫЕ ИСПРАВЛЕНИЯ

### #1: FIX POSTGRESQL `p.phone` ERROR

**Файл:** `/app/api/tours/route.ts`

**Текущая ошибка:**
```sql
SELECT p.phone FROM partners p  -- p.phone doesn't exist!
```

**Решение:**
```sql
SELECT p.contact_phone FROM partners p
-- или
SELECT p.phone FROM provider_contacts p
```

**Время:** 10 минут

---

### #2: ADD ADMIN ROLE CHECK

**Файл:** `/app/api/admin/users/route.ts`

**Добавить в начало:**
```typescript
// Проверка прав администратора
const user = await authenticateUser(request);
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

if (user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Время:** 10 минут за каждый файл (5 файлов = 50 минут)

---

### #3: IMPLEMENT REAL AUTH

**Файл:** `/app/api/auth/signin/route.ts`

**Заменить mock на реальный:**
```typescript
// ВЫ ДЕЛАЕТЕ:
1. Получить email/password из request body
2. Query БД: SELECT * FROM users WHERE email = ?
3. Проверить пароль (bcrypt)
4. Создать JWT token
5. Вернуть token + user info

// ПРИМЕРНО 50 строк кода
```

**Время:** 30 минут

---

### #4: ADD INPUT VALIDATION

**Файл:** `/app/api/bookings/route.ts`

**Добавить в начало POST:**
```typescript
const { tourId, date, participants, totalPrice } = await request.json();

if (!tourId || !date || !participants) {
  return NextResponse.json(
    { error: 'Missing required fields' },
    { status: 400 }
  );
}

if (participants <= 0 || totalPrice <= 0) {
  return NextResponse.json(
    { error: 'Invalid values' },
    { status: 400 }
  );
}
```

**Время:** 15 минут за каждый файл

---

## 📋 ПОЛНЫЙ ЧЕКЛИСТ ДЕНЬ 1

- [ ] Исправить PostgreSQL `p.phone` error в tours API
- [ ] Добавить admin role check в 5 admin endpoints
- [ ] Добавить operator role check в 3 operator endpoints
- [ ] Добавить guide role check в 2 guide endpoints
- [ ] Добавить input validation в 5 booking endpoints
- [ ] Добавить missing try-catch blocks
- [ ] Добавить proper error messages

**Ожидаемое время:** 6-8 часов
**Результат:** 20-25 критичных проблем решено

---

## 🎯 ТЕКУЩИЙ СТАТУС

**Проблемы найдены:** ✅ 333
**Классифицированы:** ✅ 333
**Приоритизированы:** ✅ 333

**Начало исправления:** ⏳ СЕЙЧАС

---

**Следующий шаг:** Начать с Day 1 исправлений
