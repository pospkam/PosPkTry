# Pillar-Cluster Architecture for KamHub

## Overview

KamHub is a comprehensive tourism and adventure platform with multi-role support (Admin, Operator, Agent, User). This document defines a **pillar-cluster** architecture that organizes the codebase into autonomous, interconnected systems.

### Architecture Principles

- **Pillars**: Core business domains (independent vertical slices)
- **Clusters**: Functional groupings within each pillar
- **Dependencies**: Clear, unidirectional flow between pillars
- **Scalability**: Each pillar can scale independently
- **Ownership**: Clear responsibility per pillar

---

## 🏗️ Five Core Pillars

### 1. **Discovery Pillar** (User Journey Start)
**Primary Responsibility**: Help users find and explore offerings

**Clusters**:
- `search/` - Search engine, filters, AI-powered discovery
- `tours/` - Tour catalog, metadata, content management
- `accommodations/` - Lodging options, availability, rates
- `cars/` - Vehicle rentals, fleet management
- `gear/` - Equipment rentals for adventures
- `transfers/` - Transport logistics and planning
- `weather/` - Environmental context and alerts

**Key Components**:
- `lib/ai/` - AI search and recommendations
- `lib/maps/` - Geolocation and mapping services
- `components/search/` - UI search interfaces
- `contexts/` - State management for discovery

**APIs**: `/api/tours`, `/api/accommodations`, `/api/cars`, `/api/gear`, `/api/weather`

**Downstreams**: Booking Pillar, Engagement Pillar

---

### 2. **Booking Pillar** (Transaction Core)
**Primary Responsibility**: Handle bookings, reservations, and transaction processing

**Clusters**:
- `bookings/` - Core booking orchestration
- `payments/` - Payment processing, CloudPayments integration
- `cart/` - Cart management and checkout
- `transfers/` - Transfer booking workflows

**Key Components**:
- `components/booking/` - Booking UI components
- `lib/payments/` - Payment processor abstraction
- `database/` - Transaction persistence schemas

**APIs**: `/api/bookings`, `/api/payments`, `/api/cart`, `/api/transfer-operator`

**Upstreams**: Discovery Pillar
**Downstreams**: Engagement Pillar, Partner Management Pillar

---

### 3. **Engagement Pillar** (Loyalty & Community)
**Primary Responsibility**: Keep users connected, rewarded, and engaged

**Clusters**:
- `reviews/` - User reviews and ratings system
- `loyalty/` - Eco-points, rewards, membership programs
- `chat/` - Communication and support channels
- `notifications/` - User alerts and messaging

**Key Components**:
- `components/reviews/` - Review submission and display
- `lib/loyalty/` - Points calculation and redemption
- `lib/notifications/` - Notification delivery
- `contexts/` - Engagement state management

**APIs**: `/api/reviews`, `/api/eco-points`, `/api/loyalty`, `/api/chat`, `/api/notifications`

**Upstreams**: Discovery Pillar, Booking Pillar
**Downstreams**: Analytics (indirect)

---

### 4. **Partner Management Pillar** (B2B Operations)
**Primary Responsibility**: Empower partners to manage their offerings and commissions

**Clusters**:
- `admin/` - Platform administration and content moderation
- `operator/` - Tour operator dashboard and tour management
- `agent/` - Travel agent commission and client management
- `guide/` - Tour guide assignments and briefings

**Key Components**:
- `components/admin/` - Admin UI and dashboards
- `components/operator/` - Operator-specific interfaces
- `components/agent/` - Agent client and voucher management
- `types/admin.ts`, `types/operator.ts`, `types/agent.ts` - Role-specific data models

**APIs**: 
- `/api/admin/*` - Platform administration
- `/api/operator/*` - Operator operations
- `/api/agent/*` - Agent operations
- `/api/guide/` - Guide management

**Upstreams**: Booking Pillar
**Downstreams**: None (terminal pillar for partner data)

---

### 5. **Core Infrastructure Pillar** (Cross-Cutting)
**Primary Responsibility**: Provide foundational services to all pillars

**Clusters**:
- `auth/` - Authentication and authorization (JWT, sessions)
- `users/` - User profiles and preferences
- `monitoring/` - System health, Sentry integration
- `ai/` - AI/ML services (smart search, recommendations)
- `upload/` - File and asset management
- `webhooks/` - Event distribution and integrations
- `trip-planner/` - Multi-leg journey orchestration

**Key Components**:
- `middleware.ts` - Request processing, auth validation
- `lib/auth/` - Authentication logic
- `lib/monitoring/` - Performance tracking
- `lib/ai/` - ML models and inference
- `lib/cache.ts` - Caching layer (Redis)
- `lib/database.ts` - Database abstraction

**APIs**: 
- `/api/auth/*` - Authentication endpoints
- `/api/roles/` - Role management
- `/api/health/` - System health checks
- `/api/upload/` - File upload
- `/api/monitoring/` - Metrics and logs
- `/api/webhooks/` - Event handling

**Special Role**: Serves all pillars; has no upstreams

---

## 🔄 Data Flow & Dependencies

```
┌─────────────────────────────────────────────────────────┐
│         Core Infrastructure Pillar                      │
│  (Auth, Users, AI, Monitoring, Cache, Database)        │
└─────────────────────────────────────────────────────────┘
                        ▲
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌───┴────┐
    │Discovery │───▶│ Booking │───▶│Engagement│
    │ Pillar   │    │ Pillar  │   │ Pillar   │
    └──────────┘    └────┬────┘   └──────────┘
                         │
                    ┌────▼──────┐
                    │  Partner   │
                    │ Management │
                    │  Pillar    │
                    └────────────┘
```

### Dependency Rules (Strict)

1. **Discovery → Booking**: User selects item, creates booking
2. **Booking → Engagement**: After booking confirmed, trigger reviews/rewards
3. **Booking → Partner Management**: Operators/Agents manage their bookings
4. **All → Core Infrastructure**: All pillars depend on auth, cache, database
5. **No Backwards Dependencies**: Lower pillars cannot depend on upper ones

---

## 📁 Directory Structure Mapping

```
kamhub/
├── app/
│   ├── admin/               # Partner Management - Admin
│   ├── api/
│   │   ├── auth/           # Core Infrastructure
│   │   ├── tours/          # Discovery
│   │   ├── bookings/       # Booking
│   │   ├── payments/       # Booking
│   │   ├── reviews/        # Engagement
│   │   ├── loyalty/        # Engagement
│   │   ├── operator/       # Partner Management
│   │   ├── agent/          # Partner Management
│   │   └── ...
│   ├── accommodations/     # Discovery
│   ├── cars/              # Discovery
│   ├── gear/              # Discovery
│   ├── guide/             # Partner Management
│   ├── partner/           # Partner Management
│   ├── profile/           # Core Infrastructure
│   ├── shop/              # Discovery / Engagement
│   ├── tours/             # Discovery
│   ├── search/            # Discovery
│   └── auth/              # Core Infrastructure
│
├── components/
│   ├── admin/             # Partner Management UI
│   ├── agent/             # Partner Management UI
│   ├── booking/           # Booking UI
│   ├── reviews/           # Engagement UI
│   ├── shared/            # Reusable UI across all
│   ├── transfer-operator/ # Partner Management UI
│   └── ...
│
├── lib/
│   ├── auth/              # Core Infrastructure
│   ├── ai/                # Core Infrastructure
│   ├── payments/          # Booking
│   ├── loyalty/           # Engagement
│   ├── weather/           # Discovery
│   ├── maps/              # Discovery
│   ├── notifications/     # Engagement
│   ├── monitoring/        # Core Infrastructure
│   ├── transfers/         # Discovery/Booking
│   └── database/          # Core Infrastructure
│
├── types/
│   ├── index.ts           # Core entities (User, Tour, Booking)
│   ├── admin.ts           # Partner Management
│   ├── operator.ts        # Partner Management
│   ├── agent.ts           # Partner Management
│   └── ...
│
├── database/
│   ├── transfer_operator_complete_schema.sql  # Partner Management
│   ├── gear_rentals_schema.sql               # Discovery
│   ├── car_rentals_schema.sql                # Discovery
│   └── souvenirs_orders_schema.sql           # Engagement/Discovery
│
├── contexts/              # React Context - organized by pillar
│   └── (Distributed across pillar modules)
│
├── hooks/                 # React Hooks - cross-cutting
├── middleware.ts          # Core Infrastructure
└── public/               # Static assets
```

---

## 🎯 Module Ownership Matrix

| Pillar | Modules | Primary Owner Concern | Data Models | APIs Count |
|--------|---------|----------------------|-------------|-----------|
| **Discovery** | search, tours, accommodations, cars, gear, transfers, weather | Finding items | Tour, Accommodation, Car, Gear | 7 |
| **Booking** | bookings, payments, cart | Processing transactions | Booking, Transaction, Invoice | 4 |
| **Engagement** | reviews, loyalty, chat, notifications | User retention | Review, EcoPoint, LoyaltyCard | 4 |
| **Partner Management** | admin, operator, agent, guide | Partner operations | AdminMetrics, OperatorMetrics, Agent | 4 |
| **Core Infrastructure** | auth, users, monitoring, ai, upload, webhooks, trip-planner | System foundation | User, Permission, Log, WebhookEvent | 7 |

---

## 🔌 Critical Integration Points

### 1. **Discovery → Booking**
- User selects tour/accommodation/car from discovery
- System creates booking with availability check
- Transition: `/api/tours/{id}` → `/api/bookings` (POST)

### 2. **Booking → Engagement**
- After payment confirmed, trigger:
  - Create loyalty transaction
  - Enable review submission
  - Send notification
- Webhooks: `payment.completed` → engagement services

### 3. **Booking → Partner Management**
- Operator sees new tour bookings in `/operator/bookings`
- Agent sees new customer commits in `/agent/clients`
- Admin moderates all transactions in `/admin/dashboard`

### 4. **Core Infrastructure → All**
- Every request validated through `middleware.ts` (auth)
- User context available via `lib/auth`
- Caching via `lib/cache.ts`
- Logging via `lib/monitoring.ts`

---

## 📊 Data Models by Pillar

### Core Entities (Index Pillar)
```typescript
User → UserPreferences
Tour → Partner
Booking → Review
Asset → GeoPoint
Weather → WeatherForecast
```

### Partner Management Entities
```typescript
AdminUser → AdminAlert → DashboardMetrics
OperatorMetrics → OperatorTour → AvailabilitySlot
AgentMetrics → VoucherUsage → AgentCommission
```

### Booking Entities
```typescript
Transaction → PayoutRequest
FinanceReport
```

---

## 🚀 Deployment Strategy

### Independent Scalability
- **Discovery Pillar**: Scale with read-heavy traffic (search, filters)
- **Booking Pillar**: Scale with transaction volume (payment processing)
- **Partner Management**: Scale with seat count (operator/agent concurrent users)
- **Core Infrastructure**: Shared services with vertical scaling

### Microservices Ready
Current monolithic structure can split into:
1. `discovery-service` (tours, accommodations, cars, gear)
2. `booking-service` (payments, carts, transactions)
3. `engagement-service` (reviews, loyalty, notifications)
4. `partner-service` (admin, operator, agent dashboards)
5. `core-service` (auth, users, AI, monitoring)

---

## ✅ Implementation Checklist

- [ ] Rename/reorganize components to match pillar structure
- [ ] Establish clear import rules (no cross-pillar cycles)
- [ ] Create pillar-specific context providers
- [ ] Document API endpoints per pillar
- [ ] Establish naming conventions (prefixes: `discovery-`, `booking-`, etc.)
- [ ] Create `ARCHITECTURE.md` in each pillar folder
- [ ] Set up ESLint rules to enforce dependencies
- [ ] Create pillar-specific testing suites
- [ ] Document data ownership per pillar

---

## 🔐 Access Control by Pillar

| Pillar | Public | Authenticated | Admin | Partner |
|--------|--------|---------------|-------|---------|
| Discovery | ✅ | ✅ | ✅ | ✅ |
| Booking | ✅* | ✅ | ✅ | ✅** |
| Engagement | ✅ | ✅ | ✅ | ✅** |
| Partner Mgmt | ❌ | ✅*** | ✅ | ✅**** |
| Core Infra | ❌ | ✅ | ✅ | ❌ |

* Authenticated for purchase
** Own bookings only
*** Own organization only
**** Own data only

---

## 📈 Performance Optimization per Pillar

| Pillar | Strategy |
|--------|----------|
| **Discovery** | Aggressive caching, search indexing, CDN for assets |
| **Booking** | Transaction isolation, queue for async ops, rate limiting |
| **Engagement** | Event streaming, denormalized reads, eventual consistency |
| **Partner Mgmt** | Session affinity, real-time dashboards via WebSocket |
| **Core Infra** | Connection pooling, JWT caching, distributed sessions |

---

## 🎓 Getting Started

1. **Review this architecture** with your team
2. **Map existing code** to pillars (already done above)
3. **Identify cross-pillar violations** in current code
4. **Establish linting rules** to enforce architecture
5. **Create isolated test suites** per pillar
6. **Document new modules** with pillar assignment

---

## 🔄 Evolution Path

### Phase 1 (Current): Logical Separation
- Organize code by pillar within monolith
- Establish clear dependency rules
- Create pillar-specific test suites

### Phase 2 (Scaling): Service Boundaries
- Separate databases per pillar
- Independent deployment pipelines
- API gateways between services

### Phase 3 (Optimization): Microservices
- One container per pillar service
- Event-driven architecture
- Domain-driven design patterns

---

## 📞 Contact & Maintenance

- **Architecture Review**: Quarterly
- **Breaking Changes**: Require pillar owner approval
- **New Pillars**: Created only after strategic review
- **Cross-Pillar Deps**: Escalate as technical debt

---

Generated: 2026-01-27
System: KamHub Tourism Platform
Architecture Style: Pillar-Cluster (Event-Driven with Business Domain Separation)
