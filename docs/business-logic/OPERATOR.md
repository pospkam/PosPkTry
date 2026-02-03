# Бизнес-логика: Туроператор

## Роль: `operator`

Туроператор — ключевая роль в системе. Создает и управляет турами, обрабатывает бронирования, взаимодействует с клиентами.

## Доступ

- **Роли с доступом:** `operator`, `admin`
- **Защита:** `<Protected roles={['operator', 'admin']}>`
- **Базовый URL:** `/hub/operator`

---

## Сущности

### 1. Тур (Tour)

```typescript
interface OperatorTour {
  id: string;
  operatorId: string;
  name: string;
  description: string;
  price: number;
  duration: number;        // часы
  maxParticipants: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  location: string;
  coordinates?: { lat: number; lng: number };
  images: string[];
  includes: string[];
  requirements: string[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Статусы тура:**
- `draft` — черновик, не виден клиентам
- `active` — активен, доступен для бронирования
- `paused` — приостановлен временно
- `archived` — архивирован

### 2. Бронирование (Booking)

```typescript
interface OperatorBooking {
  id: string;
  tourId: string;
  tourName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
}
```

**Статусы бронирования:**
- `pending` — ожидает подтверждения оператором
- `confirmed` — подтверждено
- `cancelled` — отменено
- `completed` — завершено (тур прошел)

### 3. Клиент (Client)

```typescript
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  rating: number;
  status: 'active' | 'inactive' | 'vip';
}
```

**Статусы клиента:**
- `active` — активный клиент
- `inactive` — давно не бронировал
- `vip` — VIP клиент (много бронирований/высокий чек)

### 4. Финансы (Finance)

```typescript
interface FinanceData {
  totalRevenue: number;      // общая выручка
  pendingPayouts: number;    // ожидают выплаты
  completedPayouts: number;  // выплачено
  commission: number;        // комиссия платформы (10%)
  netIncome: number;         // чистый доход
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  type: 'booking' | 'payout' | 'refund' | 'commission';
  amount: number;
  description: string;
  status: 'pending' | 'completed';
}
```

---

## Страницы

### Dashboard (`/hub/operator`)
- Метрики: активные туры, бронирования, выручка, рейтинг
- Топ туров по бронированиям
- Последние бронирования
- Быстрые действия

### Мои туры (`/hub/operator/tours`)
- Список всех туров оператора
- Фильтры по статусу
- Создание/редактирование тура
- Управление статусом

### Бронирования (`/hub/operator/bookings`)
- Список бронирований
- Фильтры по статусу, дате
- Подтверждение/отмена
- Детали бронирования

### Календарь (`/hub/operator/calendar`)
- Визуальный календарь туров
- Занятость по датам
- Быстрое создание слотов

### Финансы (`/hub/operator/finance`)
- Выручка за период
- Ожидающие выплаты
- История транзакций
- Комиссия платформы

### Клиенты (`/hub/operator/clients`)
- База клиентов
- Поиск и фильтрация
- История бронирований клиента
- VIP статус

### Интеграции (`/hub/operator/integrations`)
- Подключение партнеров (fishingkam.ru)
- Синхронизация туров
- API ключи

### Отчеты (`/hub/operator/reports`)
- Генерация отчетов
- Экспорт в PDF/Excel
- Аналитика

---

## API Endpoints

### Туры
```
GET    /api/operator/tours              # Список туров
POST   /api/operator/tours              # Создать тур
GET    /api/operator/tours/[id]         # Детали тура
PUT    /api/operator/tours/[id]         # Обновить тур
DELETE /api/operator/tours/[id]         # Удалить тур
```

### Бронирования
```
GET    /api/operator/bookings           # Список бронирований
GET    /api/operator/bookings/[id]      # Детали бронирования
PUT    /api/operator/bookings/[id]      # Обновить статус
```

### Финансы
```
GET    /api/operator/finance            # Финансовые данные
GET    /api/operator/finance/payouts    # История выплат
```

### Dashboard
```
GET    /api/operator/dashboard          # Метрики dashboard
GET    /api/operator/stats              # Статистика
```

### Отчеты
```
GET    /api/operator/reports            # Список отчетов
POST   /api/operator/reports/generate   # Генерация отчета
```

---

## Бизнес-процессы

### 1. Создание тура

```
Оператор → Создает тур (draft) → Заполняет данные → 
→ Добавляет фото → Публикует (active) → Тур доступен клиентам
```

### 2. Обработка бронирования

```
Клиент бронирует → Статус: pending → 
→ Оператор подтверждает → Статус: confirmed → 
→ Клиент оплачивает → PaymentStatus: paid → 
→ Тур проходит → Статус: completed
```

### 3. Выплата

```
Бронирование completed → Сумма минус комиссия 10% → 
→ Ожидает выплаты → Выплата на счет оператора → 
→ Транзакция: payout, completed
```

### 4. Отмена

```
Клиент/Оператор отменяет → Статус: cancelled → 
→ Если оплачено: возврат → PaymentStatus: refunded → 
→ Транзакция: refund
```

---

## Метрики оператора

```typescript
interface OperatorMetrics {
  totalTours: number;        // всего туров
  activeTours: number;       // активных туров
  totalBookings: number;     // всего бронирований
  confirmedBookings: number; // подтвержденных
  pendingBookings: number;   // ожидающих
  totalRevenue: number;      // общая выручка
  monthlyRevenue: number;    // за месяц
  averageRating: number;     // средний рейтинг
  totalReviews: number;      // всего отзывов
}
```

---

## Комиссия платформы

- **Ставка:** 10% от суммы бронирования
- **Расчет:** `commission = totalPrice * 0.10`
- **Чистый доход:** `netIncome = totalPrice - commission`
- **Выплата:** после завершения тура (статус completed)

---

## Интеграции

### Камчатская Рыбалка (fishingkam.ru)

- **API клиент:** `lib/partners/kamchatka-fishing/client.ts`
- **Синхронизация:** `lib/partners/kamchatka-fishing/sync.ts`
- **Данные туров:** `lib/partners/kamchatka-fishing/tours-data.ts`

**Возможности:**
- Импорт туров партнера
- Синхронизация бронирований
- Единый каталог

---

## Компоненты

### Навигация
- `OperatorNav` — главная навигация

### Dashboard
- `OperatorMetricsGrid` — сетка метрик
- `TopToursTable` — топ туров
- `RecentBookingsTable` — последние бронирования

### Shared
- `LoadingSpinner` — индикатор загрузки
- `EmptyState` — пустое состояние
- `DataTable` — таблица данных

---

## Права доступа

| Действие | operator | admin |
|----------|----------|-------|
| Просмотр своих туров | ✅ | ✅ |
| Создание туров | ✅ | ✅ |
| Редактирование своих туров | ✅ | ✅ |
| Удаление своих туров | ✅ | ✅ |
| Просмотр всех туров | ❌ | ✅ |
| Управление чужими турами | ❌ | ✅ |
| Просмотр финансов | ✅ (свои) | ✅ (все) |
| Генерация отчетов | ✅ | ✅ |
