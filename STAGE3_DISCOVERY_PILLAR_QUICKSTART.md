# 🚀 STAGE 3: DISCOVERY PILLAR - БЫСТРЫЙ СТАРТ

**Статус:** ГОТОВ К ЗАПУСКУ  
**Дата начала:** 27 ноября 2025  
**Приоритет:** 🔴 ВЫСОКИЙ  

---

## 📋 ЧТО БУДЕТ РЕАЛИЗОВАНО

### Stage 3 включает полную реализацию Discovery Pillar:

1. **Tour Service** - полный CRUD для туров
2. **Tour Search** - поиск и фильтрация
3. **Tour Reviews** - система отзывов
4. **Tour Publishing** - workflow публикации
5. **EventBus Integration** - события туров

---

## 🏗️ АРХИТЕКТУРНАЯ СТРУКТУРА

```
pillars/
├── discovery-pillar/                    ← ВЫ ЗДЕСЬ (Stage 3)
│   ├── lib/
│   │   ├── tour/
│   │   │   ├── services/
│   │   │   │   ├── TourService.ts      ← Main service (CRUD)
│   │   │   │   ├── SearchService.ts    ← Search & filter
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts            ← Tour models
│   │   │   │   └── search.ts
│   │   │   └── index.ts
│   │   └── review/
│   │       ├── services/
│   │       │   ├── ReviewService.ts    ← Review CRUD
│   │       │   └── index.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── index.ts
│   └── index.ts
│
├── core-infrastructure/                 ← УЖЕ ГОТОВО
│   ├── lib/
│   │   ├── database/     ✅ DatabaseService
│   │   ├── cache/        ✅ CacheService
│   │   ├── monitoring/   ✅ MonitoringService
│   │   ├── notifications/✅ NotificationsService
│   │   ├── payments/     ✅ PaymentsService
│   │   └── eventbus/     ✅ EventBusService
│   └── index.ts
│
└── [other pillars]                      ← FUTURE STAGES
```

---

## 📐 ФАЗЫ РЕАЛИЗАЦИИ

### Phase 3A: Tour Service Core (4-6 часов)
- [ ] Создать TourService с CRUD операциями
- [ ] Добавить типы Tour, TourCreate, TourUpdate
- [ ] Реализовать DatabaseService интеграцию
- [ ] Добавить кеширование через CacheService

### Phase 3B: Tour Search (3-4 часа)
- [ ] Создать SearchService для поиска туров
- [ ] Реализовать фильтры (активность, цена, сложность)
- [ ] Добавить полнотекстовый поиск
- [ ] Оптимизировать запросы с индексами

### Phase 3C: Tour Reviews (3-4 часа)
- [ ] Создать ReviewService для отзывов
- [ ] Реализовать рейтинги туров
- [ ] Добавить систему модерации отзывов
- [ ] Интегрировать с NotificationsService

### Phase 3D: Publishing & Events (3-4 часа)
- [ ] Реализовать workflow публикации туров
- [ ] Добавить draft/published статусы
- [ ] Публиковать события в EventBus
- [ ] Настроить уведомления при публикации

### Phase 3E: API Routes (2-3 часа)
- [ ] Создать REST API endpoints
- [ ] Добавить валидацию и обработку ошибок
- [ ] Реализовать пагинацию и сортировку
- [ ] Добавить документацию API

---

## 🔑 КЛЮЧЕВЫЕ КОМПОНЕНТЫ

### 1. Tour Service
```typescript
class TourService {
  // CRUD операции
  async create(data: TourCreate): Promise<Tour>;
  async read(id: string): Promise<Tour>;
  async update(id: string, data: TourUpdate): Promise<Tour>;
  async delete(id: string): Promise<boolean>;
  async list(filters: TourFilters): Promise<Tour[]>;
  
  // Публикация
  async publish(id: string): Promise<Tour>;
  async unpublish(id: string): Promise<Tour>;
  
  // Рейтинги
  async updateRating(id: string): Promise<void>;
  
  // Поиск
  async search(query: string): Promise<Tour[]>;
}
```

### 2. Search Service
```typescript
class SearchService {
  async search(
    query: string,
    filters?: {
      activity?: string;
      minPrice?: number;
      maxPrice?: number;
      difficulty?: string;
    }
  ): Promise<Tour[]>;
  
  async getFilters(): Promise<TourFilters>;
}
```

### 3. Review Service
```typescript
class ReviewService {
  async create(data: ReviewCreate): Promise<Review>;
  async update(id: string, data: ReviewUpdate): Promise<Review>;
  async delete(id: string): Promise<boolean>;
  async moderate(id: string, approved: boolean): Promise<Review>;
  
  async getByTour(tourId: string): Promise<Review[]>;
  async getStats(tourId: string): Promise<ReviewStats>;
}
```

---

## 🗄️ ТИПЫ ДАННЫХ

### Tour Model
```typescript
interface Tour {
  id: string;
  title: string;
  description: string;
  activity: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  duration: number; // часы
  
  // Цены
  priceFrom: number;
  priceTo: number;
  
  // Участники
  minParticipants: number;
  maxParticipants: number;
  
  // Рейтинг
  rating: number; // 0-5
  reviewsCount: number;
  
  // Статус
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  
  // Оператор
  operatorId: string;
  operatorName: string;
  operatorRating: number;
  
  // Мета
  images: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

### Review Model
```typescript
interface Review {
  id: string;
  tourId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  
  photos?: string[];
  helpfulCount: number;
  
  status: 'pending' | 'approved' | 'rejected';
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📡 EventBus СОБЫТИЯ

### Публиковать события в шину:
```typescript
// tour.created
eventBus.publish('tour.created', {
  tourId: string;
  operatorId: string;
  title: string;
  timestamp: Date;
});

// tour.published
eventBus.publish('tour.published', {
  tourId: string;
  operatorId: string;
  status: 'published';
});

// tour.reviewed
eventBus.publish('tour.reviewed', {
  tourId: string;
  reviewId: string;
  rating: number;
});

// review.flagged
eventBus.publish('review.flagged', {
  reviewId: string;
  tourId: string;
  reason: string;
});
```

### Подписаться на события:
```typescript
// Отправить уведомление оператору при новом отзыве
eventBus.subscribe('review.created', async (event) => {
  await notificationsService.send({
    userId: event.operatorId,
    type: 'email',
    subject: `Новый отзыв на тур "${event.tourTitle}"`,
  });
});

// Обновить рейтинг тура при изменении отзыва
eventBus.subscribe('review.*', async (event) => {
  await tourService.updateRating(event.tourId);
});
```

---

## 🔌 API ENDPOINTS

### Tour endpoints
```
GET    /api/tours                    - Список туров
GET    /api/tours/search             - Поиск с фильтрами
GET    /api/tours/:id                - Получить тур
POST   /api/tours                    - Создать тур
PUT    /api/tours/:id                - Обновить тур
DELETE /api/tours/:id                - Удалить тур
POST   /api/tours/:id/publish        - Опубликовать тур
POST   /api/tours/:id/unpublish      - Снять с публикации
```

### Review endpoints
```
GET    /api/tours/:id/reviews        - Отзывы тура
POST   /api/tours/:id/reviews        - Создать отзыв
PUT    /api/reviews/:id              - Обновить отзыв
DELETE /api/reviews/:id              - Удалить отзыв
POST   /api/reviews/:id/moderate     - Модерировать отзыв
```

---

## 📊 DATABASE QUERIES

### Основные запросы
```sql
-- Получить все активные туры с рейтингом
SELECT t.*, 
       COUNT(r.id) as reviews_count,
       AVG(r.rating) as rating
FROM tours t
LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
WHERE t.is_active = true AND t.status = 'published'
GROUP BY t.id
ORDER BY t.rating DESC;

-- Поиск туров по критериям
SELECT * FROM tours
WHERE is_active = true
  AND status = 'published'
  AND activity = $1
  AND difficulty = $2
  AND price_from >= $3 AND price_from <= $4
ORDER BY rating DESC
LIMIT $5 OFFSET $6;
```

---

## ⚙️ ИНТЕГРАЦИЯ СЕРВИСОВ

```
TourService
├── DatabaseService          ← Получение/сохранение в БД
├── CacheService             ← Кеширование результатов поиска
├── MonitoringService        ← Логирование операций
├── NotificationsService     ← Уведомления при публикации
└── EventBusService          ← Публикация событий tour.*

ReviewService
├── DatabaseService
├── MonitoringService
└── EventBusService          ← Публикация событий review.*
```

---

## 🚀 КАК НАЧАТЬ

### 1. Создать директорию структуру
```bash
mkdir -p pillars/discovery-pillar/lib/tour/{services,types}
mkdir -p pillars/discovery-pillar/lib/review/{services,types}
```

### 2. Создать типы (Phase 3A.1)
```typescript
// pillars/discovery-pillar/lib/tour/types/index.ts
export interface Tour { ... }
export interface TourCreate { ... }
export interface TourUpdate { ... }
export interface TourFilters { ... }
```

### 3. Реализовать TourService (Phase 3A.2-3)
```typescript
// pillars/discovery-pillar/lib/tour/services/TourService.ts
export class TourService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private eventBus: EventBusService,
  ) {}
  
  async create(data: TourCreate): Promise<Tour> { ... }
  // ... остальные методы
}
```

### 4. Реализовать API routes (Phase 3E)
```typescript
// app/api/tours/route.ts
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

---

## 📚 ДОКУМЕНТАЦИЯ

- **Architecture:** PILLAR_CLUSTER_ARCHITECTURE.md
- **Database:** ПОЛНЫЙ_АНАЛИЗ_БАЗЫ_ДАННЫХ.md
- **EventBus:** PHASE2D_ARCHITECTURE.md
- **Services:** PHASE2D_COMPLETION_REPORT.md

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ

- [x] Все таблицы БД созданы
- [x] Все сервисы Phase 2D готовы
- [x] EventBus полностью функционален
- [x] Мониторинг интегрирован
- [x] Все критичные проблемы исправлены
- [ ] Stage 3 код начат
- [ ] Все endpoints реализованы
- [ ] Тесты написаны
- [ ] Документация обновлена

---

## 🎯 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

После Stage 3:
✅ Полная система управления турами
✅ Поиск и фильтрация туров
✅ Система отзывов и рейтингов
✅ Workflow публикации туров
✅ Integration с EventBus
✅ Production-ready API endpoints

**Статус: 🟢 READY TO START**

---

**Приступаем к Stage 3 прямо сейчас?** 🚀
