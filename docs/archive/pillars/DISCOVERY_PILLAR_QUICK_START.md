# 🎯 Discovery Pillar - Быстрый Старт для Разработчиков

## 📥 Импорты

### Основные сервисы
```typescript
import { tourService, reviewService, searchService } from '@discovery-pillar'
```

### Типы
```typescript
import type {
  Tour,
  TourCreate,
  TourUpdate,
  TourFilters,
  TourSearchParams,
  Review,
  ReviewCreate,
  ReviewUpdate,
} from '@discovery-pillar'
```

### Ошибки
```typescript
import {
  TourNotFoundError,
  TourValidationError,
  ReviewNotFoundError,
  DuplicateReviewError,
} from '@discovery-pillar'
```

---

## 🛠️ Примеры использования

### Создание тура

```typescript
const tour = await tourService.create({
  title: 'Восхождение на Вулкан Мутновский',
  description: 'Эпическое путешествие на самый активный вулкан Камчатки...',
  shortDescription: 'Вулканический тур',
  activity: 'mountaineering',
  difficulty: 'hard',
  tags: ['volcano', 'adventure', 'photography'],
  duration: 8, // часов
  meetingPoint: 'Петропавловск-Камчатский, центр города',
  meetingTime: '08:00',
  minParticipants: 2,
  maxParticipants: 10,
  priceFrom: 15000, // рубли
  currency: 'RUB',
  equipmentIncluded: ['climbing gear', 'helmets'],
  operatorId: 'operator-123',
})
```

### Получение тура

```typescript
const tour = await tourService.read('tour-id-123')
console.log(tour.title) // "Восхождение на Вулкан Мутновский"
console.log(tour.rating) // 4.8
console.log(tour.reviewsCount) // 45
```

### Поиск туров

```typescript
const results = await tourService.search({
  query: 'вулкан',
  filters: {
    difficulty: 'hard',
    minPrice: 10000,
    maxPrice: 50000,
    rating: 4.0,
  },
  sortBy: 'rating',
  sortOrder: 'desc',
  limit: 20,
  offset: 0,
})

console.log(results.tours) // массив туров
console.log(results.total) // общее количество
console.log(results.hasMore) // есть ли ещё страницы
```

### Публикация тура

```typescript
// Опубликовать тур
const publishedTour = await tourService.publish('tour-id-123')

// Снять с публикации
const draftTour = await tourService.unpublish('tour-id-123')
```

### Рекомендованные туры

```typescript
// Лучшие туры по рейтингу
const recommended = await searchService.getRecommended(10)

// Лучшие туры оператора
const operatorBest = await searchService.getRecommended(10, 'operator-id')
```

### Трендовые туры

```typescript
// Самые популярные за последние 7 дней
const trending = await searchService.getTrending(10)
```

### Похожие туры

```typescript
const similar = await searchService.getSimilar('tour-id-123', 5)
```

---

## 💬 Работа с отзывами

### Создание отзыва

```typescript
const review = await reviewService.create({
  tourId: 'tour-id-123',
  userId: 'user-id-456',
  userName: 'Иван Петров',
  userEmail: 'ivan@example.com',
  rating: 5,
  title: 'Незабываемое приключение!',
  comment: 'Это было лучшее путешествие в моей жизни. Гид был профессионален, маршрут безопасен. Рекомендую всем!',
  highlights: ['beautiful views', 'professional guide', 'safe'],
  improvements: ['could be longer'],
  wouldRecommend: true,
  visitDate: new Date('2026-01-15'),
})
```

### Получение отзывов на тур

```typescript
const result = await reviewService.search({
  filters: {
    tourId: 'tour-id-123',
    status: 'approved', // только одобренные
  },
  sortBy: 'newest',
  limit: 10,
  offset: 0,
})

console.log(result.reviews) // массив отзывов
```

### Статистика отзывов

```typescript
const stats = await reviewService.getStats('tour-id-123')

console.log(stats.averageRating) // 4.8
console.log(stats.totalReviews) // 45
console.log(stats.ratingDistribution) // { 1: 2, 2: 1, 3: 5, 4: 15, 5: 22 }
console.log(stats.percentageRecommended) // 95
```

### Модерация отзывов

```typescript
// Одобрить отзыв
const approved = await reviewService.approve('review-id', 'moderator-id')

// Отклонить отзыв
const rejected = await reviewService.reject(
  'review-id',
  'moderator-id',
  'Содержит оскорбительные выражения'
)

// Ответить на отзыв (оператор)
const responded = await reviewService.respondToReview(
  'review-id',
  'operator-id',
  'Спасибо за положительный отзыв! Мы очень рады, что вам понравилось.'
)
```

### Рейтинг оператора

```typescript
const rating = await reviewService.getOperatorRating('operator-id')

console.log(rating.averageRating) // 4.7
console.log(rating.totalReviews) // 120
console.log(rating.percentageRecommended) // 92
console.log(rating.responseRate) // 85
console.log(rating.recentReviews) // последние 10 отзывов
```

---

## 🔍 Продвинутый поиск

### Базовый поиск

```typescript
const results = await searchService.search({
  query: 'горы',
  filters: {
    activity: 'hiking',
    difficulty: 'moderate',
    minPrice: 5000,
    maxPrice: 20000,
  },
  limit: 20,
})
```

### Поиск с фасетами

```typescript
const results = await searchService.advancedSearch({
  query: 'горы',
  filters: {
    activity: 'hiking',
  },
})

console.log(results.facets.activities) // { name, count }[]
console.log(results.facets.difficulties) // { name, count }[]
console.log(results.facets.priceRanges) // { range, min, max, count }[]
console.log(results.facets.ratings) // { stars, count }[]
console.log(results.facets.operators) // { operatorId, name, count }[]
```

### Автодополнение

```typescript
const suggestions = await searchService.autocomplete('вул', 10)
// ["Восхождение на Вулкан Мутновский", "Вулканический трек", ...]
```

### Популярные теги

```typescript
const tags = await searchService.getPopularTags(20)
// [{ tag: 'adventure', count: 150 }, { tag: 'photography', count: 120 }, ...]
```

---

## 📊 Статистика туров

```typescript
const stats = await tourService.getStats('tour-id-123')

console.log(stats.totalBookings) // 45
console.log(stats.totalRevenue) // 675000 (45 * 15000)
console.log(stats.averageRating) // 4.8
console.log(stats.totalReviews) // 45
console.log(stats.viewCount) // 1250
console.log(stats.conversionRate) // 0.036 (3.6%)
```

---

## 🔐 API Endpoints

### Без аутентификации
```
GET /api/discovery/tours
GET /api/discovery/tours/[id]
GET /api/discovery/search
GET /api/discovery/search/autocomplete
GET /api/discovery/search/recommended
GET /api/discovery/search/trending
GET /api/discovery/search/tags
```

### С аутентификацией (x-user-id)
```
POST /api/discovery/reviews                    - создать отзыв
PUT /api/discovery/reviews/[id]                - обновить отзыв
DELETE /api/discovery/reviews/[id]             - удалить отзыв
```

### С авторизацией оператора (x-operator-id, role: operator)
```
POST /api/discovery/tours                      - создать тур
PUT /api/discovery/tours/[id]                  - обновить тур
DELETE /api/discovery/tours/[id]               - удалить тур
POST /api/discovery/tours/[id]/publish         - опубликовать
POST /api/discovery/reviews/[id]/respond       - ответить на отзыв
```

### С авторизацией админа (role: admin)
```
POST /api/discovery/tours/[id]/publish         - любой тур
DELETE /api/discovery/tours/[id]               - любой тур
POST /api/discovery/reviews/[id]/approve       - одобрить отзыв
POST /api/discovery/reviews/[id]/reject        - отклонить отзыв
GET /api/discovery/reviews                     - все отзывы
```

---

## ⚠️ Обработка ошибок

```typescript
import { TourValidationError, TourNotFoundError } from '@discovery-pillar'

try {
  const tour = await tourService.create(invalidData)
} catch (error) {
  if (error instanceof TourValidationError) {
    console.error('Ошибка валидации:', error.message)
  } else if (error instanceof TourNotFoundError) {
    console.error('Тур не найден:', error.message)
  }
}
```

---

## 🎛️ Headers для запросов

```typescript
// Для создания/обновления туров
headers: {
  'x-operator-id': 'operator-123',
  'x-user-role': 'operator',
}

// Для создания отзывов
headers: {
  'x-user-id': 'user-456',
  'x-user-role': 'user',
}

// Для модерации отзывов
headers: {
  'x-user-id': 'moderator-789',
  'x-user-role': 'moderator', // или 'admin'
}
```

---

## 📝 Лучшие практики

1. **Всегда проверяйте ошибки**
   ```typescript
   try {
     const tour = await tourService.read(id)
   } catch (error) {
     if (error instanceof TourNotFoundError) {
       // обработка 404
     }
   }
   ```

2. **Используйте типы**
   ```typescript
   const createData: TourCreate = {
     // TypeScript будет проверять все необходимые поля
   }
   ```

3. **Пагинируйте результаты**
   ```typescript
   const results = await tourService.search({
     limit: 20, // не более 100
     offset: (page - 1) * 20,
   })
   ```

4. **Кешируйте где возможно**
   ```typescript
   // TourService кеширует результаты автоматически
   // SearchService кеширует поиск на 30 минут
   ```

5. **Слушайте события**
   ```typescript
   eventBusService.subscribe('tour.published', (event) => {
     console.log(`Tour published: ${event.tourId}`)
   })
   ```

---

**Документация:** Discovery Pillar Stage 3  
**Версия:** 1.0.0  
**Последнее обновление:** 28 января 2026
