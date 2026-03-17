# PHASE 1: Operator Tools — Complete Implementation Guide

**Status:** Planning
**Goal:** Build production-ready operator dashboard with weather automation & AI
**Timeline:** 2-3 недели (staging + testing)
**Risk Level:** Medium (но manageable with this plan)
**Author:** Claude Code + User (solo founder)

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Database Schema (Migration 040)](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Automation Workflows](#automation-workflows)
6. [AI Integration](#ai-integration)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Process](#deployment-process)
9. [Rollback Procedures](#rollback-procedures)
10. [Risk Mitigation](#risk-mitigation)

---

## OVERVIEW

### What We're Building

**Operator Dashboard** = tool для управления турами + автоматизация бизнес-процессов

```
ВХОДЯТ:
├─ Tour management (CRUD)
├─ Availability calendar
├─ Real-time bookings feed
├─ Weather monitoring + alerts
├─ Contingency rebooking (auto-alternatives)
├─ Payment settlement tracking
├─ Analytics & insights (AI-powered)
└─ Notifications (Email, SMS, Telegram)

ВЫХОДЯТ:
├─ Оператор видит все туры в 1 месте
├─ Автоматически переводит туристов на альтернативы
├─ Получает деньги сразу (без delays)
├─ Знает какие туры популярны (AI advice)
└─ ZERO manual work (всё автоматизировано)
```

### Why This Matters

**Current state:**
- МеСтечко управляет турами через Telegram (@Mestechko_kam)
- Туристы пишут вручную
- Оператор ищет альтернативы вручную
- Платежи - хаос (банк трансферы? наличные?)
- **Result:** chaos, потеря денег, потеря туристов

**After PHASE 1:**
- 1 dashboard для всего
- Автоматическая обработка заявок
- Погода → автоматические альтернативы
- Платежи на счёт сразу
- **Result:** scale-ready, professional, automated

---

## DATABASE SCHEMA

### Migration 040_operator_tools.sql

**File location:** `migrations/040_operator_tools.sql`
**Size:** ~200 строк
**Applies to:** All databases (staging + production)
**Rollback:** `DROP TABLE IF EXISTS operator_tours, operator_bookings, weather_alerts ... CASCADE`

### Table 1: operator_tours

```sql
CREATE TABLE operator_tours (
  id BIGSERIAL PRIMARY KEY,
  operator_id INT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255),

  -- Classification
  location_type VARCHAR(50),        -- 'volcano', 'hot_spring', 'bay', etc
  activity_type VARCHAR(50),        -- 'trekking', 'thermal', 'boat_trip', etc
  location_name VARCHAR(255),       -- 'Kurilskoye Lake', 'Avachinsky Pass'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Pricing & Capacity
  base_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  max_participants INT NOT NULL DEFAULT 1,
  min_participants INT DEFAULT 1,
  duration_hours DECIMAL(5, 2),     -- 2.5, 8, 24, 72

  -- Duration type (for calendar)
  duration_type VARCHAR(20),        -- 'day', 'half_day', 'multi_day'
  multi_day_count INT,              -- если multi_day: 3 дня, 5 дней

  -- Seasonal
  season_start DATE,
  season_end DATE,
  seasonal_only BOOLEAN DEFAULT false,

  -- Weather dependency
  weather_dependent BOOLEAN DEFAULT true,
  min_visibility_m INT DEFAULT 1000,    -- visibility requirement
  max_wind_kmh INT DEFAULT 30,
  max_precipitation_mm INT DEFAULT 2,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,   -- готово ли для туристов

  -- Metadata
  tags VARCHAR(255)[],              -- для поиска
  photos_urls TEXT[],               -- список фото в S3
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INT REFERENCES users(id),

  -- Constraints
  CONSTRAINT price_positive CHECK (base_price > 0),
  CONSTRAINT participants_valid CHECK (max_participants >= min_participants),
  UNIQUE(operator_id, slug)
);

-- Indexes
CREATE INDEX idx_operator_tours_operator_id ON operator_tours(operator_id);
CREATE INDEX idx_operator_tours_is_active ON operator_tours(is_active);
CREATE INDEX idx_operator_tours_season ON operator_tours(season_start, season_end);
CREATE INDEX idx_operator_tours_location ON operator_tours(location_type, activity_type);
```

**Зачем каждое поле:**
- `operator_id`: связь с оператором (МеСтечко, КамчатИнтур, и т.д.)
- `location_type/activity_type`: для поиска на map и catalogue
- `base_price`: базовая цена
- `weather_dependent`: если TRUE → система проверяет погоду
- `min_visibility_m/max_wind_kmh`: алерты если погода плохая
- `is_published`: готово ли для туристов (draft режим)
- `photos_urls`: фото в S3
- `created_by`: кто создал (для audit trail)

### Table 2: operator_bookings

```sql
CREATE TABLE operator_bookings (
  id BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Tourist (может быть аноним до подтверждения)
  tourist_email VARCHAR(255),
  tourist_phone VARCHAR(20),
  tourist_name VARCHAR(255),

  -- Booking details
  booking_date DATE NOT NULL,       -- когда тур
  participants INT NOT NULL,        -- сколько人
  adult_count INT,
  child_count INT,

  -- Pricing
  base_total_price DECIMAL(10, 2),  -- participants × base_price
  discount_percent INT DEFAULT 0,
  discount_reason VARCHAR(255),     -- 'weather_alternative', 'early_booking'
  final_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'RUB',

  -- Payment
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'paid', 'failed', 'refunded'
  payment_method VARCHAR(50),       -- 'cloudpayments', 'bank_transfer'
  payment_id VARCHAR(255),          -- ID от платёжной системы
  paid_at TIMESTAMP,

  -- Booking status
  booking_status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    -- 'new', 'confirmed', 'cancelled', 'completed', 'no_show'
  cancellation_reason VARCHAR(255),
  cancelled_at TIMESTAMP,

  -- Weather-related
  weather_alert_triggered BOOLEAN DEFAULT false,
  alternative_offered_tour_id BIGINT REFERENCES operator_tours(id),
  customer_chose_alternative BOOLEAN DEFAULT false,

  -- Communication
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent_24h BOOLEAN DEFAULT false,

  -- Notes & metadata
  special_requests TEXT,
  notes TEXT,
  metadata JSONB,                   -- для будущих расширений

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_via VARCHAR(50),          -- 'website', 'direct_contact', 'api'

  CONSTRAINT price_valid CHECK (final_price >= 0),
  CONSTRAINT participants_valid CHECK (participants > 0)
);

-- Indexes
CREATE INDEX idx_operator_bookings_tour ON operator_bookings(operator_tour_id);
CREATE INDEX idx_operator_bookings_date ON operator_bookings(booking_date);
CREATE INDEX idx_operator_bookings_status ON operator_bookings(booking_status);
CREATE INDEX idx_operator_bookings_payment ON operator_bookings(payment_status);
CREATE INDEX idx_operator_bookings_email ON operator_bookings(tourist_email);
```

**Зачем каждое поле:**
- `booking_date`: когда тур (важно для календаря)
- `participants`: сколько человек (для quotas)
- `payment_status`: чтобы знать оплачено ли
- `booking_status`: новая, подтверждена, отменена, завершена
- `weather_alert_triggered`: была ли погода причина отмены
- `alternative_offered_tour_id`: какую альтернативу предложили
- `customer_chose_alternative`: выбрал ли турист альтернативу
- `confirmation_sent`: было ли письмо? (чтобы повторно не отправлять)

### Table 3: tour_availability

```sql
CREATE TABLE tour_availability (
  id BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,
  day_of_week INT,                  -- 0=Monday, 6=Sunday

  -- Capacity
  available_slots INT NOT NULL,     -- max сколько мест доступно
  booked_slots INT DEFAULT 0,       -- сколько брониро

  -- Pricing override
  base_price_override DECIMAL(10, 2),   -- если отличается от tour.base_price

  -- Weather status
  weather_status VARCHAR(20) DEFAULT 'unknown',
    -- 'unknown', 'ok', 'alert', 'cancelled'
  weather_data JSONB,               -- {temp, wind, precip, visibility, ...}
  weather_check_time TIMESTAMP,

  -- If cancelled
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason VARCHAR(255),

  -- Contingency
  suggested_alternatives BIGINT[],  -- array of alternative tour_ids

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT slots_valid CHECK (available_slots > 0),
  CONSTRAINT booked_valid CHECK (booked_slots >= 0 AND booked_slots <= available_slots),
  UNIQUE(operator_tour_id, date)
);

-- Index
CREATE INDEX idx_tour_availability_date ON tour_availability(date);
CREATE INDEX idx_tour_availability_status ON tour_availability(weather_status);
```

**Зачем:**
- `available_slots`: сколько мест свободно (для календаря)
- `booked_slots`: сколько забронировано
- `weather_status`: свежая информация о погоде
- `weather_data`: JSON с деталями (temp, wind, precip и т.д.)
- `suggested_alternatives`: какие альтернативы можно предложить

### Table 4: weather_alerts

```sql
CREATE TABLE weather_alerts (
  id BIGSERIAL PRIMARY KEY,

  -- Tour & date
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),
  location_name VARCHAR(255),
  alert_date DATE NOT NULL,

  -- Weather data
  alert_type VARCHAR(50),           -- 'wind', 'precipitation', 'visibility'
  severity VARCHAR(20),             -- 'low', 'medium', 'high'
  weather_data JSONB,               -- full weather data

  -- Impact
  affected_bookings INT[],          -- booking IDs that are affected
  processed BOOLEAN DEFAULT false,  -- были ли туристы уведомлены
  processed_at TIMESTAMP,

  -- Response
  action_taken VARCHAR(255),        -- 'suggested_alternatives', 'offered_refund'

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT severity_valid CHECK (severity IN ('low', 'medium', 'high'))
);

-- Index
CREATE INDEX idx_weather_alerts_date ON weather_alerts(alert_date);
CREATE INDEX idx_weather_alerts_processed ON weather_alerts(processed);
```

### Table 5: contingency_rules

```sql
CREATE TABLE contingency_rules (
  id BIGSERIAL PRIMARY KEY,
  operator_id INT NOT NULL REFERENCES partners(id),

  -- Primary tour (который может быть отменён)
  primary_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Alternative tours (что предлагаем если плохая погода)
  alternative_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Rebooking rules
  discount_percent INT DEFAULT 0,       -- скидка если переходит
  auto_refund_percent INT DEFAULT 0,    -- если турист не хочет альтернативу

  -- When to apply
  weather_conditions VARCHAR(255),      -- 'any', 'wind>30', 'precip>5mm'
  available_from DATE,
  available_to DATE,

  -- Priority (order of suggestion)
  priority INT DEFAULT 1,               -- 1 = first, 2 = second, etc

  -- Is enabled
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_contingency_primary ON contingency_rules(primary_tour_id);
CREATE INDEX idx_contingency_priority ON contingency_rules(priority);
```

### Migration Safety

```sql
-- ВСЕГДА в миграции:
BEGIN TRANSACTION;  -- start atomic transaction

-- создание таблиц
CREATE TABLE ...;
CREATE TABLE ...;
...

-- добавляем индексы для производительности
CREATE INDEX ...;

-- проверяем что ничего не сломалось
SELECT COUNT(*) FROM partners;  -- должно быть > 0

-- всё вместе
COMMIT;

-- Если ошибка → ROLLBACK автоматически
```

---

## API ENDPOINTS

### Prefix: `/api/hub/operator`

All endpoints require `requireAuth` middleware + `requireRole(['operator', 'admin'])`

### 1. Tours Management

#### POST /api/hub/operator/tours
**Create new tour**

```typescript
// lib/api/operator/tours.ts
import { z } from 'zod';
import { query } from '@/lib/database';

const CreateTourSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  location_type: z.enum(['volcano', 'hot_spring', 'bay', 'lake', 'mountain', 'river', 'geyser', 'other']),
  activity_type: z.enum(['trekking', 'thermal', 'boat_trip', 'fishing', 'helicopter', 'jeep', 'other']),
  location_name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  base_price: z.number().positive(),
  max_participants: z.number().positive(),
  min_participants: z.number().positive().optional(),
  duration_hours: z.number().positive().optional(),
  season_start: z.string().date().optional(),
  season_end: z.string().date().optional(),
  weather_dependent: z.boolean().default(true),
  min_visibility_m: z.number().optional(),
  max_wind_kmh: z.number().optional(),
});

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const input = CreateTourSchema.parse(body);

    const auth = await verifyAuth(request);
    if (!auth.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get operator_id from auth user
    const operatorResult = await query(
      `SELECT id FROM partners WHERE user_id = $1 AND role = 'operator' LIMIT 1`,
      [auth.userId]
    );

    if (operatorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const operator_id = operatorResult.rows[0].id;

    // Create tour
    const result = await query(
      `INSERT INTO operator_tours (
        operator_id, title, description, location_type, activity_type,
        location_name, latitude, longitude, base_price, max_participants,
        min_participants, duration_hours, season_start, season_end,
        weather_dependent, min_visibility_m, max_wind_kmh,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      RETURNING id, title, base_price, created_at`,
      [
        operator_id, input.title, input.description || null, input.location_type,
        input.activity_type, input.location_name, input.latitude, input.longitude,
        input.base_price, input.max_participants, input.min_participants || 1,
        input.duration_hours || null, input.season_start || null, input.season_end || null,
        input.weather_dependent, input.min_visibility_m || 1000, input.max_wind_kmh || 30,
        auth.userId
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Tour created. Now add availability dates.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create tour' }, { status: 500 });
  }
};
```

**Request:**
```json
{
  "title": "Helicopter to Kurilskoye Lake",
  "description": "3-hour helicopter excursion to most beautiful lake",
  "location_type": "bay",
  "activity_type": "helicopter",
  "location_name": "Kurilskoye Lake",
  "latitude": 54.15,
  "longitude": 158.35,
  "base_price": 12000,
  "max_participants": 4,
  "duration_hours": 3,
  "weather_dependent": true,
  "min_visibility_m": 1000,
  "max_wind_kmh": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1001,
    "title": "Helicopter to Kurilskoye Lake",
    "base_price": 12000,
    "created_at": "2025-06-15T10:30:00Z"
  },
  "message": "Tour created. Now add availability dates."
}
```

#### GET /api/hub/operator/tours
**List all tours for this operator**

```typescript
export const GET = async (request: NextRequest) => {
  const auth = await verifyAuth(request);
  if (!auth.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const operatorResult = await query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [auth.userId]
  );

  const operator_id = operatorResult.rows[0].id;

  const result = await query(
    `SELECT
      t.id, t.title, t.location_type, t.activity_type, t.base_price,
      t.max_participants, t.is_active, t.is_published,
      COUNT(b.id) as total_bookings,
      COALESCE(SUM(b.final_price), 0) as total_revenue
    FROM operator_tours t
    LEFT JOIN operator_bookings b ON t.id = b.operator_tour_id
    WHERE t.operator_id = $1
    GROUP BY t.id
    ORDER BY t.created_at DESC`,
    [operator_id]
  );

  return NextResponse.json({
    success: true,
    data: result.rows
  });
};
```

#### PUT /api/hub/operator/tours/[id]
**Update tour**

#### DELETE /api/hub/operator/tours/[id]
**Delete tour (soft delete if has bookings)**

...

### 2. Availability Management

#### POST /api/hub/operator/tours/[id]/availability
**Add availability slots for specific date**

```typescript
// Batch add multiple dates
const AddAvailabilitySchema = z.object({
  dates: z.array(z.object({
    date: z.string().date(),
    available_slots: z.number().positive(),
    price_override: z.number().positive().optional(),
  }))
});

export const POST = async (request: NextRequest, { params }) => {
  const tour_id = parseInt(params.id);
  const body = await request.json();
  const { dates } = AddAvailabilitySchema.parse(body);

  // Batch insert
  for (const slot of dates) {
    await query(
      `INSERT INTO tour_availability (operator_tour_id, date, available_slots, base_price_override)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (operator_tour_id, date) DO UPDATE
       SET available_slots = $3, updated_at = NOW()`,
      [tour_id, slot.date, slot.available_slots, slot.price_override || null]
    );
  }

  return NextResponse.json({ success: true, message: `Added ${dates.length} dates` });
};
```

#### GET /api/hub/operator/tours/[id]/availability
**Get availability for calendar view**

...

### 3. Bookings

#### GET /api/hub/operator/bookings
**Live bookings feed (real-time)**

```typescript
// WebSocket or Server-Sent Events
export const GET = async (request: NextRequest) => {
  const auth = await verifyAuth(request);

  // Get recent bookings
  const result = await query(
    `SELECT
      b.id, b.tourist_email, b.tourist_name, b.participants,
      b.booking_date, b.final_price, b.payment_status,
      b.booking_status, b.weather_alert_triggered,
      t.title as tour_title,
      b.created_at
    FROM operator_bookings b
    JOIN operator_tours t ON b.operator_tour_id = t.id
    WHERE t.operator_id = (SELECT id FROM partners WHERE user_id = $1)
    ORDER BY b.created_at DESC
    LIMIT 50`,
    [auth.userId]
  );

  return NextResponse.json({
    success: true,
    data: result.rows,
    poll_interval_ms: 5000  // refresh each 5 sec
  });
};
```

#### PUT /api/hub/operator/bookings/[id]/status
**Update booking status (confirm, cancel, complete)**

...

### 4. Weather & Contingency

#### GET /api/weather/check
**Check weather for specific location & date**

```typescript
// Calls open-meteo.com API
export async function getWeather(lat: number, lng: number, date: string) {
  // https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&...
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,precipitation_sum,wind_speed_10m_max,visibility&date=${date}`
  );

  const data = await response.json();

  return {
    temp_max: data.daily.temperature_2m_max[0],
    precipitation_mm: data.daily.precipitation_sum[0],
    wind_kmh: data.daily.wind_speed_10m_max[0],
    visibility_m: data.daily.visibility[0],
    // ... parse weather code to alert type
  };
}
```

#### GET /api/hub/operator/contingency-rules
**List contingency rules**

#### POST /api/hub/operator/contingency-rules
**Create contingency rule**

```json
{
  "primary_tour_id": 1001,
  "alternative_tour_id": 1005,
  "discount_percent": 50,
  "priority": 1,
  "weather_conditions": "wind>30 OR precip>5mm"
}
```

...

### 5. Payments & Settlements

#### GET /api/hub/operator/settlements
**Payment history**

```typescript
export const GET = async (request: NextRequest) => {
  const result = await query(
    `SELECT
      DATE_TRUNC('day', b.paid_at) as settlement_date,
      COUNT(*) as transactions,
      SUM(b.final_price) as gross_amount,
      SUM(b.final_price * 0.95) as net_amount,
      SUM(b.final_price * 0.05) as platform_fee
    FROM operator_bookings b
    WHERE b.payment_status = 'paid'
      AND b.operator_tour_id IN (SELECT id FROM operator_tours WHERE operator_id = ...)
    GROUP BY settlement_date
    ORDER BY settlement_date DESC`,
    [operator_id]
  );

  return NextResponse.json({
    success: true,
    data: result.rows
  });
};
```

---

## FRONTEND COMPONENTS

### Directory Structure

```
/app/hub/operator/
├─ layout.tsx              (shared layout)
├─ dashboard/
│  ├─ page.tsx            (main dashboard)
│  └─ _DashboardClient.tsx (client-side logic)
├─ tours/
│  ├─ page.tsx            (tours list)
│  ├─ [id]/
│  │  ├─ page.tsx         (tour detail)
│  │  ├─ edit.tsx         (edit form)
│  │  └─ calendar.tsx     (availability calendar)
│  ├─ new.tsx             (create form)
│  └─ _TourFormClient.tsx (reusable form)
├─ bookings/
│  ├─ page.tsx            (live bookings feed)
│  └─ [id]/
│     └─ page.tsx         (booking detail)
├─ weather/
│  ├─ page.tsx            (weather alerts)
│  └─ [location]/
│     └─ forecast.tsx     (7-day forecast)
├─ contingency/
│  ├─ page.tsx            (contingency rules list)
│  └─ new.tsx             (create rule)
├─ analytics/
│  ├─ page.tsx            (dashboard)
│  └─ _AnalyticsClient.tsx (charts)
└─ settings/
   ├─ page.tsx
   └─ notifications.tsx
```

### Component 1: Dashboard

**File:** `app/hub/operator/dashboard/page.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AIAssistant } from '@/components/operator/AIAssistant';
import { BookingsFeed } from '@/components/operator/BookingsFeed';
import { WeatherAlerts } from '@/components/operator/WeatherAlerts';
import { RevenueChart } from '@/components/operator/RevenueChart';

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch live data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, alertsRes] = await Promise.all([
          fetch('/api/hub/operator/bookings'),
          fetch('/api/weather/alerts?operator_id=' + user?.operator_id)
        ]);

        const bookingsData = await bookingsRes.json();
        const alertsData = await alertsRes.json();

        setBookings(bookingsData.data);
        setAlerts(alertsData.data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="ds-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="ds-h1">Operator Dashboard</h1>
          <p className="text-[var(--text-secondary)]">
            Welcome, {user?.name}. Manage your tours & bookings from here.
          </p>
        </div>

        {/* Grid: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Bookings + Weather (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alerts banner */}
            {alerts.length > 0 && (
              <div className="ds-card bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                <h3 className="font-semibold text-[var(--warning)]">
                  ⚠️ {alerts.length} Weather Alerts
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Action may be needed. Check details below.
                </p>
              </div>
            )}

            {/* Live bookings */}
            <BookingsFeed bookings={bookings} loading={loading} />

            {/* Weather alerts */}
            <WeatherAlerts alerts={alerts} />

            {/* Revenue chart */}
            <RevenueChart />
          </div>

          {/* Sidebar: AI + Quick Stats */}
          <div className="space-y-6">
            {/* AI Assistant */}
            <AIAssistant />

            {/* Quick stats */}
            <div className="ds-card">
              <h3 className="ds-h3">This Month</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Tours</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">12</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Bookings</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">47</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Revenue</p>
                  <p className="text-2xl font-bold text-[var(--success)]">₽456,000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

...

---

## AUTOMATION WORKFLOWS

### Cron Job: Daily Weather Check

**File:** `lib/cron/daily-weather-check.ts`

```typescript
import { query } from '@/lib/database';
import { fetchWeather } from '@/lib/weather/fetcher';
import { findAlternatives } from '@/lib/contingency/matcher';
import { sendNotification } from '@/lib/notifications';

export async function dailyWeatherCheck() {
  console.log('[CRON] Starting daily weather check...');

  try {
    // Get all tours with bookings for next 3 days
    const toursResult = await query(
      `SELECT DISTINCT
        t.id, t.operator_id, t.location_name, t.latitude, t.longitude,
        t.min_visibility_m, t.max_wind_kmh, t.max_precipitation_mm,
        ta.date, COUNT(b.id) as booking_count
      FROM operator_tours t
      JOIN tour_availability ta ON t.id = ta.operator_tour_id
      LEFT JOIN operator_bookings b ON ta.operator_tour_id = b.operator_tour_id AND ta.date = b.booking_date
      WHERE ta.date BETWEEN NOW()::date AND NOW()::date + 3
        AND t.weather_dependent = true
        AND b.id IS NOT NULL  -- only if there are bookings
      GROUP BY t.id, ta.date`
    );

    for (const tour of toursResult.rows) {
      // Fetch weather
      const weather = await fetchWeather(
        tour.latitude,
        tour.longitude,
        tour.date
      );

      // Check thresholds
      const risks = [];
      if (weather.wind_kmh > tour.max_wind_kmh) risks.push('wind');
      if (weather.precipitation_mm > tour.max_precipitation_mm) risks.push('precipitation');
      if (weather.visibility_m < tour.min_visibility_m) risks.push('visibility');

      if (risks.length > 0) {
        console.log(`[WEATHER] ${tour.location_name} on ${tour.date}: HIGH RISK (${risks.join(', ')})`);

        // Create alert
        await query(
          `INSERT INTO weather_alerts (operator_tour_id, location_name, alert_date, alert_type, severity, weather_data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tour.id, tour.location_name, tour.date, risks[0], 'high', JSON.stringify(weather)]
        );

        // Find affected bookings
        const bookingsResult = await query(
          `SELECT id, tourist_email FROM operator_bookings
           WHERE operator_tour_id = $1 AND booking_date = $2 AND booking_status != 'cancelled'`,
          [tour.id, tour.date]
        );

        // For each booking: offer alternatives
        for (const booking of bookingsResult.rows) {
          const alternatives = await findAlternatives(tour.id, tour.date);

          // Send notification
          await sendNotification({
            type: 'email',
            to: booking.tourist_email,
            template: 'weather_alert',
            data: {
              tour: tour.location_name,
              date: tour.date,
              alternatives: alternatives,
              risk_reasons: risks
            }
          });

          // Mark booking as having alert
          await query(
            `UPDATE operator_bookings SET weather_alert_triggered = true WHERE id = $1`,
            [booking.id]
          );
        }
      }
    }

    console.log('[CRON] Weather check complete');
  } catch (error) {
    console.error('[CRON] Weather check failed:', error);
    // Send alert to admin
    await sendNotification({
      type: 'telegram',
      to: process.env.ADMIN_TELEGRAM_ID,
      message: `⚠️ Weather cron failed: ${error.message}`
    });
  }
}

// Register in cron scheduler
// Every day at 06:00 UTC
// 0 6 * * * node -e "require('./lib/cron').dailyWeatherCheck()"
```

...

---

## AI INTEGRATION

### AI Assistant for Operators

**File:** `app/api/ai/operator-assistant/route.ts`

```typescript
import { callAIWaterfall } from '@/lib/ai/providers';
import { z } from 'zod';

const AskSchema = z.object({
  question: z.string(),
  context: z.object({
    tours: z.array(z.any()),
    bookings: z.array(z.any()),
    total_revenue: z.number()
  })
});

export const POST = async (request: NextRequest) => {
  const body = await request.json();
  const { question, context } = AskSchema.parse(body);

  const prompt = `
You are an AI advisor for tour operators on Kamchatka.
The operator has asked: "${question}"

Current Context:
- Active Tours: ${context.tours.length}
- Total Bookings: ${context.bookings.length}
- Monthly Revenue: ₽${context.total_revenue}

Based on booking patterns, weather trends, and pricing strategy,
provide actionable advice. Keep response concise (2-3 sentences).
`;

  const messages = [
    { role: 'system', content: 'You are a Kamchatka tour business advisor.' },
    { role: 'user', content: prompt }
  ];

  try {
    const answer = await callAIWaterfall(messages);

    return NextResponse.json({
      success: true,
      answer: answer
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'AI unavailable, try again later' },
      { status: 503 }
    );
  }
};
```

...

---

## TESTING STRATEGY

### Unit Tests

**File:** `__tests__/operator/tours.test.ts`

```typescript
import { POST as createTour } from '@/app/api/hub/operator/tours/route';
import { query } from '@/lib/database';

describe('Operator Tours API', () => {
  it('should create tour with valid data', async () => {
    const request = new Request('http://localhost:3000/api/hub/operator/tours', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Helicopter Tour',
        location_type: 'bay',
        activity_type: 'helicopter',
        latitude: 54.15,
        longitude: 158.35,
        base_price: 12000,
        max_participants: 4,
      })
    });

    const response = await createTour(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
  });

  it('should reject negative price', async () => {
    const request = new Request(..., {
      body: JSON.stringify({ ..., base_price: -100 })
    });

    const response = await createTour(request);
    expect(response.status).toBe(400);
  });
});
```

### Integration Tests

**File:** `__tests__/operator/workflows.test.ts`

```typescript
describe('Booking Workflow', () => {
  it('should complete full booking flow without data loss', async () => {
    // 1. Create tour
    const tour = await createTestTour();

    // 2. Add availability
    const availability = await addAvailability(tour.id, '2025-07-15', 4);

    // 3. Create booking
    const booking = await createBooking(tour.id, {
      tourist_email: 'test@example.com',
      participants: 2,
      booking_date: '2025-07-15'
    });

    // 4. Verify counts
    const tourCount = await query('SELECT COUNT(*) FROM operator_tours');
    const bookingCount = await query('SELECT COUNT(*) FROM operator_bookings');

    expect(tourCount.rows[0].count).toBe(1);
    expect(bookingCount.rows[0].count).toBe(1);
  });
});
```

---

## DEPLOYMENT PROCESS

### Step 1: Staging Deployment

```bash
# 1. Create branch
git checkout -b feature/phase1-operator-tools

# 2. Create migration
touch migrations/040_operator_tools.sql
# ... add SQL

# 3. Create API endpoints
mkdir -p app/api/hub/operator
touch app/api/hub/operator/tours/route.ts
# ... add code

# 4. Create components
mkdir -p components/operator
touch components/operator/Dashboard.tsx
# ... add code

# 5. Write tests
mkdir -p __tests__/operator
touch __tests__/operator/tours.test.ts
# ... add tests

# 6. Run checks
npx tsc --noEmit
npx vitest run --coverage

# 7. If all green:
git add .
git commit -m "feat: add operator dashboard & tools (PHASE 1)"
git push origin feature/phase1-operator-tools

# 8. Deploy to staging
# → GitHub Action auto-deploys to pospkam-pospktry-c1f3.twc1.net
```

### Step 2: Staging Testing (2-3 days)

```
DAY 1:
├─ Test tour creation (UI + API)
├─ Test availability calendar
├─ Test booking flow
└─ Check database integrity

DAY 2:
├─ Test weather monitoring (manual trigger)
├─ Test contingency matching
├─ Test notifications (email, telegram, SMS)
└─ Load test: 100 concurrent users

DAY 3:
├─ Manual edge cases:
│  ├─ Delete tour with bookings (should fail gracefully)
│  ├─ Cancel booking after payment (refund flow)
│  └─ Modify tour while booking happening
├─ Browser testing (Chrome, Safari, Firefox)
└─ Mobile responsiveness

IF ALL GREEN → approve for production
```

### Step 3: Production Deployment

```bash
# 1. Merge to main
git checkout main
git merge feature/phase1-operator-tools
git push origin main

# 2. GitHub Action deploys to production
# → https://tourhab.ru

# 3. Verify production
curl https://tourhab.ru/api/health
# should return 200

# 4. Monitor for 24 hours
tail -f logs/production.log
# watch for errors
```

---

## ROLLBACK PROCEDURES

### If Database Migration Fails

```bash
# Option 1: Revert commit
git revert HEAD
git push origin main
# Timeweb will auto-redeploy

# Option 2: Manual rollback (if needed)
# SSH into Timeweb
psql -U user -d kamchatourdb -c "
  DROP TABLE IF EXISTS operator_tours CASCADE;
  DROP TABLE IF EXISTS operator_bookings CASCADE;
  DROP TABLE IF EXISTS tour_availability CASCADE;
  DROP TABLE IF EXISTS weather_alerts CASCADE;
  DROP TABLE IF EXISTS contingency_rules CASCADE;
"

# App will continue with old schema (no crash)
```

### If API Endpoint Crashes

```typescript
// Quick disable in code
if (process.env.DISABLE_OPERATOR_API === 'true') {
  return NextResponse.json(
    { error: 'Temporarily unavailable for maintenance' },
    { status: 503 }
  );
}

// Set env var on Timeweb panel → instant disable
```

### If Booking Data is Corrupted

```sql
-- Restore from backup (Timeweb has daily backups)
-- Contact Timeweb support to restore specific time
-- Don't do this manually!

-- For single booking:
UPDATE operator_bookings
SET booking_status = 'pending', payment_status = 'pending'
WHERE id = XXXXX;
```

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Migration fails | Low | HIGH | Test locally first, use transaction |
| API crashes | Low | HIGH | Alert system, instant rollback |
| Data loss | Very low | CRITICAL | Daily backups + transaction safety |
| Weather API down | Medium | Low | Cache responses, fall-back to manual |
| Payment integration breaks | Low | HIGH | Fallback: manual payment entry |
| Booking conflicts | Low | Medium | Use UNIQUE constraints + locking |
| AI unavailable | Medium | Low | Just skip AI advice, normal flow works |

---

## SUCCESS CRITERIA

✅ PHASE 1 is complete when:

- [x] All tables created (0 errors)
- [x] All API endpoints working (200 responses)
- [x] Tests passing (>80% coverage)
- [x] UI responsive (mobile + desktop)
- [x] Weather monitoring running (cron every day)
- [x] Notifications working (email, telegram, SMS)
- [x] Staging stable for 48 hours (no crashes)
- [x] Operator can:
  - [x] Create & manage tours
  - [x] View live bookings
  - [x] See weather alerts
  - [x] Define contingency rules
  - [x] Get paid on bookings
  - [x] Ask AI for advice

---

## NEXT STEPS

1. ✅ Read this document completely
2. ✅ Approve or ask questions
3. ⏭ I start coding (migration + API + UI)
4. ⏭ Tests written
5. ⏭ Deploy to staging
6. ⏭ 2-3 days testing
7. ⏭ Code review
8. ⏭ Production deployment

---

**Questions or concerns? Ask before I start coding.** 🚀
