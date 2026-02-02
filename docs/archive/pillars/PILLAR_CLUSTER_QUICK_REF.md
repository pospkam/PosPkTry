# Pillar-Cluster Architecture: Quick Reference Card

## Pillar at a Glance

### 🔍 Discovery Pillar
- **What**: Find & explore offerings
- **Where**: `app/tours/`, `app/accommodations/`, `app/search/`, `lib/ai/`, `lib/maps/`, `lib/weather/`
- **Who**: All users
- **APIs**: `/api/tours/`, `/api/accommodations/`, `/api/cars/`, `/api/weather/`
- **Owns**: Tours, lodging, cars, gear, weather, search logic
- **Depends On**: Core Infrastructure
- **Key Files**: `components/search/`, `components/TourCard.tsx`, `types/index.ts`

### 💳 Booking Pillar
- **What**: Process purchases
- **Where**: `app/api/bookings/`, `app/cart/`, `lib/payments/`
- **Who**: Authenticated users, admin
- **APIs**: `/api/bookings/`, `/api/payments/`, `/api/cart/`
- **Owns**: Carts, bookings, payments, transactions
- **Depends On**: Core Infrastructure, Discovery (read-only)
- **Key Files**: `components/booking/`, `lib/payments/`, `types/index.ts`

### 💬 Engagement Pillar
- **What**: Keep users engaged & loyal
- **Where**: `app/api/reviews/`, `app/api/loyalty/`, `lib/loyalty/`, `components/reviews/`
- **Who**: Authenticated users
- **APIs**: `/api/reviews/`, `/api/loyalty/`, `/api/chat/`, `/api/eco-points/`
- **Owns**: Reviews, eco-points, loyalty, chat, notifications
- **Depends On**: Core Infrastructure, Booking, Discovery (read-only)
- **Key Files**: `components/reviews/`, `lib/loyalty/`, `types/index.ts`

### 👥 Partner Management Pillar
- **What**: Partner dashboards & operations
- **Where**: `app/admin/`, `app/partner/`, `components/admin/`, `components/operator/`, `components/agent/`
- **Who**: Admins, operators, agents, guides
- **APIs**: `/api/admin/`, `/api/operator/`, `/api/agent/`, `/api/guide/`
- **Owns**: Admin metrics, operator tours, agent clients, guide assignments
- **Depends On**: Core Infrastructure, Booking, Discovery, Engagement (read-only)
- **Key Files**: `types/admin.ts`, `types/operator.ts`, `types/agent.ts`

### 🏗️ Core Infrastructure Pillar
- **What**: Foundation services
- **Where**: `lib/auth/`, `lib/database/`, `middleware.ts`, `app/api/auth/`
- **Who**: Everyone (transparent)
- **APIs**: `/api/auth/`, `/api/roles/`, `/api/upload/`, `/api/health/`
- **Owns**: Authentication, users, caching, monitoring, webhooks
- **Depends On**: Nothing
- **Key Files**: `middleware.ts`, `lib/auth/`, `lib/database.ts`, `types/index.ts`

---

## Dependency Rules (Golden Rule)

```
ALLOWED (one-way):
  Discovery ──→ Core
  Booking ──→ Discovery (read-only) + Core
  Engagement ──→ Booking (read-only) + Discovery (read-only) + Core
  Partner Mgmt ──→ All others (read-only) + Core
  Core ──→ Nothing

FORBIDDEN (reverse):
  Core ←── Anyone (will break entire platform)
  Partner Mgmt imports directly from other pillars ❌
  Cross-pillar imports (Discovery ↔ Booking) ❌
  Circular dependencies ❌
```

---

## File Location Guide

### Adding Discovery Feature
```
components/search/NewSearch.tsx    → Component
app/tours/page.tsx                 → Page/route
lib/ai/newLogic.ts                 → Business logic
types/index.ts                     → Add Tour-related types
app/api/tours/route.ts             → API endpoint
database/                          → Add migration
```

### Adding Booking Feature
```
components/booking/NewBooking.tsx  → Component
app/api/bookings/route.ts          → API endpoint
lib/payments/newPayment.ts         → Payment logic
types/index.ts                     → Add Booking-related types
app/cart/page.tsx                  → Cart page
```

### Adding Engagement Feature
```
components/reviews/NewReview.tsx   → Component
app/api/reviews/route.ts           → API endpoint
lib/loyalty/newLogic.ts            → Loyalty logic
types/index.ts                     → Add Review-related types
```

### Adding Partner Management Feature
```
components/admin/NewAdmin.tsx      → Admin component
components/operator/NewOp.tsx      → Operator component
components/agent/NewAgent.tsx      → Agent component
app/api/admin/route.ts             → Admin API
app/api/operator/route.ts          → Operator API
types/admin.ts                     → Admin-specific types
types/operator.ts                  → Operator-specific types
```

### Adding Core Infrastructure
```
lib/auth/newAuth.ts                → Auth logic
lib/database/newDb.ts              → Database layer
middleware.ts                      → Request middleware
app/api/auth/route.ts              → Auth endpoint
types/index.ts                     → Core types
```

---

## Import Patterns

### ✅ GOOD

```typescript
// In Discovery component
import { searchTours } from '@/lib/ai/search'              // Same pillar ✅
import { User } from '@/types'                             // Core types ✅
import { useAuth } from '@/lib/auth'                       // Core service ✅

// In Booking component
import { getTourFromAPI } from '@/api/tours'               // API call ✅
import { processPayment } from '@/lib/payments'            // Same pillar ✅
import { User } from '@/types'                             // Core types ✅

// In Partner Management
import { fetchBookingAPI } from '@/api/bookings'           // API call ✅
import { getOperatorMetrics } from '@/lib'                 // Same pillar ✅
import { useAuth } from '@/lib/auth'                       // Core service ✅

// Between pillars (CORRECT WAY)
const tour = await fetch('/api/tours/123').then(r => r.json())  // API ✅
```

### ❌ BAD

```typescript
// In Discovery component
import { processPayment } from '@/lib/payments'            // ❌ Wrong pillar
import { OperatorDashboard } from '@/components/operator'  // ❌ Wrong pillar

// In Booking component
import { TourSearch } from '@/components/search'           // ❌ Direct import
import { useLoyalty } from '@/lib/loyalty'                 // ❌ Wrong pillar

// In Core Infrastructure
import { getTours } from '@/lib/discovery'                 // ❌ Core shouldn't import pillars

// Direct circular
import { createBooking } from '@/lib/booking'              // In Discovery ❌
import { getTourDetails } from '@/lib/discovery'           // In Booking (both ways) ❌
```

---

## API Endpoint Cheat Sheet

### Discovery APIs
```
GET /api/tours?q=skiing&difficulty=hard
GET /api/tours/123
GET /api/tours/123/availability
GET /api/accommodations?location=kamchatka
GET /api/cars?from=date&to=date
GET /api/weather/kamchatka
GET /api/search
```

### Booking APIs
```
POST /api/bookings { tourId, dates, passengers }
GET /api/bookings/123
PUT /api/bookings/123 { status }
DELETE /api/bookings/123 (cancel)
POST /api/payments { bookingId, amount }
GET /api/cart
POST /api/cart { tourId, quantity }
DELETE /api/cart/123
```

### Engagement APIs
```
POST /api/reviews { bookingId, rating, text }
GET /api/reviews?tourId=123
POST /api/loyalty/redeem { pointsAmount }
GET /api/eco-points/user/123
GET /api/notifications/user/123
POST /api/chat { message }
```

### Partner APIs
```
GET /api/admin/users
GET /api/admin/reports
GET /api/operator/tours
PUT /api/operator/tours/123
GET /api/operator/bookings
GET /api/agent/clients
POST /api/agent/vouchers
GET /api/guide/assignments
```

### Core Infrastructure APIs
```
POST /api/auth/login { email, password }
POST /api/auth/register { ... }
GET /api/auth/me
POST /api/auth/logout
GET /api/roles/user/123
POST /api/upload
GET /api/health
POST /api/webhooks/event
```

---

## TypeScript Types by Pillar

### Core Types (everyone can import)
```typescript
import { User, Tour, Booking, Review, Asset, GeoPoint } from '@/types'
```

### Discovery Types
```typescript
// In discovery code only
import { Tour, Accommodation, Car, Gear, Weather } from '@/types'
```

### Booking Types
```typescript
// In booking code only
import { Booking, Transaction, Invoice } from '@/types'
```

### Engagement Types
```typescript
// In engagement code only
import { Review, EcoPoint, Notification } from '@/types'
```

### Partner Management Types
```typescript
// In partner code only
import { AdminMetrics, OperatorMetrics, AgentMetrics } from '@/types/admin'
import { OperatorTour, AvailabilitySlot } from '@/types/operator'
import { AgentClient, Voucher } from '@/types/agent'
```

---

## Testing Strategy by Pillar

### Unit Tests
```bash
# Discovery
npm test -- components/search/SearchFilters.test.tsx

# Booking
npm test -- lib/payments/cloudpayments.test.ts

# Engagement
npm test -- lib/loyalty/pointsCalculator.test.ts
```

### Integration Tests (Within Pillar)
```bash
# Full booking flow
npm test -- api/bookings/booking.integration.test.ts
```

### Integration Tests (Between Pillars - Careful!)
```bash
# Only at pillar boundaries via APIs
npm test -- e2e/discovery-to-booking.test.ts
```

### Run All Tests Per Pillar
```bash
npm run test:discovery
npm run test:booking
npm run test:engagement
npm run test:partner
npm run test:core
```

---

## Common Tasks Checklist

### Adding a new tour search filter
- [ ] Add field to `Tour` type in `types/index.ts`
- [ ] Update `SearchFilters.tsx` component
- [ ] Update `searchTours()` function in `lib/ai/search.ts`
- [ ] Update `GET /api/tours` query params
- [ ] Add test for new filter
- [ ] Run `npm run lint:discovery`

### Adding a new payment method
- [ ] Add to `lib/payments/` directory
- [ ] Create handler function
- [ ] Update `POST /api/payments` endpoint
- [ ] Add webhook handler for payment confirmations
- [ ] Update tests
- [ ] Run `npm run lint:booking`

### Adding a new loyalty reward type
- [ ] Add to `types/index.ts` (engagement section)
- [ ] Add calculation logic in `lib/loyalty/`
- [ ] Create API endpoint if needed
- [ ] Emit event from consuming pillar
- [ ] Add listener in `lib/loyalty/`
- [ ] Test point accrual
- [ ] Run `npm run lint:engagement`

### Adding operator management feature
- [ ] Create component in `components/operator/`
- [ ] Add type in `types/operator.ts`
- [ ] Create API route in `app/api/operator/`
- [ ] Add database schema if needed
- [ ] Protect route with role middleware
- [ ] Add tests
- [ ] Run `npm run lint:partner`

---

## Validation Commands

```bash
# Check all architecture rules
npm run validate-architecture

# Lint specific pillar
npm run lint:discovery
npm run lint:booking
npm run lint:engagement
npm run lint:partner

# Check forbidden imports
npm run check-deps

# Generate metrics
node scripts/architecture-metrics.js

# Run pre-commit checks
npx husky install
npx husky run pre-commit
```

---

## Decision Tree: "Where Does This Go?"

```
START
  ↓
"Is this about finding/viewing offerings?"
  YES → DISCOVERY PILLAR
  NO ↓
    "Is this about purchasing/transactions?"
      YES → BOOKING PILLAR
      NO ↓
        "Is this about user engagement/loyalty/reviews?"
          YES → ENGAGEMENT PILLAR
          NO ↓
            "Is this for partner operations/dashboards?"
              YES → PARTNER MANAGEMENT PILLAR
              NO ↓
                "Is this about auth/users/caching/infrastructure?"
                  YES → CORE INFRASTRUCTURE PILLAR
                  NO → ???? (Ask lead dev!)
```

---

## Pillar Contact & Ownership

| Pillar | Lead | Slack Channel | Responsibilities |
|--------|------|---------------|-----------------|
| Discovery | @lead-dev | #discovery | Tours, search, filters, weather |
| Booking | @payments-dev | #booking | Cart, payments, transactions |
| Engagement | @community-dev | #engagement | Reviews, loyalty, chat |
| Partner | @ops-dev | #partner-ops | Admin, operator, agent dashboards |
| Core | @platform-dev | #infrastructure | Auth, DB, monitoring, cache |

---

## Red Flags 🚨

If you see these, there's likely an architecture violation:

- ❌ Importing from `@/components/admin` in tour search code
- ❌ Using `lib/payments` functions in discovery code
- ❌ Adding loyalty logic directly in booking code
- ❌ Core infrastructure importing from any pillar
- ❌ Database queries directly in component code
- ❌ Sharing React Context between pillars
- ❌ Two pillars importing each other (circular)
- ❌ Business logic in UI components
- ❌ API calls in utility functions (should be in hooks)

---

## Green Lights ✅

You're doing it right if you see:

- ✅ Pillar-specific components in correct directories
- ✅ API calls at pillar boundaries
- ✅ Events/webhooks for cross-pillar communication
- ✅ Types in pillar-specific files
- ✅ Clear one-way dependencies
- ✅ Tests isolated per pillar
- ✅ No unused imports
- ✅ Consistent naming conventions
- ✅ Documentation for new features

---

## Performance Optimization Tips

### Discovery Pillar
```typescript
// Cache search results
const cachedTours = await cache.get(`tours:${query}`)
// Implement pagination
GET /api/tours?page=1&limit=20
// Use CDN for images
```

### Booking Pillar
```typescript
// Async payment processing
const job = queue.add('process-payment', paymentData)
// Inventory locking during checkout
// Rate limit booking endpoints
```

### Engagement Pillar
```typescript
// Use event streaming for notifications
emitter.on('booking.confirmed', sendNotification)
// Denormalize review counts
// Cache loyalty calculations
```

### Partner Management Pillar
```typescript
// WebSocket for real-time dashboards
// Session affinity for operator login
// Separate read replicas for reports
```

---

## Deployment Order (If Microservices)

1. **Core Infrastructure** (auth, users must be available first)
2. **Discovery** (independent, can work standalone)
3. **Booking** (depends on discovery)
4. **Engagement** (depends on booking)
5. **Partner Management** (depends on all)

---

**Print this and keep it at your desk! Reference it daily. Update it as you learn.**

Generated: 2026-01-27
Version: 1.0
