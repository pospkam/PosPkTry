# ПОЛНАЯ РЕАЛИЗАЦИЯ РОЛИ ГИД (GUIDE)

## ✅ СТАТУС: ЗАВЕРШЕНО

**Дата:** 2025-11-10  
**Платформа:** Next.js 14 (App Router) - KamHub  
**Готовность:** Production-ready 🚀

---

## 📊 ОБЗОР РЕАЛИЗАЦИИ

### Создано компонентов: 11 файлов
- **2 миграции БД** (010, 011)
- **1 файл helper функций** (guide-helpers.ts)
- **8 API endpoints** (profile, schedule, reviews, stats, map)

### База данных:
- **5 новых таблиц**
- **15+ индексов**
- **6 триггеров**
- **3 PostgreSQL функции**

### API Endpoints: 10
- Profile: GET, PUT
- Schedule: GET, POST, GET/PUT/DELETE [id]
- Reviews: GET, POST/PUT/DELETE [id]/reply
- Analytics: GET stats, GET map

---

## 🗄️ СТРУКТУРА БАЗЫ ДАННЫХ

### 1. Расширение таблицы `partners` (миграция 010)

```sql
-- Профессиональные характеристики
experience_years INTEGER CHECK (1-50)
languages TEXT[] DEFAULT ARRAY['russian']
specializations TEXT[] -- volcanoes, wildlife, fishing, etc.
bio TEXT
location GEOGRAPHY(POINT) -- PostGIS для карты
total_earnings DECIMAL(12,2) DEFAULT 0.0
is_available BOOLEAN DEFAULT TRUE
```

**Индексы:**
- GIST для `location` (геопоиск)
- GIN для `specializations` и `languages`
- B-tree для `is_available`

### 2. Новые таблицы (миграция 011)

#### `guide_schedule` - Расписание гида
```sql
- Exclusion constraint предотвращает пересечения времени
- Привязка к tours и bookings
- Геолокация события (GEOGRAPHY POINT)
- Статусы: scheduled, in_progress, completed, cancelled
- Максимум и текущее количество участников
```

#### `guide_reviews` - Отзывы о гиде
```sql
- Оценки: общая + профессионализм + знания + коммуникация
- Ответы гида с timestamps
- Уникальность: один отзыв на booking
- Флаги: is_verified, is_public
```

#### `guide_certifications` - Сертификаты
```sql
- Название, орган выдачи, даты
- Документы с URL
- Проверка (is_verified)
```

#### `guide_availability` - Еженедельная доступность
```sql
- day_of_week (0-6)
- start_time, end_time
- Паттерн доступности по дням недели
```

#### `guide_earnings` - Финансовый учёт
```sql
- 10% комиссия от стоимости тура
- Статусы: pending, paid, cancelled
- Привязка к bookings и tours
```

---

## 🔧 HELPER ФУНКЦИИ (guide-helpers.ts)

### Управление профилем
```typescript
getGuidePartnerId(userId) → partnerId | null
getGuidePartnerByUserId(userId) → GuideProfile
ensureGuidePartnerExists(userId, name, email) → partnerId
```

### Проверка прав (Ownership)
```typescript
verifyScheduleOwnership(userId, scheduleId) → boolean
verifyReviewOwnership(userId, reviewId) → boolean
```

### Расписание и конфликты
```typescript
checkScheduleConflicts(guideId, startTime, endTime, excludeId?) → boolean
// Использует PostgreSQL функцию check_schedule_conflicts()
// Проверяет пересечения через tstzrange && оператор
```

### Финансы
```typescript
calculateGuideEarnings(bookingPrice, commissionRate=10%) → amount
recordGuideEarnings(guideId, bookingId, tourId, amount, date) → earningId
```

### Статистика и аналитика
```typescript
getGuideStats(userId) → {
  tours: { completed, scheduled, active },
  reviews: { total, avgRating },
  earnings: { totalPaid, pending, monthlyTrends },
  certifications: { verified },
  upcoming: number
}
```

### Поиск и доступность
```typescript
isGuideAvailable(guideId, startTime, endTime) → boolean
findAvailableGuides(criteria) → Guide[]
// Поиск с фильтрами: specialization, language, location + radius
```

### Геоданные
```typescript
getGuideExpertiseZones(guideId) → TourLocation[]
// Возвращает координаты туров для отображения на карте
```

---

## 🌐 API ENDPOINTS

### 1. Профиль гида

#### `GET /api/guide/profile`
**Описание:** Получить профиль гида со статистикой  
**Доступ:** Только для роли `guide`  
**Ответ:**
```typescript
{
  user: { id, email, name, createdAt },
  partner: {
    id, name, rating, reviewCount,
    experienceYears, languages, specializations,
    bio, location: { lat, lng },
    totalEarnings, isAvailable
  },
  stats: {
    tours: { completed, scheduled, active },
    reviews: { total, avgRating },
    earnings: { totalPaid, pending, monthlyTrends }
  }
}
```

#### `PUT /api/guide/profile`
**Описание:** Обновить профиль гида  
**Body:**
```typescript
{
  name?: string,
  partnerName?: string,
  description?: string,
  experienceYears?: number, // 1-50
  languages?: string[],
  specializations?: string[], // volcanoes, wildlife, etc.
  bio?: string,
  location?: { lat: number, lng: number },
  isAvailable?: boolean
}
```
**Валидация:**
- experienceYears: 1-50
- specializations: только из списка
- location: сохраняется как PostGIS POINT

---

### 2. Расписание

#### `GET /api/guide/schedule`
**Описание:** Получить расписание гида  
**Query параметры:**
- `dateFrom`, `dateTo` - фильтр по датам
- `status` - all | scheduled | in_progress | completed | cancelled

**Ответ:**
```typescript
{
  schedule: [{
    id, guideId, startTime, endTime, title, description,
    tourId, tourTitle, bookingId, bookingStatus,
    maxParticipants, currentParticipants,
    location: { lat, lng }, locationName,
    status, notes, conflicts: boolean
  }]
}
```

#### `POST /api/guide/schedule`
**Описание:** Создать событие в расписании  
**Особенности:**
- Автоматическая проверка конфликтов времени
- Exclusion constraint на уровне БД
- Возвращает 409 Conflict при пересечении

**Body:**
```typescript
{
  startTime: string, // ISO 8601
  endTime: string,
  title: string,
  description?: string,
  tourId?: UUID,
  bookingId?: UUID,
  maxParticipants?: number, // default 10
  location?: { lat, lng },
  locationName?: string
}
```

#### `PUT/DELETE /api/guide/schedule/[id]`
**Описание:** Обновить или удалить событие  
**DELETE логика:**
- Если есть привязанное бронирование → status = 'cancelled'
- Если нет бронирования → физическое удаление

---

### 3. Отзывы

#### `GET /api/guide/reviews`
**Описание:** Получить отзывы с расширенной статистикой  
**Query параметры:**
- `filter`: all | replied | unreplied | positive | negative
- `page`, `limit` - пагинация

**Ответ:**
```typescript
{
  reviews: [{
    id, touristName, rating,
    professionalismRating, knowledgeRating, communicationRating,
    comment, guideReply, guideReplyAt,
    tourTitle, createdAt
  }],
  stats: {
    totalReviews, avgRating,
    distribution: { fiveStar, fourStar, ... },
    repliedCount, unrepliedCount,
    avgProfessionalism, avgKnowledge, avgCommunication
  },
  pagination: { page, limit, totalCount, totalPages }
}
```

#### `POST /api/guide/reviews/[id]/reply`
**Описание:** Ответить на отзыв  
**Body:** `{ reply: string }` (max 1000 символов)  
**Действия:**
- Сохранение ответа + timestamp
- Автоматическое уведомление туристу
- Обновление `updated_at`

#### `PUT /api/guide/reviews/[id]/reply`
**Описание:** Обновить ответ на отзыв

#### `DELETE /api/guide/reviews/[id]/reply`
**Описание:** Удалить ответ (NULL в БД)

---

### 4. Статистика и аналитика

#### `GET /api/guide/stats`
**Описание:** Comprehensive аналитика для дашборда  
**Данные:**

1. **Базовая статистика**
   - Туры: завершённые, запланированные, активные
   - Отзывы: количество, средний рейтинг
   - Финансы: оплачено, ожидает оплаты, тренды по месяцам

2. **Загрузка расписания (30 дней)**
```typescript
scheduleLoad: [{
  date, eventsCount, totalCapacity,
  totalParticipants, loadPercentage
}]
```

3. **Популярные времена**
   - Анализ последних 90 дней
   - Top 10 часов и дней недели

4. **Финансовые тренды (12 недель)**
```typescript
earningsBreakdown: [{
  week, bookingsCount,
  totalAmount, avgAmount,
  paidAmount, pendingAmount
}]
```

5. **Retention клиентов**
   - Всего клиентов
   - Повторные клиенты
   - Repeat rate (%)

6. **Сертификаты**
   - Последние 5 сертификатов
   - Флаг isExpiringSoon (< 30 дней)

---

### 5. Карта и геолокация

#### `GET /api/guide/map`
**Описание:** Геоданные для интерактивной карты  
**Ответ:**

```typescript
{
  baseLocation: { // Основная локация гида
    lat, lng, name, specializations
  },
  expertiseZones: [{ // Туры гида
    tourId, title, location, duration, difficultyLevel
  }],
  upcomingLocations: [{ // След. 7 дней
    id, title, startTime, location, locationName
  }],
  popularLocations: [{ // Топ по бронированиям
    locationName, location, tourTitle, bookingsCount
  }],
  activityTrail: [{ // История (30 дней)
    title, startTime, location, locationName
  }]
}
```

**Использование:**
- Отображение зон экспертизы
- Планирование маршрутов
- Визуализация активности
- Поиск гидов по геолокации

---

## 🔐 БЕЗОПАСНОСТЬ

### 1. Аутентификация и авторизация
```typescript
// Все endpoints проверяют:
const userId = request.headers.get('X-User-Id');
const userRole = request.headers.get('X-User-Role');

if (!userId || userRole !== 'guide') {
  return 403 Forbidden;
}
```

### 2. Ownership проверки
```typescript
// Перед каждой операцией:
const isOwner = await verifyScheduleOwnership(userId, scheduleId);
if (!isOwner) return 404 Not Found;
```

### 3. SQL Injection защита
- Все запросы параметризованы
- Использование `$1`, `$2` placeholders
- Никогда не используется конкатенация строк

### 4. Валидация данных
```typescript
// Пример валидации
if (experienceYears < 1 || experienceYears > 50) {
  return 400 Bad Request;
}

// CHECK constraints на уровне БД
CHECK (experience_years BETWEEN 1 AND 50)
CHECK (rating BETWEEN 1 AND 5)
```

---

## 🎯 БИЗНЕС-ЛОГИКА

### 1. Система расчёта заработка (10%)
```sql
-- Автоматический расчёт при бронировании
commission_rate = 10.0% (настраивается)
guide_earnings = booking_price * 0.10

-- Триггер обновляет total_earnings в partners
CREATE TRIGGER trigger_update_guide_earnings
```

### 2. Автообновление рейтинга
```sql
-- При добавлении отзыва:
UPDATE partners
SET 
  rating = AVG(guide_reviews.rating),
  review_count = COUNT(guide_reviews)
WHERE is_public = TRUE
```

### 3. Предотвращение конфликтов расписания
```sql
-- Exclusion constraint
CONSTRAINT no_overlap EXCLUDE USING GIST (
  guide_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (status != 'cancelled')
```

**Как работает:**
- `tstzrange` создаёт временной диапазон
- `&&` оператор проверяет пересечение
- GIST индекс для быстрой проверки
- Исключает cancelled события

### 4. Геопоиск гидов
```sql
-- Поиск в радиусе 50 км
ST_DWithin(
  guide.location,
  ST_MakePoint(lng, lat)::geography,
  50000 -- meters
)
```

---

## 📱 ГОТОВНОСТЬ К МОБИЛЬНОЙ РАЗРАБОТКЕ

### API готовы для мобильного приложения:

1. **Offline-first подход**
   - GET endpoints возвращают полные данные
   - Можно кэшировать локально (IndexedDB)
   - Минимальные запросы при синхронизации

2. **Геолокация**
   - `location` поля используют PostGIS
   - Готовы для real-time tracking
   - Можно добавить WebSocket для live location

3. **Пуш-уведомления**
   - Триггеры уже создают записи в `notifications`
   - Готово для интеграции с FCM/APNS

4. **Оптимизация трафика**
   - Пагинация везде (default 20 записей)
   - Query параметры для фильтрации
   - Минимальные JOIN запросы

---

## 🚀 ИНСТРУКЦИЯ ПО ЗАПУСКУ

### 1. Применить миграции
```bash
# PostgreSQL с PostGIS
psql -U username -d kamhub_db

# Применить миграции по порядку
\i lib/database/migrations/010_add_guide_fields.sql
\i lib/database/migrations/011_create_guide_tables.sql
```

### 2. Проверить создание таблиц
```sql
-- Должны быть видны:
\dt guide*

-- Проверить индексы
\di guide*

-- Проверить функции
\df check_schedule_conflicts
\df update_guide_rating
\df notify_guide_new_review
```

### 3. Создать тестового гида
```sql
-- Создать пользователя
INSERT INTO users (email, name, password_hash, role)
VALUES ('guide@test.com', 'Test Guide', 'hash', 'guide');

-- Partner создастся автоматически при первом запросе к API
```

### 4. Тестирование API
```bash
# Получить токен
TOKEN=$(curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"guide@test.com","password":"password"}' | jq -r '.data.token')

# Получить профиль
curl http://localhost:3000/api/guide/profile \
  -H "Authorization: Bearer $TOKEN"

# Обновить профиль
curl -X PUT http://localhost:3000/api/guide/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "experienceYears": 5,
    "languages": ["russian", "english"],
    "specializations": ["volcanoes", "wildlife"],
    "bio": "Опытный гид по Камчатке",
    "location": {"lat": 53.0241, "lng": 158.6433}
  }'

# Создать событие в расписании
curl -X POST http://localhost:3000/api/guide/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-11-15T10:00:00Z",
    "endTime": "2025-11-15T14:00:00Z",
    "title": "Тур на вулкан Авачинский",
    "maxParticipants": 10,
    "location": {"lat": 53.2560, "lng": 158.8344},
    "locationName": "Вулкан Авачинский"
  }'
```

---

## 📊 СТАТИСТИКА РЕАЛИЗАЦИИ

### Файлы: 11
- Миграции: 2
- Helper функции: 1 (500+ строк)
- API routes: 8 (1500+ строк)

### База данных:
- Таблицы: 5 новых
- Индексы: 15+
- Триггеры: 6
- Функции: 3

### API Endpoints: 10
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | /api/guide/profile | Профиль со статистикой |
| PUT | /api/guide/profile | Обновление профиля |
| GET | /api/guide/schedule | Расписание |
| POST | /api/guide/schedule | Создать событие |
| GET | /api/guide/schedule/[id] | Детали события |
| PUT | /api/guide/schedule/[id] | Обновить событие |
| DELETE | /api/guide/schedule/[id] | Удалить событие |
| GET | /api/guide/reviews | Отзывы с статистикой |
| POST/PUT/DELETE | /api/guide/reviews/[id]/reply | Управление ответами |
| GET | /api/guide/stats | Аналитика |
| GET | /api/guide/map | Геоданные |

---

## ✅ ЧТО ГОТОВО

### Инфраструктура
- ✅ Полная схема БД с индексами
- ✅ Миграции для безопасного обновления
- ✅ Helper функции для бизнес-логики
- ✅ API endpoints с валидацией

### Функциональность
- ✅ Управление профилем гида
- ✅ Расписание с детектированием конфликтов
- ✅ Система отзывов и ответов
- ✅ Финансовый учёт (10% комиссия)
- ✅ Comprehensive аналитика
- ✅ Геолокация и карта

### Безопасность
- ✅ JWT аутентификация
- ✅ Role-based access control
- ✅ Ownership проверки
- ✅ SQL injection защита
- ✅ Валидация данных

### Производительность
- ✅ Индексы для всех запросов
- ✅ Пагинация
- ✅ Оптимизированные JOIN
- ✅ PostGIS для геопоиска

---

## 🎨 СОВМЕСТИМОСТЬ С UI

Все endpoints возвращают данные в формате, готовом для:
- **Адаптивный дизайн** (Samsung Weather стиль)
- **Мобильная адаптация** (компактные ответы)
- **Существующие UI компоненты** (AuthContext, Protected)

---

## 🔄 СЛЕДУЮЩИЕ ШАГИ (ОПЦИОНАЛЬНО)

### 1. UI Компоненты
- GuideProfilePage - детальная страница профиля
- ScheduleManager - календарь с drag-and-drop
- ReviewManager - управление отзывами
- StatsDashboard - графики аналитики
- MapView - интерактивная карта

### 2. Мобильное приложение
- Offline режим (IndexedDB)
- Push уведомления (FCM)
- Real-time location tracking
- Camera для фото туров

### 3. Расширенная аналитика
- Экспорт отчётов (Excel, PDF)
- Прогнозирование загрузки
- A/B тестирование цен
- ML рекомендации

---

## 📞 ТЕХПОДДЕРЖКА

### Структура файлов
```
/workspace/
├── lib/
│   ├── auth/
│   │   └── guide-helpers.ts
│   └── database/
│       ├── schema.sql (обновлён)
│       └── migrations/
│           ├── 010_add_guide_fields.sql
│           └── 011_create_guide_tables.sql
└── app/
    └── api/
        └── guide/
            ├── profile/route.ts
            ├── schedule/
            │   ├── route.ts
            │   └── [id]/route.ts
            ├── reviews/
            │   ├── route.ts
            │   └── [id]/reply/route.ts
            ├── stats/route.ts
            └── map/route.ts
```

### Логика работы
1. Гид регистрируется с role='guide'
2. При первом запросе создаётся partner с category='guide'
3. Гид настраивает профиль (опыт, языки, специализации)
4. Создаёт события в расписании (автопроверка конфликтов)
5. Получает бронирования на туры
6. Зарабатывает 10% комиссию
7. Получает отзывы и отвечает на них
8. Следит за аналитикой в dashboard

---

## 🎉 ЗАКЛЮЧЕНИЕ

**Роль Гид полностью реализована и готова к production!**

✅ Все компоненты созданы  
✅ Безопасность на всех уровнях  
✅ Производительность оптимизирована  
✅ Готово для мобильной разработки  
✅ Comprehensive API документация  

**Production-ready! 🚀**

---

**Дата:** 2025-11-10  
**Версия:** 1.0.0  
**Статус:** ✅ ЗАВЕРШЕНО
