# Pillar-Cluster Architecture: Visual Reference

## System Diagram

```
╔═════════════════════════════════════════════════════════════════╗
║                    🌐 KamHub Platform                           ║
║                    (Multi-Role SaaS)                            ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│                   🧩 CORE INFRASTRUCTURE PILLAR                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  ┌────────┐ │
│  │ Authentication│  │  Database  │  │  AI/ML       │  │Caching │ │
│  │ (JWT/Sessions)│  │(PostgreSQL)│  │ (Search/REC) │  │(Redis) │ │
│  └──────────────┘  └───────────┘  └──────────────┘  └────────┘ │
│                                                                   │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  ┌────────┐ │
│  │  File Upload  │  │ Monitoring│  │  Webhooks    │  │Notifications│
│  │  (Storage)    │  │ (Sentry)  │  │ (Events)     │  │(Email/SMS) │
│  └──────────────┘  └───────────┘  └──────────────┘  └────────┘ │
│                                                                   │
│  Serves: All Pillars  |  Never Depends: Any Pillar              │
└─────────────────────────────────────────────────────────────────┘
                         ▲
         ┌───────────────┼───────────────┐
         │               │               │
         │               │               │
    ┌────┴────────┐ ┌───┴─────┐  ┌──────┴─────┐
    │              │         │         │
    │              │         │         │
┌───▼────────┐ ┌──▼──────┐ ┌─▼──────┐ ┌──▼──────┐
│🔍 DISCOVERY│ │💳 BOOKING│ │💬 ENGAGE │ │👥 PARTNER│
│  PILLAR    │ │ PILLAR   │ │ PILLAR  │ │  MGT     │
│            │ │          │ │         │ │ PILLAR   │
├────────────┤ ├──────────┤ ├─────────┤ ├──────────┤
│            │ │          │ │         │ │          │
│Clusters:   │ │Clusters: │ │Clusters:│ │Clusters: │
│ • Tours    │ │ • Cart   │ │ • Reviews│ │ • Admin  │
│ • Lodging  │ │ • Booking│ │ • Loyalty│ │ • Operator
│ • Cars     │ │ • Payments│ • Chat    │ │ • Agent  │
│ • Gear     │ │ • Transfers│ • Notify │ │ • Guide  │
│ • Weather  │ │          │ │         │ │          │
│ • Search   │ │          │ │         │ │          │
│            │ │          │ │         │ │          │
└────────────┘ └──────────┘ └─────────┘ └──────────┘
     ▲              ▲            ▲            △
     │              │            │            │
     └──────────────┴────────────┴────────────┘
         (All depend on Core Infrastructure)

         Discovery ──→ Booking ──→ Engagement
                       │
                       └──→ Partner Management
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                               │
└─────────────────────────────────────────────────────────────────┘

1️⃣  DISCOVERY PHASE
    ┌──────────────────────────────────────┐
    │  User enters homepage                 │
    │  Sees featured tours/accommodations   │
    │  Uses search bar                      │
    │                                      │
    │  GET /api/tours?q=kamchatka           │
    │  GET /api/weather/kamchatka           │
    │  GET /api/accommodations?near=...     │
    └──────────────────────────────────────┘
                    ▼

2️⃣  SELECTION PHASE
    ┌──────────────────────────────────────┐
    │  User clicks on tour card             │
    │  Reads details, reviews, pricing      │
    │  Checks availability                  │
    │                                      │
    │  GET /api/tours/123                   │
    │  GET /api/reviews?tourId=123          │
    │  GET /api/tours/123/availability      │
    └──────────────────────────────────────┘
                    ▼

3️⃣  CART & BOOKING PHASE
    ┌──────────────────────────────────────┐
    │  User adds to cart                    │
    │  Enters passenger details              │
    │  Proceeds to checkout                 │
    │                                      │
    │  POST /api/cart                       │
    │  POST /api/bookings { tourId, ... }   │
    │  Booking status: PENDING              │
    └──────────────────────────────────────┘
                    ▼

4️⃣  PAYMENT PHASE
    ┌──────────────────────────────────────┐
    │  User enters payment details          │
    │  Submits payment to CloudPayments     │
    │                                      │
    │  POST /api/payments                   │
    │  Returns: transaction_id              │
    │  Webhook: payment.completed           │
    └──────────────────────────────────────┘
                    ▼

5️⃣  CONFIRMATION PHASE
    ┌──────────────────────────────────────┐
    │  System updates booking: CONFIRMED    │
    │  Awards eco-points                    │
    │  Notifies operator                    │
    │  Sends confirmation email             │
    │                                      │
    │  PUT /api/bookings/123 {status:CONF}  │
    │  POST /api/loyalty/award              │
    │  POST /api/notifications              │
    └──────────────────────────────────────┘
                    ▼

6️⃣  OPERATOR MANAGEMENT PHASE
    ┌──────────────────────────────────────┐
    │  Operator sees new booking            │
    │  Assigns guide                        │
    │  Sends briefing to guide              │
    │                                      │
    │  GET /api/operator/bookings           │
    │  PUT /api/operator/bookings/123       │
    │  POST /api/notifications              │
    └──────────────────────────────────────┘
                    ▼

7️⃣  POST-TRIP ENGAGEMENT PHASE
    ┌──────────────────────────────────────┐
    │  User receives review request         │
    │  Submits rating and review            │
    │  Earns bonus eco-points               │
    │                                      │
    │  POST /api/reviews                    │
    │  POST /api/loyalty/award              │
    │  Updates tour rating                  │
    └──────────────────────────────────────┘

8️⃣  FINANCIAL SETTLEMENT PHASE
    ┌──────────────────────────────────────┐
    │  Admin generates finance reports      │
    │  Calculates operator/agent commission │
    │  Initiates payouts                    │
    │                                      │
    │  GET /api/admin/reports               │
    │  GET /api/admin/commissions           │
    │  POST /api/admin/payouts              │
    └──────────────────────────────────────┘
```

---

## Pillar Interaction Matrix

```
           │ Discovery │ Booking │ Engagement │ Partner Mgmt │ Core Infra
───────────┼───────────┼─────────┼────────────┼──────────────┼──────────
Discovery  │     ✓     │    →    │     →      │      →       │     ↑
───────────┼───────────┼─────────┼────────────┼──────────────┼──────────
Booking    │     ←     │    ✓    │     →      │      →       │     ↑
───────────┼───────────┼─────────┼────────────┼──────────────┼──────────
Engagement │     ←     │    ←    │     ✓      │      →       │     ↑
───────────┼───────────┼─────────┼────────────┼──────────────┼──────────
Partner Mgmt│    ←     │    ←    │     ←      │     ✓        │     ↑
───────────┼───────────┼─────────┼────────────┼──────────────┼──────────
Core Infra │     -     │    -    │     -      │      -       │     ✓

Legend:
✓  = Has internal logic
→  = Depends on (reads from, calls)
←  = Is depended upon
↑  = Required by all
-  = Cannot depend on itself

Rule: Only same-level or upward dependencies allowed!
```

---

## Component Ownership Map

```
┌───────────────────────────────────────────────────────────────────┐
│ DISCOVERY PILLAR - COMPONENTS                                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ components/
│ ├── AccommodationCard.tsx              ──→ Render lodging item   │
│ ├── AccommodationCardSkeleton.tsx      ──→ Loading state        │
│ ├── AccommodationFilters.tsx           ──→ Lodging search UI    │
│ ├── TourCard.tsx                       ──→ Render tour item     │
│ ├── search/ModernTourSearch.tsx        ──→ Main search widget   │
│ ├── search/SearchFilters.tsx           ──→ Filter controls      │
│ ├── search/SearchIcons.tsx             ──→ Filter icons         │
│ ├── TransferSearchWidget.tsx           ──→ Transfer search      │
│ ├── TransferMap.tsx                    ──→ Map visualization    │
│ ├── WeatherWidget.tsx                  ──→ Weather display      │
│ ├── FloatingAIButton.tsx               ──→ AI assistant         │
│ ├── AISmartSearch.tsx                  ──→ AI search interface  │
│ └── PremiumSearchBar.tsx               ──→ Premium search UI    │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ BOOKING PILLAR - COMPONENTS                                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ components/
│ ├── booking/                                                       │
│ │   └── (BookingForm, CheckoutFlow, PaymentGateway - create!)    │
│ ├── payments/PaymentWidget.tsx         ──→ Payment UI           │
│                                                                  │
│ app/
│ └── cart/                              ──→ /cart page           │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ ENGAGEMENT PILLAR - COMPONENTS                                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ components/
│ ├── reviews/ReviewForm.tsx             ──→ Submit review        │
│ ├── reviews/ReviewsList.tsx            ──→ Display reviews      │
│ ├── EcoPointsWidget.tsx                ──→ Points balance       │
│ ├── LoyaltyWidget.tsx                  ──→ Loyalty program      │
│ ├── AIChatWidget.tsx                   ──→ AI support chat      │
│ ├── RoleAssistantWidget.tsx            ──→ Role-specific help   │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ PARTNER MANAGEMENT PILLAR - COMPONENTS                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ components/
│ ├── admin/
│ │   ├── AdminDashboard.tsx             ──→ Admin overview       │
│ │   ├── UserManagement.tsx             ──→ User CRUD            │
│ │   └── ContentModeration.tsx          ──→ Content review       │
│ ├── operator/
│ │   ├── OperatorDashboard.tsx          ──→ Operator overview    │
│ │   ├── TourManagement.tsx             ──→ Tour CRUD            │
│ │   └── BookingsList.tsx               ──→ Bookings list        │
│ ├── agent/
│ │   ├── AgentDashboard.tsx             ──→ Agent overview       │
│ │   ├── ClientManagement.tsx           ──→ Client CRUD          │
│ │   └── (VoucherSystem - create!)      ──→ Voucher management   │
│ ├── guide/
│ │   └── GuideAssignment.tsx            ──→ Guide assignment     │
│ └── transfer-operator/                 ──→ Transfer management  │
│                                                                  │
│ app/
│ ├── admin/                             ──→ /admin page          │
│ └── partner/                           ──→ /partner dashboard   │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ CORE INFRASTRUCTURE PILLAR - COMPONENTS                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ components/
│ ├── Protected.tsx                      ──→ Auth wrapper         │
│ ├── AdminProtected.tsx                 ──→ Admin auth wrapper   │
│ ├── RegistrationButtons.tsx            ──→ Auth UI              │
│ ├── ThemeToggle.tsx                    ──→ Theme switcher       │
│ ├── FloatingNav.tsx                    ──→ Navigation           │
│                                                                  │
│ app/
│ ├── auth/                              ──→ /auth/* pages        │
│ └── profile/                           ──→ /profile/* pages     │
│                                                                  │
│ lib/
│ ├── auth/                              ──→ Auth logic           │
│ ├── database/                          ──→ Database layer       │
│ ├── monitoring/                        ──→ System monitoring    │
│ └── ai/                                ──→ ML services          │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Organization

```
Core Infrastructure APIs
├── /api/auth/
│   ├── POST   login
│   ├── POST   register
│   ├── POST   logout
│   ├── POST   refresh
│   └── GET    me
├── /api/roles/
│   └── GET    {userId}
├── /api/health/
│   └── GET    status
├── /api/upload/
│   └── POST   file
└── /api/webhooks/
    └── POST   event

Discovery APIs
├── /api/tours/
│   ├── GET    (with filters)
│   ├── GET    {id}
│   └── GET    {id}/availability
├── /api/accommodations/
│   ├── GET    (with filters)
│   └── GET    {id}
├── /api/cars/
│   ├── GET    (with filters)
│   └── GET    {id}
├── /api/gear/
│   ├── GET    (with filters)
│   └── GET    {id}
├── /api/weather/
│   └── GET    {location}
├── /api/transfers/
│   ├── GET    (with filters)
│   └── GET    {id}
└── /api/search/
    └── POST   query

Booking APIs
├── /api/bookings/
│   ├── POST   (create)
│   ├── GET    {id}
│   ├── PUT    {id} (update status)
│   ├── DELETE {id} (cancel)
│   └── GET    (user's bookings)
├── /api/payments/
│   ├── POST   process
│   └── GET    {id}/status
└── /api/cart/
    ├── POST   add-item
    ├── DELETE {id}
    └── GET    

Engagement APIs
├── /api/reviews/
│   ├── POST   (create)
│   ├── GET    {id}
│   ├── PUT    {id} (edit)
│   └── GET    tour/{tourId}
├── /api/eco-points/
│   ├── GET    {userId}
│   └── GET    history
├── /api/loyalty/
│   ├── GET    status
│   ├── POST   redeem
│   └── GET    rewards
├── /api/chat/
│   ├── WebSocket connect
│   └── POST   message
└── /api/notifications/
    ├── GET    {userId}
    ├── POST   mark-read
    └── POST   preferences

Partner Management APIs
├── /api/admin/
│   ├── GET    users
│   ├── PUT    users/{id}
│   ├── DELETE users/{id}
│   ├── GET    content-moderation
│   ├── GET    reports
│   └── GET    analytics
├── /api/operator/
│   ├── GET    tours
│   ├── POST   tours (create)
│   ├── PUT    tours/{id}
│   ├── DELETE tours/{id}
│   ├── GET    bookings
│   ├── PUT    bookings/{id}
│   ├── GET    availability
│   ├── GET    reports
│   ├── GET    commission
│   └── GET    schedule
├── /api/agent/
│   ├── GET    clients
│   ├── POST   clients (create)
│   ├── PUT    clients/{id}
│   ├── GET    vouchers
│   ├── POST   vouchers (create)
│   ├── GET    bookings
│   ├── GET    commission
│   └── GET    reports
└── /api/guide/
    ├── GET    assignments
    ├── PUT    assignments/{id}
    └── GET    schedule
```

---

## Database Schema Organization

```
PostgreSQL Database: kamhub

Core Tables (Core Infrastructure Pillar)
├── users
│   ├── id (PK)
│   ├── email
│   ├── password_hash
│   ├── first_name
│   ├── last_name
│   ├── role (enum: user, admin, operator, agent, guide)
│   └── created_at
│
├── user_preferences
│   ├── id (PK)
│   ├── user_id (FK)
│   ├── theme
│   └── language
│
├── permissions
│   ├── id (PK)
│   ├── role
│   ├── resource
│   └── action
│
└── audit_logs
    ├── id (PK)
    ├── user_id (FK)
    ├── action
    ├── resource
    └── timestamp

Discovery Tables
├── tours
│   ├── id (PK)
│   ├── operator_id (FK)
│   ├── title
│   ├── description
│   ├── price
│   ├── duration
│   ├── difficulty
│   ├── max_participants
│   ├── location
│   └── created_at
│
├── accommodations
│   ├── id (PK)
│   ├── partner_id (FK)
│   ├── name
│   ├── location
│   ├── price_per_night
│   ├── capacity
│   └── amenities
│
├── car_rentals
│   ├── id (PK)
│   ├── partner_id (FK)
│   ├── model
│   ├── price_per_day
│   └── features
│
└── gear_rentals
    ├── id (PK)
    ├── partner_id (FK)
    ├── item_name
    ├── price_per_day
    └── quantity_available

Booking Tables
├── bookings
│   ├── id (PK)
│   ├── user_id (FK)
│   ├── tour_id (FK)
│   ├── status (enum: pending, confirmed, completed, cancelled)
│   ├── total_amount
│   ├── created_at
│   └── updated_at
│
├── transactions
│   ├── id (PK)
│   ├── booking_id (FK)
│   ├── amount
│   ├── payment_method
│   ├── status (enum: pending, completed, failed)
│   ├── external_id (CloudPayments)
│   └── timestamp
│
└── cart_items
    ├── id (PK)
    ├── user_id (FK)
    ├── tour_id (FK)
    ├── quantity
    ├── price
    └── expires_at

Engagement Tables
├── reviews
│   ├── id (PK)
│   ├── booking_id (FK)
│   ├── user_id (FK)
│   ├── tour_id (FK)
│   ├── rating (1-5)
│   ├── text
│   └── created_at
│
├── eco_points_transactions
│   ├── id (PK)
│   ├── user_id (FK)
│   ├── reason (enum: booking, review, referral)
│   ├── amount
│   ├── booking_id (FK nullable)
│   └── created_at
│
├── notifications
│   ├── id (PK)
│   ├── user_id (FK)
│   ├── type
│   ├── content
│   ├── read_at
│   └── created_at
│
└── chat_messages
    ├── id (PK)
    ├── user_id (FK)
    ├── operator_id (FK nullable)
    ├── content
    ├── created_at
    └── read_at

Partner Management Tables
├── operators (extends users)
│   ├── id (PK, FK to users)
│   ├── commission_percent
│   ├── rating
│   ├── verified
│   └── created_at
│
├── operator_tours
│   ├── id (PK)
│   ├── operator_id (FK)
│   ├── tour_id (FK)
│   ├── available_seats
│   ├── price_markup
│   └── status
│
├── agents (extends users)
│   ├── id (PK, FK to users)
│   ├── commission_rate
│   ├── total_clients
│   ├── verified
│   └── created_at
│
├── agent_clients
│   ├── id (PK)
│   ├── agent_id (FK)
│   ├── user_id (FK)
│   ├── commission_split
│   └── status
│
├── agent_vouchers
│   ├── id (PK)
│   ├── agent_id (FK)
│   ├── code
│   ├── discount_percent
│   ├── used_count
│   └── expires_at
│
├── guides (extends users)
│   ├── id (PK, FK to users)
│   ├── certification
│   ├── languages
│   └── verified
│
└── guide_assignments
    ├── id (PK)
    ├── guide_id (FK)
    ├── booking_id (FK)
    ├── tour_id (FK)
    ├── assigned_at
    └── status
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT TOPOLOGY                          │
└─────────────────────────────────────────────────────────────────┘

Current: MONOLITHIC (Single Next.js App)

┌──────────────────────────────┐
│   Docker Container           │
│  ┌──────────────────────────┤
│  │ Next.js Server           │
│  │ ┌──────────────────────┐ │
│  │ │ All 5 Pillars        │ │
│  │ │ (Code organized but   │ │
│  │ │  running together)    │ │
│  │ └──────────────────────┘ │
│  └──────────────────────────┤
│
├──PostgreSQL Database──────────┤
│ (Shared across all pillars)   │
├──────────────────────────────┤
│
├──Redis Cache─────────────────┤
│ (Shared cache layer)         │
└──────────────────────────────┘

Future: MICROSERVICES (If scaling needed)

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Discovery    │   │   Booking    │   │  Engagement  │
│ Service      │   │   Service    │   │  Service     │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
                   ┌────────┼────────┐
                   │                 │
            ┌──────▼────────┐  ┌─────▼──────┐
            │ Partner Mgmt  │  │Core Services│
            │  Service      │  │(Auth, DB)   │
            └───────────────┘  └─────────────┘

Benefits:
- Independent scaling per pillar
- Separate databases (if needed)
- Polyglot services (different languages)
- Fault isolation
- Faster deployment cycles
```

---

## Technology Stack by Pillar

```
┌────────────────────────────────────────────────────────┐
│                 FULL STACK                             │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Frontend (All Pillars)                                 │
│ ├── React 18+                                          │
│ ├── TypeScript                                         │
│ ├── Tailwind CSS                                       │
│ ├── Next.js 13+ (App Router)                           │
│ └── Context API + Hooks                               │
│                                                         │
│ Backend (All Pillars)                                  │
│ ├── Node.js + Express (via Next.js API Routes)        │
│ ├── TypeScript                                         │
│ ├── PostgreSQL                                         │
│ ├── Redis                                              │
│ ├── Prisma/Drizzle (ORM)                               │
│ └── NextAuth.js (Auth)                                │
│                                                         │
│ Discovery Pillar Specific                              │
│ ├── Algolia/Typesense (Search)                         │
│ ├── Leaflet/Mapbox (Maps)                              │
│ ├── OpenWeatherMap API                                 │
│ └── Elasticsearch (Optional)                           │
│                                                         │
│ Booking Pillar Specific                                │
│ ├── CloudPayments API                                  │
│ ├── Stripe (Alternative)                              │
│ └── Bull/BullMQ (Job Queue)                            │
│                                                         │
│ Engagement Pillar Specific                             │
│ ├── Socket.io (WebSocket for Chat)                     │
│ ├── SendGrid/Mailgun (Email)                           │
│ ├── Twilio (SMS notifications)                         │
│ └── Firebase Push Notifications                        │
│                                                         │
│ Partner Mgmt Pillar Specific                           │
│ ├── Recharts/Chart.js (Analytics)                      │
│ ├── Formik/React Hook Form (Forms)                     │
│ └── React Table (Data tables)                          │
│                                                         │
│ Core Infrastructure Specific                           │
│ ├── JWT (jsonwebtoken)                                 │
│ ├── Sentry (Error tracking)                            │
│ ├── Winston (Logging)                                  │
│ ├── OpenAI API (AI/ML)                                 │
│ └── S3/Local Storage (File upload)                     │
│                                                         │
│ Testing (All Pillars)                                  │
│ ├── Jest                                               │
│ ├── React Testing Library                              │
│ ├── Vitest                                             │
│ ├── Playwright (E2E)                                   │
│ └── Cypress (Alternative)                              │
│                                                         │
│ Monitoring & Deployment                                │
│ ├── Docker                                             │
│ ├── Kubernetes (Optional)                              │
│ ├── GitHub Actions                                     │
│ ├── Vercel/Timeweb (Hosting)                           │
│ ├── Sentry (Error tracking)                            │
│ └── Datadog/New Relic (APM)                            │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

**This visual guide should be referenced alongside the main architecture document for quick lookups during development.**
