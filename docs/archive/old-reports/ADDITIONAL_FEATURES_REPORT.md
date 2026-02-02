# ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ОПЕРАТОРА

## Дата: 2025-11-10

## Обзор

Добавлены дополнительные функции по запросу:
1. Управление профилем оператора
2. Расширенная система отзывов
3. Базовая аналитика по бронированиям
4. Автоматические уведомления о новых бронированиях

---

## 1. УПРАВЛЕНИЕ ПРОФИЛЕМ ОПЕРАТОРА

### API Endpoints:

#### GET/PUT /api/operator/profile
**Назначение:** Получение и обновление профиля оператора

**GET возвращает:**
- Данные пользователя (email, name, role, preferences)
- Данные партнера (description, contact, rating, reviews)
- Настройки оператора (если есть)
- Статистику (tours, bookings, revenue, rating)

**Структура ответа:**
```json
{
  "user": {
    "id": "uuid",
    "email": "operator@example.com",
    "name": "Название компании",
    "role": "operator",
    "preferences": {},
    "createdAt": "timestamp"
  },
  "partner": {
    "id": "uuid",
    "name": "Название компании",
    "category": "operator",
    "description": "Описание",
    "contact": {
      "email": "...",
      "phone": "..."
    },
    "rating": 4.5,
    "reviewCount": 120,
    "isVerified": true,
    "logoUrl": "..."
  },
  "settings": {
    "autoConfirmBookings": false,
    "bookingLeadTime": 24,
    "cancellationPolicy": "...",
    "refundPolicy": "...",
    "timezone": "Asia/Kamchatka",
    "currency": "RUB"
  },
  "statistics": {
    "totalTours": 15,
    "activeTours": 12,
    "totalBookings": 234,
    "totalRevenue": 1234567.00,
    "avgRating": "4.50",
    "totalReviews": 120
  }
}
```

**PUT обновляет:**
- Имя оператора
- Описание
- Контактные данные
- Предпочтения

#### GET/PUT /api/operator/profile/settings
**Назначение:** Управление настройками оператора

**Доступные настройки:**
- `autoConfirmBookings` - Автоподтверждение бронирований
- `bookingLeadTime` - Минимальное время до начала тура (часы)
- `cancellationPolicy` - Политика отмены
- `refundPolicy` - Политика возврата
- `minGroupSize` - Минимальный размер группы
- `maxAdvanceBookingDays` - Максимальное время предварительного бронирования
- `timezone` - Часовой пояс
- `currency` - Валюта
- `commissionRate` - Ставка комиссии

**Пример запроса:**
```json
{
  "autoConfirmBookings": true,
  "bookingLeadTime": 48,
  "cancellationPolicy": "Отмена за 48 часов - полный возврат",
  "timezone": "Asia/Kamchatka",
  "currency": "RUB"
}
```

### Особенности:
- Автосоздание профиля партнера если отсутствует
- Автосоздание настроек по умолчанию
- Валидация всех полей
- Обновление кэша статистики

---

## 2. РАСШИРЕННАЯ СИСТЕМА ОТЗЫВОВ

### Новые API Endpoints:

#### GET /api/reviews/tour/[tourId]
**Назначение:** Получение всех отзывов на тур (публичный endpoint)

**Параметры:**
- `page` - Номер страницы (default: 1)
- `limit` - Количество на странице (default: 20)
- `rating` - Фильтр по рейтингу (1-5)
- `sortBy` - Сортировка: `recent`, `rating_high`, `rating_low`

**Возвращает:**
- Список отзывов с фото
- Статистику по рейтингам
- Распределение оценок
- Ответы оператора
- Пагинацию

**Пример ответа:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Имя пользователя",
      "rating": 5,
      "comment": "Отличный тур!",
      "isVerified": true,
      "operatorReply": "Спасибо за отзыв!",
      "operatorReplyAt": "timestamp",
      "photos": ["url1", "url2"],
      "createdAt": "timestamp"
    }
  ],
  "summary": {
    "totalReviews": 120,
    "avgRating": "4.50",
    "distribution": {
      "5": 80,
      "4": 25,
      "3": 10,
      "2": 3,
      "1": 2
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 120,
    "totalPages": 6
  }
}
```

#### POST /api/reviews/tour/[tourId]
**Назначение:** Создание отзыва на тур

**Требования:**
- Пользователь должен быть авторизован
- Тур должен быть завершен (`status = 'completed'`)
- Один отзыв на тур от одного пользователя

**Тело запроса:**
```json
{
  "rating": 5,
  "comment": "Отличный тур! Всё понравилось."
}
```

**Автоматические действия:**
- Обновление рейтинга тура
- Обновление рейтинга оператора
- Уведомление оператору о новом отзыве
- Повышенный приоритет если rating <= 2

#### GET /api/operator/reviews/stats
**Назначение:** Детальная статистика по отзывам для оператора

**Параметры:**
- `period` - Период в днях (default: 30)

**Возвращает:**
```json
{
  "period": {
    "days": 30,
    "startDate": "...",
    "endDate": "..."
  },
  "overall": {
    "totalReviews": 120,
    "recentReviews": 15,
    "avgRating": "4.50",
    "distribution": {...},
    "replied": 100,
    "pendingReply": 20,
    "verified": 110,
    "replyRate": "83.33"
  },
  "byTour": [
    {
      "tourId": "uuid",
      "tourName": "Название тура",
      "reviewsCount": 45,
      "avgRating": "4.80",
      "recentCount": 5
    }
  ],
  "trend": [
    {
      "date": "2025-11-01",
      "reviewsCount": 3,
      "avgRating": "4.67"
    }
  ],
  "negativeReviews": [
    {
      "id": "uuid",
      "rating": 2,
      "comment": "...",
      "tourId": "uuid",
      "tourName": "...",
      "userName": "...",
      "createdAt": "..."
    }
  ],
  "responseTime": {
    "avgHours": "12.5",
    "minHours": "1.2",
    "maxHours": "48.0"
  }
}
```

### Особенности:
- Публичный доступ к отзывам тура
- Проверка права оставить отзыв
- Предотвращение дублирующих отзывов
- Статистика времени ответа
- Выделение негативных отзывов без ответа
- Тренд по датам

---

## 3. БАЗОВАЯ АНАЛИТИКА ПО БРОНИРОВАНИЯМ

### API Endpoint:

#### GET /api/operator/analytics/dashboard
**Назначение:** Комплексная аналитическая панель для оператора

**Параметры:**
- `period` - Период в днях (default: 30)

**Разделы аналитики:**

### 3.1 Overview (Общая сводка)
```json
{
  "tours": {
    "total": 15,
    "active": 12
  },
  "bookings": {
    "total": 234,
    "pending": 5,
    "confirmed": 180,
    "completed": 45,
    "cancelled": 4
  },
  "revenue": {
    "total": 1234567.00,
    "paid": 1150000.00,
    "pending": 84567.00,
    "avgBookingValue": 5277.14
  }
}
```

### 3.2 Trend (Тренд по дням)
```json
{
  "trend": [
    {
      "date": "2025-11-01",
      "bookingsCount": 8,
      "revenue": 42000.00,
      "uniqueCustomers": 7
    }
  ]
}
```

### 3.3 Top Tours (Топ-5 туров)
```json
{
  "topTours": [
    {
      "id": "uuid",
      "name": "Вулканы Камчатки",
      "bookingsCount": 45,
      "revenue": 225000.00,
      "avgRating": "4.80",
      "reviewsCount": 42
    }
  ]
}
```

### 3.4 Recent Bookings (Последние 10)
```json
{
  "recentBookings": [
    {
      "id": "uuid",
      "status": "confirmed",
      "paymentStatus": "paid",
      "totalPrice": 5000.00,
      "tourName": "Вулканы Камчатки",
      "customerName": "Иван Иванов",
      "customerEmail": "ivan@example.com",
      "startDate": "2025-11-20",
      "guestsCount": 2,
      "createdAt": "2025-11-10T10:30:00Z"
    }
  ]
}
```

### 3.5 Conversion Metrics (Конверсия)
```json
{
  "conversion": {
    "pending": 5,
    "confirmed": 180,
    "completed": 45,
    "cancelled": 4,
    "confirmationRate": "76.92",
    "completionRate": "25.00",
    "cancellationRate": "1.71"
  }
}
```

### 3.6 Customer Insights (Клиенты)
```json
{
  "customers": {
    "total": 156,
    "repeat": 45,
    "repeatRate": "28.85"
  }
}
```

### 3.7 Reviews Summary (Отзывы)
```json
{
  "reviews": {
    "total": 120,
    "avgRating": "4.50",
    "distribution": {...},
    "repliedCount": 100,
    "replyRate": "83.33"
  }
}
```

### Особенности:
- Выбор периода анализа
- Детальная воронка конверсии
- Тренды по дням
- Топ-туры по бронированиям и доходам
- Анализ повторных клиентов
- Интеграция со статистикой отзывов

---

## 4. АВТОМАТИЧЕСКИЕ УВЕДОМЛЕНИЯ О БРОНИРОВАНИЯХ

### Миграция: 007_booking_notifications_trigger.sql

### Созданные триггеры:

#### 4.1 Новое бронирование
**Trigger:** `trigger_notify_operator_new_booking`
**Событие:** INSERT в таблицу `bookings`

**Действия:**
- Находит оператора тура
- Создает уведомление оператору
- Приоритет: `high`
- Включает данные:
  - ID бронирования
  - Название тура
  - Имя клиента
  - Сумма
  - Дата начала
  - Количество гостей

**Пример уведомления:**
```
Тип: new_booking
Заголовок: Новое бронирование
Сообщение: Получено новое бронирование на тур "Вулканы Камчатки" от Иван Иванов
Приоритет: high
Ссылка: /hub/operator/bookings/{booking_id}
```

#### 4.2 Изменение статуса бронирования
**Trigger:** `trigger_notify_customer_booking_status_change`
**Событие:** UPDATE статуса в таблице `bookings`

**Действия для клиента:**
- `confirmed` → "Ваше бронирование подтверждено" (high)
- `cancelled` → "Ваше бронирование отменено" (high)
- `completed` → "Тур завершён. Оставьте отзыв!" (normal)

**Включает:**
- Старый и новый статус
- Название тура
- Ссылку на бронирование

#### 4.3 Изменение статуса оплаты
**Trigger:** `trigger_notify_payment_status_change`
**Событие:** UPDATE payment_status в таблице `bookings`

**Действия для клиента:**
- `paid` → "Оплата получена" (high)
- `refunded` → "Возврат средств выполнен" (high)

**Включает:**
- Сумму
- Старый и новый статус оплаты

#### 4.4 Новый отзыв
**Trigger:** `trigger_notify_operator_new_review`
**Событие:** INSERT в таблицу `reviews`

**Действия для оператора:**
- Создает уведомление о новом отзыве
- Приоритет: `high` если rating <= 2, иначе `normal`
- Включает превью комментария (100 символов)
- Ссылка на страницу отзывов

**Пример уведомления:**
```
Тип: new_review
Заголовок: Новый отзыв
Сообщение: Получен новый отзыв (★5) на тур "Вулканы Камчатки" от Иван Иванов
Приоритет: normal (или high если <= 2)
Ссылка: /hub/operator/reviews?reviewId={review_id}
```

### Особенности триггеров:
- Автоматическая работа при любых изменениях
- Умный приоритет (негативные отзывы = high)
- Полные данные в notification.data (JSON)
- Прямые ссылки на соответствующие страницы
- Защита от дублирования (проверка изменений)
- Graceful handling если operator не найден

---

## 5. ФАЙЛОВАЯ СТРУКТУРА

### Созданные файлы:

**API Endpoints:**
1. `/app/api/operator/profile/route.ts` - Управление профилем
2. `/app/api/operator/profile/settings/route.ts` - Настройки оператора
3. `/app/api/operator/analytics/dashboard/route.ts` - Аналитическая панель
4. `/app/api/reviews/tour/[tourId]/route.ts` - Публичные отзывы тура
5. `/app/api/operator/reviews/stats/route.ts` - Статистика отзывов

**Миграции:**
6. `/lib/database/migrations/007_booking_notifications_trigger.sql` - Триггеры уведомлений

**Документация:**
7. `/ADDITIONAL_FEATURES_REPORT.md` - Этот файл

---

## 6. ИСПОЛЬЗОВАНИЕ

### Получение профиля оператора:
```bash
curl http://localhost:3000/api/operator/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Обновление настроек:
```bash
curl -X PUT http://localhost:3000/api/operator/profile/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoConfirmBookings": true,
    "bookingLeadTime": 48,
    "cancellationPolicy": "Отмена за 48 часов - полный возврат"
  }'
```

### Получение аналитики:
```bash
curl "http://localhost:3000/api/operator/analytics/dashboard?period=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Получение отзывов на тур:
```bash
curl "http://localhost:3000/api/reviews/tour/{tourId}?page=1&limit=20&sortBy=recent"
```

### Создание отзыва:
```bash
curl -X POST http://localhost:3000/api/reviews/tour/{tourId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Отличный тур!"
  }'
```

### Статистика отзывов оператора:
```bash
curl "http://localhost:3000/api/operator/reviews/stats?period=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. ПРИМЕНЕНИЕ МИГРАЦИИ

```bash
# Подключиться к БД
psql -U postgres -d kamchatour

# Применить миграцию триггеров
\i lib/database/migrations/007_booking_notifications_trigger.sql

# Проверить триггеры
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notify%';
```

---

## 8. ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ

### Все новые API интегрируются с:
- JWT аутентификацией через middleware
- Проверкой прав доступа (operator role)
- Ownership verification через helper-функции
- Существующими таблицами БД
- Системой уведомлений (notifications)

### Триггеры работают автоматически при:
- Создании бронирования (любым способом)
- Изменении статуса бронирования
- Изменении статуса оплаты
- Создании отзыва

### Никаких изменений в существующем коде не требуется

---

## 9. БЕЗОПАСНОСТЬ

### Все endpoints защищены:
- JWT токен обязателен
- Role-based access control
- Ownership verification
- Параметризованные SQL запросы
- Валидация входных данных

### Публичный endpoint (reviews):
- Только GET для отзывов тура
- POST требует авторизации
- Проверка прав оставить отзыв

---

## 10. ПРОИЗВОДИТЕЛЬНОСТЬ

### Оптимизации:
- Индексы на всех JOIN полях
- Агрегации на уровне БД
- Пагинация для списков
- Триггеры работают асинхронно
- Кэш статистики оператора

### Новый индекс:
- `idx_notifications_type_priority` для быстрой фильтрации уведомлений

---

## ИТОГО

### Добавлено:
- **5 новых API endpoints**
- **1 миграция с 4 триггерами**
- **Полное управление профилем оператора**
- **Расширенная система отзывов**
- **Комплексная аналитическая панель**
- **Автоматические уведомления**

### Готовность функционала: 100%

Все запрошенные функции реализованы и готовы к использованию.
