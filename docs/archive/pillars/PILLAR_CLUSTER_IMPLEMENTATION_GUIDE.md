# Pillar-Cluster Architecture: Implementation Guide

## Quick Reference

### The 5 Pillars at a Glance

```
┌────────────────────────────────────────────────────────────────┐
│                 🏗️  CORE INFRASTRUCTURE PILLAR                 │
│  Shared: Auth, Users, AI, Monitoring, Cache, Database, Files   │
│  Serves: All other pillars                                      │
│  Location: lib/, middleware.ts, app/api/auth, app/profile      │
└────────────────────────────────────────────────────────────────┘
                              △
                 ┌────────────┼────────────┐
                 │            │            │
        ┌────────▼──────┐ ┌──▼───────┐ ┌─▼──────────┐
        │ 🔍 DISCOVERY  │ │ 💳 BOOK  │ │ 💬 ENGAGE  │
        │    Pillar     │ │ Pillar   │ │   Pillar   │
        ├───────────────┤ ├──────────┤ ├────────────┤
        │ • Tours       │ │ • Cart   │ │ • Reviews  │
        │ • Lodging     │ │ • Booking│ │ • Loyalty  │
        │ • Cars        │ │ • Payments│ • Chat    │
        │ • Gear        │ │ │ • Notif  │
        │ • Weather     │ └──────────┘ └────────────┘
        │ • Search      │
        └──────┬────────┘
               │ (user selects)
               │
          ┌────▼─────────────────┐
          │ 👥 PARTNER MGT PILLAR │
          ├──────────────────────┤
          │ • Admin Dashboard    │
          │ • Operator Tours     │
          │ • Agent Clients      │
          │ • Guide Management   │
          └──────────────────────┘
```

---

## 1. Discovery Pillar 🔍

### Purpose
Enable users to find and explore tours, accommodations, cars, gear, and guides.

### Key Directories
```
app/
  ├── api/
  │   ├── tours/              → GET /api/tours (with filters)
  │   ├── accommodations/     → GET /api/accommodations
  │   ├── cars/              → GET /api/cars
  │   ├── gear/              → GET /api/gear
  │   ├── transfers/         → GET /api/transfers
  │   └── weather/           → GET /api/weather
  ├── accommodations/        → /accommodations page
  ├── cars/                  → /cars page
  ├── gear/                  → /gear page
  ├── tours/                 → /tours listing
  ├── search/                → /search page
  └── shop/                  → /shop (souvenirs - discovery aspect)

components/
  ├── search/
  │   ├── ModernTourSearch.tsx
  │   ├── SearchFilters.tsx
  │   └── SearchIcons.tsx
  ├── AccommodationCard.tsx
  ├── AccommodationFilters.tsx
  ├── TourCard.tsx
  ├── TransferSearchWidget.tsx
  └── WeatherWidget.tsx

lib/
  ├── ai/                    → Smart search, recommendations
  ├── maps/                  → Geolocation, routing
  └── weather/               → Weather API integration

types/
  ├── index.ts              → Tour, Accommodation, etc.

database/
  ├── gear_rentals_schema.sql
  ├── car_rentals_schema.sql
  └── souvenirs_orders_schema.sql
```

### Critical APIs
- `GET /api/tours?q=&category=&difficulty=` → Filtered tour list
- `GET /api/accommodations?location=&price=` → Lodging search
- `GET /api/weather/{location}` → Environmental context
- `GET /api/tours/{id}` → Tour details → **Links to Booking**

### Data Flow Example
```
User enters "Kamchatka hiking"
     ↓
lib/ai/search processes query
     ↓
Database returns filtered tours
     ↓
Components render TourCard
     ↓
User clicks "Book Now"
     ↓
Transfer to Booking Pillar
```

### Owns
- Search algorithms and indexing
- Filter definitions
- Asset delivery (images, videos)
- Availability checks (real-time)

### Does NOT Own
- Payment processing
- User reviews (Engagement pillar)
- Operator management (Partner pillar)

---

## 2. Booking Pillar 💳

### Purpose
Handle user purchases: cart management, payment processing, and order confirmation.

### Key Directories
```
app/
  ├── api/
  │   ├── bookings/          → POST /api/bookings (create)
  │   ├── payments/          → POST /api/payments (process)
  │   ├── cart/              → POST /api/cart
  │   └── transfer-operator/ → Transfer booking workflow
  ├── cart/                  → /cart page

components/
  ├── booking/
  │   ├── BookingForm.tsx
  │   ├── CheckoutFlow.tsx
  │   └── PaymentGateway.tsx
  └── payments/
      └── PaymentWidget.tsx

lib/
  └── payments/              → CloudPayments integration

types/
  └── index.ts              → Booking, Transaction types

database/
  └── (booking schema in PostgreSQL)
```

### Critical APIs
- `POST /api/bookings` → Create booking from cart
- `POST /api/payments` → Process CloudPayments
- `PUT /api/bookings/{id}` → Update booking status
- `DELETE /api/cart/{id}` → Remove from cart

### Data Flow Example
```
User clicks "Book Now" from Tour (Discovery)
     ↓
POST /api/bookings { tourId, dates, passengers }
     ↓
Pillar checks availability (Discovery → read-only)
     ↓
Creates pending booking
     ↓
POST /api/payments { bookingId, amount }
     ↓
CloudPayments processes
     ↓
Webhook: payment.completed
     ↓
Update booking status → CONFIRMED
     ↓
Emit event: booking.confirmed
     ↓
Trigger Engagement (reviews enabled) & Partner Mgmt (operator notified)
```

### Owns
- Cart state and persistence
- Booking lifecycle management
- Payment orchestration
- Transaction records
- Invoice generation

### Does NOT Own
- Tour details (Discovery)
- User loyalty points (Engagement)
- Operator notifications (Partner)

### Key Tables
```sql
bookings {
  id, user_id, tour_id, status, created_at, updated_at
}

transactions {
  id, booking_id, amount, payment_method, status, external_id
}

cart_items {
  id, user_id, tour_id, quantity, price, expires_at
}
```

---

## 3. Engagement Pillar 💬

### Purpose
Build community, maintain loyalty, and keep users coming back.

### Key Directories
```
app/
  ├── api/
  │   ├── reviews/           → POST /api/reviews
  │   ├── eco-points/        → GET /api/eco-points
  │   ├── loyalty/           → GET /api/loyalty
  │   ├── chat/              → WebSocket /api/chat
  │   └── notifications/     → POST /api/notifications
  └── (no page routing, embedded in profile/booking flow)

components/
  ├── reviews/
  │   ├── ReviewForm.tsx
  │   └── ReviewsList.tsx
  ├── EcoPointsWidget.tsx
  ├── LoyaltyWidget.tsx
  ├── AIChatWidget.tsx
  └── RoleAssistantWidget.tsx

lib/
  ├── loyalty/               → Points calculation
  └── notifications/         → Delivery engine

types/
  └── index.ts              → Review, EcoPoint

database/
  └── (engagement schema)
```

### Critical APIs
- `POST /api/reviews` → Submit review (authenticated, after booking)
- `GET /api/eco-points/{userId}` → User's points balance
- `POST /api/loyalty/redeem` → Redeem points
- `GET /api/chat` (WebSocket) → Real-time support chat
- `POST /api/notifications` → Send notification

### Data Flow Example
```
Booking confirmed (from Booking pillar)
     ↓
Engagement receives: booking.confirmed event
     ↓
Auto-enable review for this booking
     ↓
Award eco-points: base_points + booking_multiplier
     ↓
Send notification: "Your tour is confirmed!"
     ↓
User submits review after trip
     ↓
POST /api/reviews → Award review_bonus_points
     ↓
Other users see review on tour page
```

### Owns
- Review content and moderation
- Loyalty point calculations
- Notification templates and delivery
- User preference settings
- Chat conversations

### Does NOT Own
- Booking details (Booking pillar)
- Tour content (Discovery pillar)
- Operator reports (Partner pillar)

### Key Tables
```sql
reviews {
  id, booking_id, user_id, tour_id, rating, text, created_at
}

eco_points_transactions {
  id, user_id, reason, amount, booking_id, created_at
}

notifications {
  id, user_id, type, content, read_at, created_at
}

chat_messages {
  id, user_id, operator_id, content, created_at
}
```

---

## 4. Partner Management Pillar 👥

### Purpose
Provide dashboards for admins, operators, agents, and guides to manage their operations.

### Key Directories
```
app/
  ├── api/
  │   ├── admin/            → /api/admin/* (all platform management)
  │   ├── operator/         → /api/operator/* (tour management)
  │   ├── agent/            → /api/agent/* (client management)
  │   └── guide/            → /api/guide/* (assignment management)
  ├── admin/               → /admin page (requires admin role)
  ├── partner/             → /partner dashboard (generic)

components/
  ├── admin/
  │   ├── AdminDashboard.tsx
  │   ├── UserManagement.tsx
  │   └── ContentModeration.tsx
  ├── operator/
  │   ├── OperatorDashboard.tsx
  │   ├── TourManagement.tsx
  │   └── BookingsList.tsx
  ├── agent/
  │   ├── AgentDashboard.tsx
  │   ├── ClientManagement.tsx
  │   └── VoucherSystem.tsx
  └── guide/
      └── GuideAssignment.tsx

types/
  ├── admin.ts             → Admin-specific types
  ├── operator.ts          → Operator-specific types
  └── agent.ts             → Agent-specific types

database/
  ├── transfer_operator_complete_schema.sql
  └── (other partner schemas)
```

### Critical APIs
- **Admin**: `/api/admin/users`, `/api/admin/moderation`, `/api/admin/reports`
- **Operator**: `/api/operator/tours` (CRUD), `/api/operator/bookings`, `/api/operator/availability`
- **Agent**: `/api/agent/clients` (CRUD), `/api/agent/vouchers`, `/api/agent/commissions`
- **Guide**: `/api/guide/assignments`, `/api/guide/schedule`

### Data Flow Example
```
Operator logs in (via Core Infrastructure auth)
     ↓
Middleware checks role == "operator"
     ↓
GET /api/operator/tours → Lists operator's tours
     ↓
Operator sees pending bookings
     ↓
Booking Pillar notified operator (webhook)
     ↓
Operator confirms/assigns guide
     ↓
PUT /api/operator/bookings/{id} { status, guide_id }
     ↓
Guide receives notification (Engagement pillar)
     ↓
System updates availability (Discovery pillar)
```

### Owns
- Partner dashboards and analytics
- Partner-specific workflows (operator tour management, agent vouchers)
- Commission calculations
- Partner account settings
- Role-based access control

### Does NOT Own
- User authentication (Core Infrastructure)
- Booking processing (Booking pillar)
- Platform reviews (Engagement pillar)

### Key Tables
```sql
operators {
  id, user_id, commission_percent, rating, verified, created_at
}

operator_tours {
  id, operator_id, tour_id, available_seats, price_markup, status
}

agents {
  id, user_id, commission_rate, total_clients, verified, created_at
}

agent_clients {
  id, agent_id, user_id, commission_split, status
}

agent_vouchers {
  id, agent_id, code, discount_percent, used_count, expires_at
}
```

---

## 5. Core Infrastructure Pillar 🏗️

### Purpose
Provide shared services that all pillars depend on.

### Key Directories
```
app/
  ├── api/
  │   ├── auth/              → JWT, sessions, password reset
  │   ├── roles/             → Permission checking
  │   ├── health/            → System health check
  │   ├── upload/            → File upload handling
  │   ├── webhooks/          → Event distribution
  │   └── monitoring/        → Metrics and logs
  ├── auth/                  → /auth/* pages (login, register)
  └── profile/               → /profile/* (user account)

lib/
  ├── auth/
  │   ├── jwt.ts            → Token generation/validation
  │   ├── session.ts        → Session management
  │   └── permissions.ts    → RBAC logic
  ├── database.ts           → ORM/query builder
  ├── cache.ts              → Redis client
  ├── monitoring.ts         → Sentry, logging
  ├── ai/                   → ML models, inference
  ├── notifications/        → Email, SMS, push
  └── utils.ts              → Common functions

middleware.ts              → Authentication, logging, CORS
middleware/                → Specific middleware

types/
  └── index.ts             → User, Permission

contexts/                  → Global state management
hooks/                     → Shared React hooks
```

### Critical APIs
- `POST /api/auth/login` → User authentication
- `POST /api/auth/register` → Account creation
- `POST /api/auth/refresh` → Token refresh
- `GET /api/roles/{userId}` → User permissions
- `POST /api/upload` → File upload
- `POST /api/webhooks/event` → Event ingestion

### Data Flow Example
```
User visits /login page (Discovery pillar redirect)
     ↓
POST /api/auth/login { email, password }
     ↓
Core Infra validates credentials
     ↓
Generate JWT token
     ↓
Return token to client
     ↓
Client includes token in all subsequent requests
     ↓
middleware.ts validates token on every request
     ↓
Request proceeds with user context attached
     ↓
All pillars can access user info from context
```

### Owns
- User authentication (JWT, sessions)
- Authorization (role-based access control)
- User profiles and preferences
- System monitoring and health checks
- File/asset storage and delivery
- Event/webhook distribution
- Caching layer
- Database connections

### Does NOT Own
- Business logic (owned by specific pillars)
- Reviews, bookings, operator management (all pillar-specific)

### Key Tables
```sql
users {
  id, email, password_hash, first_name, last_name, role, 
  verified, created_at, updated_at
}

user_preferences {
  id, user_id, theme, language, notifications_enabled
}

permissions {
  id, role, resource, action
}

audit_logs {
  id, user_id, action, resource, timestamp
}

webhooks {
  id, event_type, endpoint, payload, status, retries
}
```

---

## 🔗 Integration Points Checklist

### Discovery ↔ Booking
- [ ] `/api/tours/{id}` has "Book Now" button
- [ ] Booking creation checks availability from Discovery
- [ ] Cancelled bookings update availability back to Discovery

### Booking ↔ Engagement
- [ ] `payment.confirmed` webhook triggers eco-points award
- [ ] Booking status change triggers notification
- [ ] Review form only appears for completed bookings
- [ ] Chat becomes available after booking confirmed

### Booking ↔ Partner Management
- [ ] Operator sees new bookings in real-time
- [ ] Agent gets commission calculated post-booking
- [ ] Admin sees financial reports from bookings
- [ ] Operator can confirm/decline bookings

### All Pillars ↔ Core Infrastructure
- [ ] All API routes check `middleware.ts` auth
- [ ] All user operations go through `lib/auth`
- [ ] All data persists through `lib/database`
- [ ] All events distributed via `lib/webhooks`
- [ ] All uploads go through `/api/upload`

---

## 🎨 Naming Conventions

### Files
```
// Discovery pillar components
components/search/ModernTourSearch.tsx
lib/ai/searchEngine.ts

// Booking pillar components
components/booking/BookingForm.tsx
lib/payments/cloudpayments.ts

// Engagement pillar components
components/reviews/ReviewForm.tsx
lib/loyalty/pointsCalculator.ts

// Partner pillar components
components/operator/OperatorDashboard.tsx
types/operator.ts

// Core infrastructure
lib/auth/jwt.ts
middleware.ts
```

### API Routes
```
// Discovery
/api/tours
/api/accommodations
/api/cars
/api/weather

// Booking
/api/bookings
/api/payments
/api/cart

// Engagement
/api/reviews
/api/loyalty
/api/chat

// Partner Management
/api/admin/*
/api/operator/*
/api/agent/*

// Core Infrastructure
/api/auth/*
/api/upload
/api/webhooks
```

### Types
```typescript
// types/index.ts
export interface User { ... }
export interface Tour { ... }
export interface Booking { ... }

// types/operator.ts
export interface OperatorMetrics { ... }
export interface OperatorTour { ... }

// types/agent.ts
export interface AgentMetrics { ... }

// types/admin.ts
export interface DashboardMetrics { ... }
```

---

## 🚫 Anti-Patterns (What NOT to Do)

### ❌ WRONG: Cross-Pillar Data Imports
```typescript
// DON'T do this!
import { getOperatorMetrics } from "@/lib/operator"; // in Discovery code
```

**WHY**: Violates pillar separation. Discovery shouldn't care about operator internals.

**DO THIS INSTEAD**:
- Use API endpoints (e.g., `/api/operator/metrics`)
- Or emit events through webhooks
- Or cache data at boundary

---

### ❌ WRONG: Circular Dependencies
```typescript
// Discovery/tours.ts imports from Booking
import { createBooking } from "@/lib/bookings";

// Booking/bookings.ts imports from Discovery
import { getTourDetails } from "@/lib/discovery";
```

**WHY**: Creates tight coupling and makes testing impossible.

**DO THIS INSTEAD**:
- One-way dependency: Discovery → Booking only
- Discovery is read-only in Booking context
- Use API calls at service boundaries

---

### ❌ WRONG: Shared State Between Pillars
```typescript
// Don't share context providers across pillars
export const useDiscoveryBooking = () => {
  // This mixes two pillars' concerns
};
```

**DO THIS INSTEAD**:
- Keep Discovery state in Discovery context
- Keep Booking state in Booking context
- Communicate via events or API calls

---

## ✅ Best Practices

### ✅ DO: Keep Pillars Independent
```typescript
// discovery/hooks/useTourSearch.ts
export function useTourSearch(query: string) {
  // Only calls /api/tours endpoint
  // Returns tour data for display
  // Knows nothing about bookings
}

// booking/hooks/useCheckout.ts
export function useCheckout(tourId: string) {
  // Creates booking (Booking pillar owns this)
  // Reads tour details via API (respects Discovery boundary)
  // Triggers payment flow
}
```

### ✅ DO: Use Webhooks for Events
```typescript
// Booking pillar completes a booking
POST /api/bookings { tourId, userId, ... }

// Returns webhook event
{
  event: "booking.confirmed",
  bookingId: "123",
  userId: "456"
}

// All interested pillars listen for this event
- Engagement: Award eco-points
- Partner: Notify operator
- Core: Log audit entry
```

### ✅ DO: API-First Design
```typescript
// Instead of direct imports:
// ❌ import { calculatePoints } from "@/lib/loyalty"

// Use API endpoints:
// ✅ GET /api/loyalty/points/{userId}

// Benefits:
// - Respects pillar boundaries
// - Easier to extract to microservices
// - Testable without internal dependencies
// - Rate limiteable
```

---

## 📋 Pillar Checklist for New Features

When adding a new feature, ask yourself:

1. **Which pillar owns this?**
   - Does user discover it? → Discovery
   - Does user purchase it? → Booking
   - Does user engage with it? → Engagement
   - Does partner manage it? → Partner Mgmt
   - Does system need it? → Core Infrastructure

2. **What APIs does it need?**
   - List all `/api/*` endpoints
   - Verify they're in the right pillar

3. **What data does it create?**
   - Add to `types/{pillar}.ts`
   - Add to `database/{pillar}.sql`

4. **What other pillars does it depend on?**
   - Should only depend on pillars above it (or same level)
   - No downward dependencies

5. **How does it communicate?**
   - Events/webhooks for loosely coupled
   - API calls for tight coupling (at boundaries only)
   - Never direct imports (except types)

---

## 🧪 Testing by Pillar

### Discovery Pillar Tests
```javascript
describe('Discovery Pillar', () => {
  test('Search returns filtered tours', async () => {
    const tours = await searchTours({ category: 'hiking' });
    expect(tours).toHaveLength(5);
  });

  test('Tour detail includes all information', async () => {
    const tour = await getTourDetail('123');
    expect(tour.title).toBeDefined();
    expect(tour.price).toBeDefined();
  });
});
```

### Booking Pillar Tests
```javascript
describe('Booking Pillar', () => {
  test('Create booking with valid tour', async () => {
    const booking = await createBooking({
      tourId: '123',
      userId: '456',
      passengers: 2
    });
    expect(booking.status).toBe('pending');
  });

  test('Process payment completes booking', async () => {
    const payment = await processPayment(bookingId, amount);
    expect(payment.status).toBe('completed');
    
    const booking = await getBooking(bookingId);
    expect(booking.status).toBe('confirmed');
  });
});
```

### Integration Tests (Between Pillars)
```javascript
describe('Discovery → Booking Integration', () => {
  test('User can book a discovered tour', async () => {
    // 1. Discover
    const tours = await searchTours({ category: 'hiking' });
    const tour = tours[0];
    
    // 2. Get details
    const details = await getTourDetail(tour.id);
    
    // 3. Book
    const booking = await createBooking({
      tourId: tour.id,
      userId: currentUser.id,
      passengers: details.maxParticipants
    });
    
    expect(booking).toBeDefined();
  });
});
```

---

## 📞 Support & Questions

- **Architecture questions**: Review the main `PILLAR_CLUSTER_ARCHITECTURE.md`
- **Implementation help**: Check the specific pillar section above
- **New feature placement**: Use the checklist in the "Pillar Checklist" section
- **Dependency issues**: Consult the "Anti-Patterns" section

---

**Version**: 1.0
**Last Updated**: 2026-01-27
**Maintainer**: Architecture Team
