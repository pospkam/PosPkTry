# 🏗️ ПОЛНОЕ ОПИСАНИЕ ВСЕХ РОЛЕЙ И СУЩНОСТЕЙ KAMHUB

**Дата:** 28 января 2026  
**Версия:** 2.0 (Полная и детальная)  
**Статус:** Comprehensive Documentation

---

## 📋 СОДЕРЖАНИЕ

1. [👥 Роли пользователей](#роли-пользователей)
2. [📦 Сущности (Entities)](#сущности-entities)
3. [🔗 Связи между сущностями](#связи-между-сущностями)
4. [📊 Диаграммы потоков данных](#диаграммы-потоков-данных)
5. [🔐 Permissions & Access Control](#permissions--access-control)
6. [💾 Database Schema](#database-schema)

---

# 👥 РОЛИ ПОЛЬЗОВАТЕЛЕЙ

## ИЕРАРХИЯ РОЛЕЙ

```
┌─────────────────────────────────────────┐
│         СИСТЕМА РОЛЕЙ KAMHUB            │
├─────────────────────────────────────────┤
│                                         │
│   SUPER_ADMIN (root access)             │
│       ↓                                  │
│   ADMIN (platform management)           │
│       ├── OPERATOR (tour providers)     │
│       ├── AGENT (sales partners)        │
│       ├── TRANSFER (transport ops)      │
│       └── GUIDE (tour guides)           │
│                                         │
│   TOURIST (end users)                   │
│   PARTNER (multiple types)              │
│                                         │
└─────────────────────────────────────────┘
```

---

## 1️⃣ TOURIST (🧳 Турист)

### Назначение
Конечный пользователь туристической платформы. Основной источник доходов.

### Permissions
```
READ:   Tours, Reviews, Weather, FAQ
WRITE:  Bookings, Reviews, ProfileData
DELETE: OwnBookings, OwnReviews
UPDATE: OwnProfile, Preferences, Password
```

### Возможности
- ✅ Просмотр всех туров
- ✅ Поиск и фильтрация туров
- ✅ Бронирование туров
- ✅ Оплата туров
- ✅ Отзывы и рейтинги
- ✅ Экологические баллы (eco-points)
- ✅ Система лояльности
- ✅ История бронирований
- ✅ Профиль и настройки
- ✅ AI-чат помощник
- ✅ Погода и рекомендации
- ✅ Ваучеры и скидки

### Related Entities
```
User → Booking → Tour
User → Review → Tour
User → LoyaltyProfile
User → EcoPoints
User → Preferences
User → PaymentMethod
```

### Dashboard
**URL:** `/hub/tourist` или `/dashboard/tourist`

**Разделы:**
- My Bookings (мои бронирования)
- My Reviews (мои отзывы)
- Loyalty Points (баллы лояльности)
- Eco Points (эко-баллы)
- Payment Methods (способы оплаты)
- Profile Settings (настройки профиля)

### API Endpoints
```
# Tours
GET    /api/tourist/tours
GET    /api/tourist/tours/[id]
GET    /api/tourist/tours/search
GET    /api/tourist/tours/recommendations

# Bookings
GET    /api/tourist/bookings
POST   /api/tourist/bookings
GET    /api/tourist/bookings/[id]
PATCH  /api/tourist/bookings/[id]
DELETE /api/tourist/bookings/[id]
POST   /api/tourist/bookings/[id]/cancel

# Reviews
GET    /api/tourist/reviews
POST   /api/tourist/reviews
PATCH  /api/tourist/reviews/[id]
DELETE /api/tourist/reviews/[id]

# Loyalty & Eco
GET    /api/tourist/loyalty/profile
GET    /api/tourist/loyalty/points
GET    /api/tourist/eco-points
POST   /api/tourist/eco-points/log-activity

# Payments
GET    /api/tourist/payments
POST   /api/tourist/payments
GET    /api/tourist/payment-methods

# Profile
GET    /api/tourist/profile
PATCH  /api/tourist/profile
GET    /api/tourist/preferences
PATCH  /api/tourist/preferences
```

### Database Tables
- `users` (role: 'tourist')
- `user_profiles`
- `bookings`
- `reviews`
- `user_loyalty`
- `user_eco_points`
- `user_preferences`
- `payment_methods`

---

## 2️⃣ OPERATOR (🎯 Туроператор)

### Назначение
Компания, организующая туры. Создает и управляет турами, следит за бронированиями.

### Permissions
```
READ:   OwnTours, OwnBookings, OwnReviews, Finance
WRITE:  Tours, Prices, Descriptions
DELETE: OwnTours (если нет бронирований)
UPDATE: OwnTours, Availability, Schedule
```

### Возможности
- ✅ Создание и управление турами
- ✅ Установка цен и скидок
- ✅ Управление расписанием
- ✅ Просмотр бронирований
- ✅ Управление гидами
- ✅ Финансовая статистика
- ✅ Отчеты и аналитика
- ✅ Экспорт данных
- ✅ Уведомления о новых бронированиях
- ✅ Управление отзывами

### Related Entities
```
Operator → Tours (1:M)
Operator → Bookings (1:M, через tours)
Operator → OperatorMetrics
Operator → FinanceData
Operator → Guides (1:M)
Operator → Assets (logos, images)
```

### Dashboard
**URL:** `/hub/operator` или `/dashboard/operator`

**Разделы:**
- Overview (обзор)
- Tours Management (управление турами)
- Bookings Calendar (календарь бронирований)
- Customers (клиенты)
- Finance (финансы)
- Reports & Analytics (отчеты)
- Settings (настройки)

### API Endpoints
```
# Dashboard
GET    /api/operator/dashboard
GET    /api/operator/dashboard/summary
GET    /api/operator/dashboard/metrics

# Tours
GET    /api/operator/tours
POST   /api/operator/tours
GET    /api/operator/tours/[id]
PATCH  /api/operator/tours/[id]
DELETE /api/operator/tours/[id]
POST   /api/operator/tours/[id]/publish
POST   /api/operator/tours/[id]/unpublish

# Tour Scheduling
GET    /api/operator/tours/[id]/schedule
POST   /api/operator/tours/[id]/schedule
PATCH  /api/operator/tours/[id]/schedule/[scheduleId]
DELETE /api/operator/tours/[id]/schedule/[scheduleId]

# Bookings
GET    /api/operator/bookings
GET    /api/operator/bookings/[id]
PATCH  /api/operator/bookings/[id]/status
POST   /api/operator/bookings/[id]/confirm
POST   /api/operator/bookings/[id]/cancel

# Calendar
GET    /api/operator/calendar
GET    /api/operator/calendar/[dateRange]

# Finance
GET    /api/operator/finance/summary
GET    /api/operator/finance/transactions
GET    /api/operator/finance/payouts
GET    /api/operator/finance/revenue

# Guides
GET    /api/operator/guides
POST   /api/operator/guides
GET    /api/operator/guides/[id]
PATCH  /api/operator/guides/[id]

# Analytics
GET    /api/operator/analytics/bookings
GET    /api/operator/analytics/revenue
GET    /api/operator/analytics/customer-insights
GET    /api/operator/analytics/review-insights

# Files
POST   /api/operator/tours/[id]/upload-images
DELETE /api/operator/tours/[id]/images/[imageId]
```

### Database Tables
- `users` (role: 'operator')
- `partners` (type: 'operator')
- `tours`
- `tour_schedules`
- `bookings`
- `reviews`
- `operator_metrics`
- `finance_data`
- `guide_assignments`
- `assets` (tour images, logos)

---

## 3️⃣ GUIDE (🎓 Гид/Проводник)

### Назначение
Профессиональный гид, проводящий туры и управляющий группами.

### Permissions
```
READ:   OwnSchedule, OwnGroups, OwnEarnings
WRITE:  GroupNotes, SafetyReports
UPDATE: OwnProfile
```

### Возможности
- ✅ Просмотр расписания
- ✅ Управление группой
- ✅ Отчеты о безопасности
- ✅ Ежедневные логи
- ✅ Контакты в экстренных случаях
- ✅ Чек-листы оборудования
- ✅ Фото и видео туров
- ✅ Просмотр заработков
- ✅ История туров
- ✅ Рейтинг и отзывы
- ✅ Доступ к мобильному приложению

### Related Entities
```
Guide → GuideSchedule (1:M)
Guide → GuideGroup (1:M)
Guide → GuideEarnings
Guide → SafetyReport (1:M)
Guide → Equipment (M:M)
Guide → Tours (M:M)
```

### Dashboard
**URL:** `/hub/guide` или `/mobile/guide`

**Разделы:**
- My Schedule (мое расписание)
- Active Tour (текущий тур)
- Group Management (управление группой)
- Safety Reports (отчеты о безопасности)
- Equipment Checklist (чек-лист оборудования)
- Earnings (заработок)
- Statistics (статистика)

### Mobile App Features
- Offline access to tour details
- GPS tracking
- Emergency alerts
- Photo uploads
- Communication with tourists

### API Endpoints
```
# Schedule
GET    /api/guide/schedule
GET    /api/guide/schedule/[dateRange]
GET    /api/guide/schedule/[tourId]

# Current Tour
GET    /api/guide/current-tour
PATCH  /api/guide/current-tour/status
POST   /api/guide/current-tour/checkin
POST   /api/guide/current-tour/checkout

# Groups
GET    /api/guide/groups
GET    /api/guide/groups/[groupId]
PATCH  /api/guide/groups/[groupId]
POST   /api/guide/groups/[groupId]/notes
GET    /api/guide/groups/[groupId]/participants

# Safety
POST   /api/guide/safety-reports
GET    /api/guide/safety-reports
GET    /api/guide/emergency-contacts

# Equipment
GET    /api/guide/equipment
POST   /api/guide/equipment/checklist
PATCH  /api/guide/equipment/checklist/[checklistId]

# Earnings
GET    /api/guide/earnings
GET    /api/guide/earnings/[period]
GET    /api/guide/payouts

# Statistics
GET    /api/guide/stats
GET    /api/guide/stats/tours-conducted
GET    /api/guide/stats/rating

# Media
POST   /api/guide/tours/[tourId]/photos
POST   /api/guide/tours/[tourId]/videos
```

### Database Tables
- `users` (role: 'guide')
- `guide_schedules`
- `guide_groups`
- `guide_earnings`
- `safety_reports`
- `equipment_checklist`
- `guide_tour_assignments`

---

## 4️⃣ TRANSFER OPERATOR (🚗 Оператор трансфера)

### Назначение
Компания, предоставляющая транспортные услуги (трансферы, аренда авто, вертолеты и т.д.)

### Permissions
```
READ:   OwnVehicles, OwnDrivers, OwnBookings, Finance
WRITE:  Vehicles, Drivers, Routes, Schedules
UPDATE: OwnData
DELETE: OwnData (с ограничениями)
```

### Возможности
- ✅ Управление автопарком
- ✅ Управление водителями
- ✅ Создание маршрутов
- ✅ Управление расписанием
- ✅ Просмотр бронирований трансфера
- ✅ GPS-отслеживание
- ✅ Финансовая статистика
- ✅ Документооборот
- ✅ Сертификация водителей
- ✅ История поездок

### Related Entities
```
TransferOperator → Vehicles (1:M)
TransferOperator → Drivers (1:M)
TransferOperator → TransferRoutes (1:M)
TransferOperator → TransferBookings (1:M)
TransferOperator → TransferMetrics
Drivers → Vehicles (M:M)
```

### Dashboard
**URL:** `/hub/transfer-operator` или `/hub/transfer`

**Разделы:**
- Overview (обзор)
- Vehicles (автопарк)
- Drivers (водители)
- Routes (маршруты)
- Bookings (бронирования)
- GPS Tracking (отслеживание)
- Finance (финансы)
- Documents (документы)

### API Endpoints
```
# Dashboard
GET    /api/transfer/dashboard
GET    /api/transfer/dashboard/metrics

# Vehicles
GET    /api/transfer/vehicles
POST   /api/transfer/vehicles
GET    /api/transfer/vehicles/[id]
PATCH  /api/transfer/vehicles/[id]
DELETE /api/transfer/vehicles/[id]
PATCH  /api/transfer/vehicles/[id]/status
GET    /api/transfer/vehicles/[id]/maintenance-history

# Drivers
GET    /api/transfer/drivers
POST   /api/transfer/drivers
GET    /api/transfer/drivers/[id]
PATCH  /api/transfer/drivers/[id]
DELETE /api/transfer/drivers/[id]
PATCH  /api/transfer/drivers/[id]/status
PATCH  /api/transfer/drivers/[id]/certification
GET    /api/transfer/drivers/[id]/trips

# Routes
GET    /api/transfer/routes
POST   /api/transfer/routes
GET    /api/transfer/routes/[id]
PATCH  /api/transfer/routes/[id]
DELETE /api/transfer/routes/[id]
GET    /api/transfer/routes/popular

# Schedules
GET    /api/transfer/schedules
POST   /api/transfer/schedules
PATCH  /api/transfer/schedules/[id]
DELETE /api/transfer/schedules/[id]

# Bookings
GET    /api/transfer/bookings
GET    /api/transfer/bookings/[id]
PATCH  /api/transfer/bookings/[id]/status

# GPS Tracking
GET    /api/transfer/tracking/[vehicleId]
GET    /api/transfer/tracking/trip/[tripId]
POST   /api/transfer/tracking/update-location

# Finance
GET    /api/transfer/finance/summary
GET    /api/transfer/finance/revenue
GET    /api/transfer/finance/expenses

# Documents
GET    /api/transfer/documents
POST   /api/transfer/documents
DELETE /api/transfer/documents/[id]
```

### Database Tables
- `users` (role: 'transfer')
- `partners` (type: 'transfer')
- `vehicles`
- `drivers`
- `driver_vehicles` (M:M)
- `transfer_routes`
- `transfer_schedules`
- `transfer_bookings`
- `gps_tracking`
- `maintenance_records`

---

## 5️⃣ AGENT (🎫 Агент/Реферал)

### Назначение
Партнер, привлекающий клиентов и получающий комиссии. Может быть туристическое агентство, отель или индивидуальный партнер.

### Permissions
```
READ:   OwnClients, OwnBookings, OwnCommissions
WRITE:  Clients, Bookings (от имени клиента), Vouchers
UPDATE: OwnData
DELETE: Ограничено
```

### Возможности
- ✅ Управление клиентами
- ✅ Создание бронирований от имени клиента
- ✅ Управление ваучерами/купонами
- ✅ Отслеживание комиссионных
- ✅ Реферальная программа
- ✅ Выплаты
- ✅ Отчеты и аналитика
- ✅ Экспорт данных
- ✅ Управление скидками
- ✅ История операций

### Related Entities
```
Agent → AgentClients (1:M)
Agent → Bookings (1:M, created by agent)
Agent → Vouchers (1:M)
Agent → AgentCommissions
Agent → CommissionPayouts (1:M)
Agent → AgentMetrics
```

### Dashboard
**URL:** `/hub/agent` или `/dashboard/agent`

**Разделы:**
- My Clients (мои клиенты)
- My Bookings (мои бронирования)
- Commissions (комиссионные)
- Vouchers (ваучеры)
- Payouts (выплаты)
- Referrals (рефералы)
- Analytics (аналитика)
- Reports (отчеты)

### API Endpoints
```
# Dashboard
GET    /api/agent/dashboard
GET    /api/agent/dashboard/summary

# Clients
GET    /api/agent/clients
POST   /api/agent/clients
GET    /api/agent/clients/[id]
PATCH  /api/agent/clients/[id]
DELETE /api/agent/clients/[id]

# Bookings
GET    /api/agent/bookings
POST   /api/agent/bookings
GET    /api/agent/bookings/[id]
PATCH  /api/agent/bookings/[id]/status

# Vouchers
GET    /api/agent/vouchers
POST   /api/agent/vouchers
PATCH  /api/agent/vouchers/[id]
DELETE /api/agent/vouchers/[id]
GET    /api/agent/vouchers/[code]/validate

# Commissions
GET    /api/agent/commissions
GET    /api/agent/commissions/summary
GET    /api/agent/commissions/[period]

# Payouts
GET    /api/agent/payouts
POST   /api/agent/payouts/request
GET    /api/agent/payouts/[id]

# Referrals
GET    /api/agent/referrals
GET    /api/agent/referrals/link
POST   /api/agent/referrals/track

# Analytics
GET    /api/agent/analytics/sales
GET    /api/agent/analytics/clients
GET    /api/agent/analytics/revenue
GET    /api/agent/analytics/commissions

# Reports
GET    /api/agent/reports/monthly
GET    /api/agent/reports/custom
```

### Database Tables
- `users` (role: 'agent')
- `partners` (type: 'agent')
- `agent_clients`
- `bookings` (created_by_agent)
- `vouchers`
- `agent_commissions`
- `commission_payouts`
- `agent_metrics`
- `referral_codes`

---

## 6️⃣ ADMIN (👨‍💼 Администратор)

### Назначение
Управление всей платформой. Доступ ко всем данным и функциям.

### Permissions
```
READ:   All data
WRITE:  All entities
DELETE: All entities
UPDATE: All configurations
EXECUTE: System operations
```

### Возможности
- ✅ Управление пользователями (создание, редактирование, удаление, блокировка)
- ✅ Модерация туров
- ✅ Модерация отзывов
- ✅ Верификация партнеров
- ✅ Управление финансами
- ✅ Управление комиссиями
- ✅ Управление выплатами
- ✅ Email-шаблоны
- ✅ SMS-шаблоны
- ✅ Notification settings
- ✅ System settings
- ✅ Email templates
- ✅ Глобальная статистика
- ✅ Логи и аудит
- ✅ Безопасность
- ✅ Backup & Recovery

### Related Entities
```
Admin → All entities
Admin → AdminLogs
Admin → AdminAlerts
Admin → AdminSettings
Admin → EmailTemplates
Admin → SystemConfigurations
```

### Dashboard
**URL:** `/hub/admin` или `/dashboard/admin`

**Разделы:**
- Overview (обзор)
- Users Management (управление пользователями)
- Content Moderation (модерация контента)
- Finance Management (управление финансами)
- Settings (настройки)
- Reports & Analytics (отчеты)
- System (система)
- Security (безопасность)

### API Endpoints
```
# Dashboard
GET    /api/admin/dashboard
GET    /api/admin/dashboard/summary

# Users Management
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/[id]
PATCH  /api/admin/users/[id]
DELETE /api/admin/users/[id]
PATCH  /api/admin/users/[id]/role
PATCH  /api/admin/users/[id]/status
POST   /api/admin/users/[id]/suspend
POST   /api/admin/users/[id]/unsuspend

# Content Moderation - Tours
GET    /api/admin/content/tours
GET    /api/admin/content/tours/[id]
PATCH  /api/admin/content/tours/[id]
DELETE /api/admin/content/tours/[id]
POST   /api/admin/content/tours/[id]/approve
POST   /api/admin/content/tours/[id]/reject
POST   /api/admin/content/tours/[id]/flag

# Content Moderation - Reviews
GET    /api/admin/content/reviews
GET    /api/admin/content/reviews/[id]
POST   /api/admin/content/reviews/[id]/approve
POST   /api/admin/content/reviews/[id]/reject
DELETE /api/admin/content/reviews/[id]
POST   /api/admin/content/reviews/[id]/flag

# Content Moderation - Partners
GET    /api/admin/content/partners
GET    /api/admin/content/partners/[id]
POST   /api/admin/content/partners/[id]/verify
POST   /api/admin/content/partners/[id]/reject
PATCH  /api/admin/content/partners/[id]/status

# Finance Management
GET    /api/admin/finance/summary
GET    /api/admin/finance/transactions
GET    /api/admin/finance/payouts
GET    /api/admin/finance/revenue
GET    /api/admin/finance/commissions
POST   /api/admin/finance/payouts/[id]/process
POST   /api/admin/finance/payouts/[id]/reject

# Settings
GET    /api/admin/settings
PATCH  /api/admin/settings
GET    /api/admin/settings/email-templates
POST   /api/admin/settings/email-templates
PATCH  /api/admin/settings/email-templates/[id]
DELETE /api/admin/settings/email-templates/[id]
GET    /api/admin/settings/sms-templates
POST   /api/admin/settings/sms-templates
PATCH  /api/admin/settings/sms-templates/[id]
DELETE /api/admin/settings/sms-templates/[id]

# System Configuration
GET    /api/admin/system/config
PATCH  /api/admin/system/config
GET    /api/admin/system/status
POST   /api/admin/system/backup
GET    /api/admin/system/logs

# Analytics & Reports
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/users
GET    /api/admin/analytics/bookings
GET    /api/admin/analytics/revenue
GET    /api/admin/analytics/tours
GET    /api/admin/analytics/exports

# Security & Audit
GET    /api/admin/security/logs
GET    /api/admin/security/alerts
GET    /api/admin/audit-logs
POST   /api/admin/security/ip-whitelist
POST   /api/admin/security/2fa-settings
```

### Database Tables
- `users` (role: 'admin')
- `admin_logs`
- `audit_logs`
- `admin_alerts`
- `admin_settings`
- `email_templates`
- `sms_templates`
- `system_configuration`
- `content_moderation_queue`
- `security_logs`

---

## 7️⃣ ADDITIONAL ROLES (Дополнительные роли)

### STAY PROVIDER (🏨 Провайдер размещения)
```
Dashboard: /hub/stay-provider
Manage:    Accommodations, Prices, Availability
Earnings:  Commission from bookings
```

### CAR RENTAL (🚙 Прокат авто)
```
Dashboard: /hub/cars
Manage:    Vehicle fleet, Rentals, Drivers
Earnings:  Revenue from rentals
```

### GEAR RENTAL (⛺ Прокат снаряжения)
```
Dashboard: /hub/gear
Manage:    Equipment inventory, Rentals
Earnings:  Revenue from equipment rentals
```

### SOUVENIR SHOP (🎁 Магазин сувениров)
```
Dashboard: /hub/souvenirs
Manage:    Product catalog, Orders, Inventory
Earnings:  Product sales commission
```

### SAFETY SERVICE (🛡️ Служба безопасности)
```
Dashboard: /hub/safety
Monitor:   Group safety, Emergency response
Report:    Incident reports, Risk assessment
```

### DRIVER (👨‍🚗 Водитель)
```
App:       Mobile driver app
Tasks:     Accept transfers, Navigate, Report issues
Earnings:  Trip-based commission
```

---

# 📦 СУЩНОСТИ (ENTITIES)

## УРОВЕНЬ 1: CORE ENTITIES

### 1. USER (Пользователь)
```typescript
{
  id: UUID
  email: string (unique)
  phone: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: enum('male', 'female', 'other')
  role: enum (6+ типов)
  status: enum('active', 'inactive', 'suspended', 'banned')
  avatar: Asset
  nationality: string
  language: string
  currency: string
  timezone: string
  emailVerified: boolean
  phoneVerified: boolean
  twoFactorEnabled: boolean
  lastLogin: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}

Relations:
  - Bookings (1:M)
  - Reviews (1:M)
  - Payments (1:M)
  - LoyaltyProfile (1:1)
  - EcoPoints (1:1)
  - Preferences (1:1)
  - Addresses (1:M)
  - PaymentMethods (1:M)
```

### 2. TOUR (Тур)
```typescript
{
  id: UUID
  title: string
  slug: string (unique)
  description: string
  shortDescription: string
  operatorId: UUID → Partner/Operator
  category: string
  difficulty: enum('easy', 'medium', 'hard', 'extreme')
  duration: {
    days: number
    nights: number
    startTime: string
    endTime: string
  }
  season: enum('year-round', 'spring', 'summer', 'autumn', 'winter')
  pricing: {
    priceFrom: number
    priceTo: number
    currency: string
    childDiscount: number
    groupDiscount: number
  }
  capacity: {
    minParticipants: number
    maxParticipants: number
    currentlyBooked: number
  }
  location: {
    region: string
    startPoint: GeoPoint
    endPoint: GeoPoint
    coordinates: [longitude, latitude]
  }
  inclusions: {
    guides: boolean
    meals: string[]
    accommodation: boolean
    transport: boolean
    equipment: string[]
  }
  requirements: {
    physicalLevel: string
    skills: string[]
    equipment: string[]
    certifications: string[]
    weatherConditions: string[]
    ageRestrictions: {
      minAge: number
      maxAge: number
    }
  }
  safety: {
    safetyRating: number
    insuranceIncluded: boolean
    emergencyProtocol: string
    guidedGroupSize: number
  }
  media: {
    images: Asset[]
    videos: Asset[]
    thumbnail: Asset
  }
  rating: {
    averageRating: number
    reviewCount: number
    ratingBreakdown: {
      1: number
      2: number
      3: number
      4: number
      5: number
    }
  }
  status: enum('draft', 'active', 'inactive', 'cancelled')
  isVerified: boolean
  isPremium: boolean
  tags: string[]
  seoMeta: {
    title: string
    description: string
    keywords: string[]
  }
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt: DateTime (soft delete)
}

Relations:
  - Operator (M:1) → Partner
  - Bookings (1:M)
  - Reviews (1:M)
  - Schedules (1:M)
  - Guides (M:M)
  - Assets (M:M)
  - Inclusions (M:M)
```

### 3. BOOKING (Бронирование)
```typescript
{
  id: UUID
  bookingNumber: string (unique, format: BK-YYYYMMDD-XXXXX)
  
  // Участники
  userId: UUID → User (турист)
  operatorId: UUID → Partner (туроператор)
  agentId: UUID → Partner (агент, если есть)
  
  // Тур
  tourId: UUID → Tour
  scheduleId: UUID → TourSchedule
  startDate: DateTime
  endDate: DateTime
  
  // Участники
  primaryParticipant: {
    firstName: string
    lastName: string
    email: string
    phone: string
    passport: string
  }
  additionalParticipants: [
    {
      firstName: string
      lastName: string
      age: number
      relationshipToMain: string
    }
  ]
  totalParticipants: number
  
  // Финансы
  pricing: {
    pricePerPerson: number
    subtotal: number
    discount: number (if voucher/promo)
    tax: number
    totalPrice: number
    currency: string
    paymentStatus: enum('pending', 'partial', 'paid', 'refunded')
    paidAmount: number
    remainingAmount: number
  }
  
  // Статусы
  bookingStatus: enum(
    'pending',          // Ожидает подтверждения
    'confirmed',        // Подтверждено
    'paid',             // Оплачено
    'in-progress',      // Идет в данный момент
    'completed',        // Завершено
    'cancelled',        // Отменено
    'no-show'           // Не пришел
  )
  
  // Параметры
  specialRequests: string
  dietaryRestrictions: string[]
  mobileNumber: string
  emergencyContact: {
    name: string
    phone: string
    relation: string
  }
  
  // Документы
  documents: {
    passport: Asset
    visa: Asset
    insurance: Asset
  }
  
  // Отслеживание
  createdAt: DateTime
  confirmedAt: DateTime
  paidAt: DateTime
  completedAt: DateTime
  cancelledAt: DateTime
  cancellationReason: string
  
  // Контроль
  lastModifiedBy: UUID
  lastModifiedAt: DateTime
}

Relations:
  - User (M:1)
  - Tour (M:1)
  - TourSchedule (M:1)
  - Operator (M:1)
  - Agent (M:0-1)
  - Payment (1:1)
  - Review (0:1)
  - Invoice (1:1)
  - Voucher (0:1)
```

### 4. REVIEW (Отзыв)
```typescript
{
  id: UUID
  
  // Автор и объект
  userId: UUID → User
  tourId: UUID → Tour
  bookingId: UUID → Booking (обязателен для верификации)
  
  // Содержание
  title: string
  content: string
  rating: number (1-5)
  
  // Детальная оценка
  detailedRating: {
    guideQuality: number
    safetyLevel: number
    organizationQuality: number
    valueForMoney: number
    scenery: number
    experience: number
  }
  
  // Параметры
  wouldRecommend: boolean
  visitDate: Date
  isVerified: boolean (verified if booking completed)
  withPhotos: boolean
  
  // Модерация
  status: enum('pending', 'approved', 'rejected', 'flagged')
  isHelpful: number (votes)
  isFlagged: boolean
  flagReason: string
  flaggedAt: DateTime
  
  // Реакции
  likes: number
  dislikes: number
  
  // Системные
  createdAt: DateTime
  updatedAt: DateTime
  publishedAt: DateTime
}

Relations:
  - User (M:1)
  - Tour (M:1)
  - Booking (M:0-1)
```

---

## УРОВЕНЬ 2: TRANSACTION ENTITIES

### 5. PAYMENT (Платеж)
```typescript
{
  id: UUID
  paymentId: string (unique, для платежных систем)
  
  // Связи
  bookingId: UUID → Booking (обычно)
  userId: UUID → User
  operatorId: UUID → Partner
  
  // Сумма
  amount: number
  currency: string
  
  // Способ оплаты
  paymentMethod: enum(
    'credit_card',
    'debit_card',
    'bank_transfer',
    'yandex_kassa',
    'sberbank',
    'paypal',
    'cryptocurrency',
    'voucher',
    'loyalty_points'
  )
  
  // Детали платежа
  paymentGateway: string (Stripe, CloudPayments, etc)
  transactionId: string
  
  // Статус
  status: enum(
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
  )
  
  // Рефунд
  refundStatus: enum('none', 'partial', 'full')
  refundAmount: number
  refundReason: string
  
  // Реквизиты
  cardLast4: string (masked)
  cardBrand: string
  bankName: string
  accountNumber: string (masked)
  
  // Сроки
  createdAt: DateTime
  completedAt: DateTime
  refundedAt: DateTime
}

Relations:
  - Booking (M:1)
  - User (M:1)
  - Operator (M:1)
  - Invoice (1:1)
```

### 6. INVOICE (Счет)
```typescript
{
  id: UUID
  invoiceNumber: string (unique, format: INV-YYYYMMDD-XXXXX)
  
  // Связи
  bookingId: UUID → Booking
  paymentId: UUID → Payment
  
  // Данные
  issueDate: Date
  dueDate: Date
  
  // Информация о продавце
  seller: {
    name: string
    taxId: string
    address: string
    email: string
    phone: string
  }
  
  // Информация о покупателе
  buyer: {
    name: string
    email: string
    address: string
    phone: string
  }
  
  // Позиции
  items: [
    {
      description: string
      quantity: number
      unitPrice: number
      total: number
    }
  ]
  
  // Итого
  subtotal: number
  tax: number
  discount: number
  total: number
  
  // Статус
  status: enum('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')
  
  // Реквизиты для оплаты
  paymentTerms: string
  bankDetails: object
  
  // Система
  createdAt: DateTime
  sentAt: DateTime
  paidAt: DateTime
}

Relations:
  - Booking (M:1)
  - Payment (M:1)
```

---

## УРОВЕНЬ 3: SERVICE ENTITIES

### 7. CAR RENTAL (Аренда автомобиля)
```typescript
{
  id: UUID
  rentalNumber: string (unique)
  
  // Участники
  customerId: UUID → User
  carId: UUID → Car
  operatorId: UUID → Partner (car rental operator)
  
  // Даты
  pickupDate: Date
  returnDate: Date
  pickupTime: Time
  returnTime: Time
  daysCount: number
  
  // Локации
  pickupLocation: string
  returnLocation: string
  
  // Водитель
  primaryDriver: {
    firstName: string
    lastName: string
    licenseNumber: string
    licenseExpiry: Date
    age: number
  }
  additionalDrivers: [
    {
      firstName: string
      lastName: string
      licenseNumber: string
    }
  ]
  
  // Финансы
  pricing: {
    dailyRate: number
    daysCount: number
    basePrice: number
    insurance: {
      type: enum('basic', 'premium', 'none')
      cost: number
    }
    additionalServices: [
      {
        name: string
        cost: number
      }
    ]
    deposit: number
    discount: number
    totalPrice: number
    currency: string
  }
  
  // Статус
  status: enum(
    'pending',
    'confirmed',
    'active',
    'completed',
    'cancelled'
  )
  
  // Примечания
  specialRequests: string
  
  // Отслеживание
  createdAt: DateTime
  confirmedAt: DateTime
  startedAt: DateTime
  completedAt: DateTime
}

Relations:
  - User (M:1)
  - Car (M:1)
  - CarRentalOperator (M:1)
  - Payment (1:1)
  - Insurance (0:1)
```

### 8. GEAR RENTAL (Аренда снаряжения)
```typescript
{
  id: UUID
  rentalNumber: string (unique)
  
  // Участники
  customerId: UUID → User
  bookingId: UUID → Booking (optional, tour-related)
  
  // Оборудование
  items: [
    {
      gearId: UUID → GearEquipment
      name: string
      category: string
      quantity: number
      pricePerUnit: number
      totalPrice: number
    }
  ]
  
  // Даты
  startDate: Date
  endDate: Date
  totalDays: number
  
  // Статус
  status: enum('pending', 'confirmed', 'active', 'completed', 'cancelled')
  
  // Финансы
  pricing: {
    subtotal: number
    deposit: number
    discount: number
    totalPrice: number
    currency: string
  }
  
  // Доставка
  deliveryMethod: enum('self-pickup', 'delivery', 'return-at-location')
  
  // Условия
  depositRequired: boolean
  depositAmount: number
  damageWaiver: boolean
  
  // Примечания
  specialRequests: string
  
  // Отслеживание
  createdAt: DateTime
  confirmedAt: DateTime
  pickedUpAt: DateTime
  returnedAt: DateTime
}

Relations:
  - User (M:1)
  - GearEquipment (M:M)
  - Booking (M:0-1)
  - Payment (1:1)
```

### 9. TRANSFER BOOKING (Бронирование трансфера)
```typescript
{
  id: UUID
  transferNumber: string (unique)
  
  // Участники
  passengerId: UUID → User
  driverId: UUID → Driver (assigned later)
  vehicleId: UUID → Vehicle (assigned later)
  transferOperatorId: UUID → Partner
  
  // Маршрут
  pickupLocation: GeoPoint
  dropoffLocation: GeoPoint
  pickupTime: DateTime
  estimatedArrivalTime: DateTime
  
  // Пассажиры
  primaryPassenger: {
    firstName: string
    lastName: string
    phone: string
    email: string
  }
  additionalPassengers: number
  specialRequests: string
  
  // Тип транспорта
  vehicleType: enum('car', 'minivan', 'bus', 'helicopter', 'boat')
  
  // Статус
  status: enum(
    'pending',
    'confirmed',
    'assigned',
    'driver-accepted',
    'en-route',
    'arrived',
    'completed',
    'cancelled'
  )
  
  // Финансы
  pricing: {
    basePrice: number
    distancePrice: number
    surgePrice: number (if applicable)
    discount: number
    totalPrice: number
    currency: string
    paymentStatus: enum('pending', 'paid', 'refunded')
  }
  
  // GPS
  gpsEnabled: boolean
  currentLocation: GeoPoint (for active transfers)
  
  // Отслеживание
  createdAt: DateTime
  confirmedAt: DateTime
  completedAt: DateTime
}

Relations:
  - User (M:1)
  - Driver (M:0-1)
  - Vehicle (M:0-1)
  - TransferRoute (M:1)
  - Payment (1:1)
```

---

## УРОВЕНЬ 4: PARTNER & BUSINESS ENTITIES

### 10. PARTNER (Партнер)
```typescript
{
  id: UUID
  
  // Информация
  name: string (company name)
  type: enum(
    'operator',      // Туроператор
    'guide',         // Гид
    'transfer',      // Трансфер оператор
    'stay',          // Размещение
    'car-rental',    // Прокат авто
    'gear-rental',   // Прокат снаряжения
    'souvenir',      // Сувениры
    'restaurant',    // Ресторан
    'agent'          // Агент/Реселлер
  )
  
  // Контакты
  email: string (unique)
  phone: string
  website: string
  socialMedia: {
    facebook: string
    instagram: string
    vk: string
  }
  
  // Адрес
  address: {
    street: string
    city: string
    region: string
    postalCode: string
    country: string
  }
  coordinates: GeoPoint
  
  // Регистрация
  registrationNumber: string (company registration)
  taxId: string (ИНН)
  bankAccount: string
  legalForm: string (ООО, ИП, АО, и т.д.)
  
  // Профиль
  description: string (bio/about)
  logo: Asset
  coverImage: Asset
  media: Asset[]
  
  // Рейтинг
  rating: {
    averageRating: number
    reviewCount: number
    totalEarnings: number
  }
  
  // Статус
  status: enum('pending', 'active', 'inactive', 'banned')
  isVerified: boolean
  verificationDate: DateTime
  verificationDocument: Asset
  
  // Комиссия
  commissionRate: number (percentage)
  payoutMethod: enum('bank_transfer', 'wallet', 'cryptocurrency')
  
  // Служба поддержки
  supportEmail: string
  supportPhone: string
  supportHours: string
  
  // Настройки
  autoApproveBookings: boolean
  requirePaymentUpfront: boolean
  cancellationPolicy: string
  
  // Отслеживание
  createdAt: DateTime
  updatedAt: DateTime
  lastActiveAt: DateTime
}

Relations:
  - User (1:1 или M:1 если несколько админов)
  - Tours (1:M, если operator)
  - Vehicles (1:M, если transfer)
  - GearEquipment (1:M, если gear rental)
  - Bookings (1:M)
  - Assets (M:M)
  - Reviews (1:M)
  - Commissions (1:M)
  - Payouts (1:M)
```

### 11. VOUCHER (Ваучер/Купон)
```typescript
{
  id: UUID
  
  // Информация
  code: string (unique, format: KAMHUB2025XXX)
  title: string
  description: string
  
  // Скидка
  discountType: enum('fixed', 'percentage')
  discountValue: number
  maxDiscount: number (for percentage)
  minBookingAmount: number
  
  // Категория
  applicableTo: enum(
    'all',
    'tours',
    'transfers',
    'gear-rental',
    'car-rental',
    'specific-tour'
  )
  specificPartner: UUID (если применяется к одному партнеру)
  specificTour: UUID (если применяется к одному туру)
  
  // Лимиты
  usageLimit: number (total times)
  perUserLimit: number
  usageCount: number
  
  // Даты действия
  validFrom: DateTime
  validUntil: DateTime
  
  // Статус
  status: enum('active', 'inactive', 'expired')
  isAutoApplied: boolean
  
  // Создатель
  createdBy: UUID (admin or partner)
  
  // Отслеживание
  createdAt: DateTime
  updatedAt: DateTime
}

Relations:
  - Bookings (M:M)
  - Users (M:M through usage history)
```

### 12. LOYALTY PROFILE (Профиль лояльности)
```typescript
{
  id: UUID
  userId: UUID → User (unique)
  
  // Баллы
  totalPoints: number
  availablePoints: number
  spentPoints: number
  
  // Уровень
  currentLevel: enum(
    'bronze',       // 0 points
    'silver',       // 1000 points
    'gold',         // 5000 points
    'platinum',     // 10000 points
    'diamond'       // 25000+ points
  )
  
  levelProgress: {
    currentLevelPoints: number
    nextLevelPoints: number
    progressPercentage: number
  }
  
  // Бенефиты текущего уровня
  benefits: {
    discountPercent: number
    priorityBooking: boolean
    personalManager: boolean
    exclusiveTours: boolean
    freeUpgrades: number
    anniversaryBonus: number
  }
  
  // История
  pointsHistory: [
    {
      date: DateTime
      action: string
      points: number
      relatedBooking: UUID
    }
  ]
  
  // Реферальная программа
  referralCode: string (unique)
  referredUsers: number
  referralBonus: number
  
  // Статистика
  totalSpent: number
  totalBookings: number
  memberSince: DateTime
  lastActivityDate: DateTime
  
  // Настройки
  emailNotifications: boolean
  includePartnerOffers: boolean
  
  // Отслеживание
  createdAt: DateTime
  updatedAt: DateTime
}

Relations:
  - User (1:1)
  - PointsTransactions (1:M)
```

---

## УРОВЕНЬ 5: OPERATIONAL ENTITIES

### 13. ECO POINTS (Эко-баллы)
```typescript
{
  id: UUID
  userId: UUID → User (unique)
  
  // Баллы
  totalEcoPoints: number
  
  // Активности
  activities: [
    {
      type: enum(
        'public_transport',    // Общественный транспорт
        'carbon_offset',       // Компенсация углерода
        'waste_reduction',     // Сокращение отходов
        'eco_tour',            // Экологичный тур
        'group_booking'        // Групповое бронирование
      )
      points: number
      date: DateTime
      description: string
      relatedBooking: UUID
    }
  ]
  
  // Уровень эко-активности
  ecoLevel: enum(
    'beginner',
    'enthusiast',
    'activist',
    'champion'
  )
  
  // Достижения
  achievements: [
    {
      id: string
      name: string
      unlockedAt: DateTime
    }
  ]
  
  // Отслеживание
  createdAt: DateTime
  updatedAt: DateTime
}

Relations:
  - User (1:1)
```

### 14. GUIDE SCHEDULE (Расписание гида)
```typescript
{
  id: UUID
  guideId: UUID → User
  tourId: UUID → Tour
  
  // Даты и время
  startDate: Date
  endDate: Date
  startTime: Time
  endTime: Time
  groupSize: number
  
  // Статус
  status: enum('available', 'booked', 'completed', 'cancelled')
  
  // Связь с бронированиями
  bookings: UUID[] (Booking IDs)
  
  // Примечания
  notes: string
  specialRequirements: string
  
  // Отслеживание
  createdAt: DateTime
  updatedAt: DateTime
}

Relations:
  - Guide (M:1)
  - Tour (M:1)
  - Bookings (1:M)
```

### 15. SAFETY REPORT (Отчет о безопасности)
```typescript
{
  id: UUID
  guideId: UUID → Guide
  groupId: UUID → GuideGroup
  tourId: UUID → Tour
  
  // Информация
  reportDate: DateTime
  groupSize: number
  weatherConditions: string
  
  // Инциденты
  incidents: [
    {
      type: string
      severity: enum('low', 'medium', 'high', 'critical')
      description: string
      timestamp: DateTime
      resolved: boolean
      resolution: string
    }
  ]
  
  // Состояние группы
  groupMorale: enum('good', 'neutral', 'poor')
  physicalCondition: enum('good', 'fair', 'poor')
  anyMedicalIssues: boolean
  medicalDetails: string
  
  // Оборудование
  equipmentStatus: enum('good', 'fair', 'needs_replacement')
  equipmentIssues: string[]
  
  // Статистика
  photosCount: number
  videosCount: number
  
  // Отслеживание
  submittedAt: DateTime
  reviewedAt: DateTime
  reviewedBy: UUID (admin or supervisor)
}

Relations:
  - Guide (M:1)
  - Group (M:1)
  - Tour (M:1)
```

---

# 🔗 СВЯЗИ МЕЖДУ СУЩНОСТЯМИ

## Диаграмма связей (ER Diagram Концепция)

```
                    ┌──────────┐
                    │  USER    │
                    └──────────┘
                    /    |    \
                   /     |     \
        ┌──────────┘      |      └─────────┐
        ↓                 ↓                 ↓
    BOOKING         LOYALTYPROFILE     ECOPOINTS
        |                                    
        ↓                                    
    PAYMENT ←────────────────────┐         
        |                        |         
        ├─ TOUR ──→ OPERATOR    │         
        │           (PARTNER)    │         
        ├─ REVIEW               │         
        └─ INVOICE              │         
                                 │         
        ┌──────────────────────────────────┘
        │
    COMMISSION
        │
        ├─ PAYOUT
        └─ AGENT (PARTNER)
        
    TRANSFER:
        USER ──→ TRANSFERBOOKING ←─ DRIVER, VEHICLE, TRANSFERROUTE
        
    RENTAL:
        USER ──→ CARRENATAL ──→ CAR, INSURANCE
        USER ──→ GEARRENTAL ──→ GEAREQUIPMENT (M:M)
        
    GUIDE SYSTEM:
        GUIDE ──→ GUIDESCHEDULE ──→ TOUR
        GUIDE ──→ GUIDEGROUP ──→ BOOKING (M:M)
        GUIDE ──→ SAFETYREPORT ──→ GUIDEGROUP, TOUR
```

---

# 📊 ДИАГРАММЫ ПОТОКОВ ДАННЫХ

## PROCESS 1: Tourist Booking Flow

```
TOURIST (User)
    ↓
[SEARCH TOURS]
    ↓
Browse Tours, Read Reviews, Check Ratings
    ↓
[SELECT TOUR]
    ↓
Select Schedule, Participants, Special Requests
    ↓
[CREATE BOOKING] → BOOKING (status: pending)
    ↓
[PAYMENT] → PAYMENT (status: processing)
    ↓
[PAYMENT SUCCESS] 
    ├─ BOOKING.status = confirmed
    ├─ PAYMENT.status = completed
    ├─ Award LOYALTY POINTS
    └─ Send CONFIRMATION EMAIL
    ↓
[ON TOUR DATE]
    ├─ BOOKING.status = in-progress
    └─ GUIDE starts SAFETY REPORT
    ↓
[TOUR COMPLETED]
    ├─ BOOKING.status = completed
    ├─ Award LOYALTY POINTS
    ├─ Enable REVIEW posting
    └─ Send FEEDBACK EMAIL
    ↓
[REVIEW SUBMISSION]
    ├─ REVIEW.status = pending (moderation)
    └─ Send to ADMIN for approval
```

## PROCESS 2: Operator Commission Flow

```
OPERATOR (Partner)
    ↓
[CREATE TOUR] → TOUR (status: active)
    ↓
[TOURIST BOOKS] → BOOKING created
    ↓
[PAYMENT RECEIVED] → PAYMENT.status = completed
    ↓
[OPERATOR COMMISSION CALCULATED]
    commission = booking_amount × commission_rate
    ↓
[AGENTCOMMISSION RECORD CREATED]
    status: pending
    ↓
[MONTHLY PROCESSING]
    ├─ Sum all commissions for period
    ├─ Deduct platform fees
    ├─ Calculate taxes
    └─ Create PAYOUT RECORD (status: pending)
    ↓
[OPERATOR REQUESTS PAYOUT]
    └─ PAYOUT.status = requested
    ↓
[ADMIN VERIFIES & APPROVES]
    └─ PAYOUT.status = approved
    ↓
[PROCESS TRANSFER]
    ├─ Bank Transfer Initiated
    └─ PAYOUT.status = completed, processedAt = DateTime
    ↓
[NOTIFY OPERATOR]
    └─ Send PAYOUT CONFIRMATION
```

## PROCESS 3: Multi-Service Booking

```
TOURIST (User)
    ├─ [BOOK TOUR] → BOOKING, PAYMENT
    ├─ [RENT CAR] → CARRENATAL, PAYMENT
    ├─ [RENT GEAR] → GEARRENTAL, PAYMENT
    └─ [BUY SOUVENIRS] → SOUVENIRORDER, PAYMENT
    ↓
[CONSOLIDATED INVOICE] → Single INVOICE with all items
    ↓
[SINGLE PAYMENT] → One PAYMENT for total
    ↓
[SUCCESS]
    ├─ All bookings confirmed
    ├─ LOYALTY POINTS = sum of all
    └─ Confirmation email with all bookings
```

---

# 🔐 PERMISSIONS & ACCESS CONTROL

## Role-Based Access Control (RBAC)

### TOURIST Permissions
```
✓ READ:   Own profile, all active tours, reviews, booking history
✗ CREATE: Bookings, reviews, support tickets
✗ UPDATE: Own profile, own bookings (before payment)
✗ DELETE: Own reviews (after review period)
```

### OPERATOR Permissions
```
✓ READ:   Own tours, own bookings, financial data
✓ CREATE: Tours, tour schedules
✓ UPDATE: Own tours, availability, pricing
✗ DELETE: Tours (soft delete only)
✗ READ:  Other operators' data
```

### ADMIN Permissions
```
✓ READ:   All data
✓ CREATE: Users, system configurations
✓ UPDATE: Any entity
✓ DELETE: Any entity (with logging)
✓ EXECUTE: System operations, backups
```

## Row-Level Security (RLS)

```sql
-- Tourists see only their data
SELECT * FROM bookings WHERE user_id = auth.uid()

-- Operators see only their tours and related bookings
SELECT * FROM bookings WHERE tour_id IN (
  SELECT id FROM tours WHERE operator_id = auth.user_id()
)

-- Guides see only their assigned tours and groups
SELECT * FROM guide_schedules WHERE guide_id = auth.uid()
```

---

# 💾 DATABASE SCHEMA

## Key Tables Summary

| Table | Rows Est. | Size | Purpose |
|-------|-----------|------|---------|
| users | 50,000+ | ~25MB | User data |
| tours | 5,000+ | ~50MB | Tour listings |
| bookings | 100,000+ | ~80MB | Booking records |
| reviews | 50,000+ | ~40MB | Review/ratings |
| payments | 100,000+ | ~60MB | Payment records |
| partners | 1,000+ | ~10MB | Partner info |
| commissions | 50,000+ | ~30MB | Commission tracking |
| transfers | 30,000+ | ~25MB | Transfer bookings |

---

## Индексирование

```sql
-- Users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Bookings (most critical)
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Tours
CREATE INDEX idx_tours_operator_id ON tours(operator_id);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_rating ON tours(rating DESC);

-- Payments
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Reviews
CREATE INDEX idx_reviews_tour_id ON reviews(tour_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_status ON reviews(status);
```

---

## ИТОГОВАЯ СТАТИСТИКА

| Метрика | Значение |
|---------|----------|
| Всего ролей | 7 основных + 5 дополнительных |
| Основных сущностей | 15+ core entities |
| Всех таблиц в БД | 50+ tables |
| API endpoints | 150+ endpoints |
| Связей между таблицами | 100+ relations |
| Workflow процессов | 20+ major flows |
| Permission правил | 100+ RLS rules |

---

**Статус документации:** ✅ Полный и актуальный
**Последнее обновление:** 28 января 2026
**Версия:** 2.0
