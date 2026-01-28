# 📋 PHASE 2D PLAN: REMAINING CORE INFRASTRUCTURE MODULES

**Status:** 🎯 Planning Phase  
**Current:** Phase 2A+2B Complete (Database Service Ready)  
**Next:** Phase 2C (Import Updates) → Phase 2D (Remaining Modules)  
**Estimated Time:** 4-6 hours  
**Priority:** HIGH (Foundation layer, blocks Stages 3-8)

---

## 📊 PHASE 2 STRUCTURE

```
Phase 2: CORE INFRASTRUCTURE MIGRATION
├── ✅ Phase 2A: Database Service (COMPLETE)
│   ├── DatabaseService singleton
│   ├── Repository pattern (CRUD + pagination)
│   ├── Type definitions
│   └── Init lifecycle
│
├── ✅ Phase 2B: Database Initialization (COMPLETE)
│   ├── initializeDatabase()
│   ├── shutdownDatabase()
│   └── Health checks
│
├── ⏳ Phase 2C: Import Updates (NEXT - 1 hour)
│   ├── Update ~30-40 files
│   ├── @/lib/database → @core-infrastructure/lib/database
│   └── Verify build
│
└── ⏳ Phase 2D: Remaining Core Modules (4-6 hours - THIS PLAN)
    ├── Cache module
    ├── Monitoring module
    ├── Notifications module
    ├── Payments module
    └── Event system (EventBus)
```

---

## 🔍 PHASE 2D MODULES ANALYSIS

### Module 1: CACHE (Priority: HIGH)
**Current Status:** Exists at `lib/cache.ts`  
**Size:** Small utility  
**Destination:** `pillars/core-infrastructure/lib/cache/`  
**Time:** 45 min

**What Needs Migrating:**
- cache.ts (Redis/In-Memory caching logic)
- Type definitions (CacheKey, CacheValue, TTL options)
- Utility functions (get, set, delete, clear, setTTL)

**Post-Migration Structure:**
```
pillars/core-infrastructure/lib/cache/
├── services/
│   ├── CacheService.ts         (singleton, 120+ lines)
│   └── index.ts
├── types/
│   └── index.ts                (CacheKey, CacheConfig, CacheStats)
└── index.ts                     (public API)
```

**Public API:**
```typescript
import {
  cache,                    // CacheService instance
  CacheService,             // Class
  get, set, delete, clear,  // Convenience functions
  // Types
  CacheKey, CacheValue, CacheConfig, CacheStats
} from '@core-infrastructure/lib/cache'
```

---

### Module 2: MONITORING (Priority: HIGH)
**Current Status:** Exists at `lib/monitoring.ts`  
**Size:** Medium utility  
**Destination:** `pillars/core-infrastructure/lib/monitoring/`  
**Time:** 1 hour

**What Needs Migrating:**
- monitoring.ts (metrics, logging, performance tracking)
- Type definitions (MetricsType, LogLevel, PerformanceMetric)
- Utility functions (recordMetric, getMetrics, startTimer, endTimer)

**Post-Migration Structure:**
```
pillars/core-infrastructure/lib/monitoring/
├── services/
│   ├── MonitoringService.ts    (singleton, 150+ lines)
│   └── index.ts
├── types/
│   └── index.ts                (Metric, PerformanceStats, AlertConfig)
├── loggers/
│   ├── logger.ts               (Winston/Pino setup, 80+ lines)
│   └── index.ts
└── index.ts                     (public API)
```

**Public API:**
```typescript
import {
  monitoring,                    // MonitoringService instance
  logger,                        // Logger instance
  recordMetric,                  // Convenience functions
  getMetrics,
  // Types
  Metric, PerformanceStats, LogLevel
} from '@core-infrastructure/lib/monitoring'
```

---

### Module 3: NOTIFICATIONS (Priority: MEDIUM)
**Current Status:** Partial at `lib/notifications/`  
**Size:** Medium service  
**Destination:** `pillars/core-infrastructure/lib/notifications/`  
**Time:** 1 hour 15 min

**What Needs Migrating:**
- Email service (sendEmail, templates)
- SMS service (sendSMS, Twilio integration)
- Push notifications (sendPush, FCM integration)
- Type definitions (NotificationType, NotificationStatus, Channel)

**Post-Migration Structure:**
```
pillars/core-infrastructure/lib/notifications/
├── services/
│   ├── EmailService.ts         (120+ lines)
│   ├── SMSService.ts           (100+ lines)
│   ├── PushService.ts          (100+ lines)
│   └── index.ts
├── types/
│   └── index.ts                (Notification, Channel, Status enums)
├── templates/
│   ├── email/
│   │   ├── welcome.ts
│   │   ├── reset-password.ts
│   │   └── booking-confirmation.ts
│   └── index.ts
└── index.ts                     (public API)
```

**Public API:**
```typescript
import {
  emailService,                  // EmailService instance
  smsService,                    // SMSService instance
  pushService,                   // PushService instance
  sendEmail,                     // Convenience functions
  sendSMS,
  sendPush,
  // Types
  Notification, Channel, NotificationStatus, EmailTemplate
} from '@core-infrastructure/lib/notifications'
```

---

### Module 4: PAYMENTS (Priority: MEDIUM)
**Current Status:** Partial at `lib/payments/`  
**Size:** Medium service  
**Destination:** `pillars/core-infrastructure/lib/payments/`  
**Time:** 1 hour 15 min

**What Needs Migrating:**
- Payment gateway integration (CloudPayments, Stripe, etc.)
- Transaction handling (create, verify, refund)
- Type definitions (PaymentProvider, Transaction, PaymentStatus)
- Webhook handlers

**Post-Migration Structure:**
```
pillars/core-infrastructure/lib/payments/
├── services/
│   ├── PaymentService.ts       (200+ lines)
│   ├── CloudPaymentsProvider.ts (100+ lines)
│   ├── StripeProvider.ts       (100+ lines)
│   └── index.ts
├── types/
│   └── index.ts                (Payment, Transaction, Provider enums)
├── webhooks/
│   ├── cloudpayments.ts        (80+ lines)
│   ├── stripe.ts               (80+ lines)
│   └── index.ts
└── index.ts                     (public API)
```

**Public API:**
```typescript
import {
  paymentService,                // PaymentService instance
  createPayment,                 // Convenience functions
  verifyPayment,
  refund,
  handleWebhook,
  // Types
  Payment, Transaction, PaymentProvider, PaymentStatus
} from '@core-infrastructure/lib/payments'
```

---

### Module 5: EVENT SYSTEM (Priority: HIGH)
**Current Status:** Not migrated yet  
**Size:** Medium service  
**Destination:** `pillars/core-infrastructure/lib/events/`  
**Time:** 1 hour 30 min

**What Needs Creating:**
- EventBus (pub/sub pattern)
- Event definitions (BookingCreated, TourUpdated, UserCreated, etc.)
- Event listeners registry
- Type definitions (EventType, EventHandler, Event)

**Post-Migration Structure:**
```
pillars/core-infrastructure/lib/events/
├── services/
│   ├── EventBus.ts             (150+ lines)
│   └── index.ts
├── types/
│   └── index.ts                (Event, EventType, EventHandler, EventConfig)
├── listeners/
│   ├── registrations.ts        (Register all event listeners)
│   └── index.ts
├── events/
│   ├── booking.events.ts       (BookingCreated, BookingUpdated, BookingCancelled)
│   ├── user.events.ts          (UserCreated, UserUpdated, UserDeleted)
│   ├── tour.events.ts          (TourCreated, TourUpdated, TourDeleted)
│   └── index.ts
└── index.ts                     (public API)
```

**Public API:**
```typescript
import {
  eventBus,                      // EventBus instance
  EventBus,                      // Class
  on, emit, once, off,           // Convenience functions
  // Events
  BookingCreatedEvent,
  UserCreatedEvent,
  TourUpdatedEvent,
  // Types
  Event, EventType, EventHandler, EventConfig
} from '@core-infrastructure/lib/events'
```

---

## 📈 EXECUTION PLAN

### Step 1: Phase 2C Prerequisite (Before Phase 2D)
```bash
# Update all database imports first
# This must complete before Phase 2D work
# Time: 1 hour
# Files affected: ~30-40
```

### Step 2: Cache Module (Phase 2D.1)
**Time:** 45 minutes
```
1. Create directory structure (5 min)
   pillars/core-infrastructure/lib/cache/{services,types}

2. Migrate cache.ts → services/CacheService.ts (15 min)
   - Convert to singleton pattern
   - Add Redis client management
   - Maintain same API

3. Extract types → types/index.ts (10 min)
   - CacheKey, CacheValue, CacheConfig
   - CacheOptions, CacheStats

4. Create public API index.ts (10 min)
   - Export CacheService
   - Export convenience functions
   - Export types

5. Update tsconfig.json path alias (5 min)
   @core-infrastructure/lib/cache/*

6. Verify imports (nothing uses this yet)
```

### Step 3: Monitoring Module (Phase 2D.2)
**Time:** 1 hour
```
1. Create directory structure (5 min)
   pillars/core-infrastructure/lib/monitoring/{services,types,loggers}

2. Migrate monitoring.ts → services/MonitoringService.ts (20 min)
   - Singleton pattern
   - Metrics collection
   - Performance tracking

3. Create logger service (15 min)
   - Winston or Pino configuration
   - Log levels
   - File and console transports

4. Extract types (10 min)
   - MetricsType enum
   - PerformanceMetric interface
   - LogConfig, AlertConfig

5. Create public API index.ts (10 min)
   - Export MonitoringService, logger
   - Export convenience functions
   - Export types

6. Update tsconfig.json (5 min)
   @core-infrastructure/lib/monitoring/*

7. Update metrics collection in DatabaseService (5 min)
   - Add query performance tracking
```

### Step 4: Notifications Module (Phase 2D.3)
**Time:** 1 hour 15 minutes
```
1. Create directory structure (5 min)
   pillars/core-infrastructure/lib/notifications/{services,types,templates}

2. Create EmailService (30 min)
   - Nodemailer/SendGrid integration
   - Template rendering
   - Queue management

3. Create SMSService (20 min)
   - Twilio integration
   - Message formatting
   - Delivery tracking

4. Create PushService (20 min)
   - Firebase Cloud Messaging
   - Device token management
   - Notification routing

5. Extract types (10 min)
   - Notification, Channel enums
   - NotificationStatus, Priority
   - Service-specific configs

6. Create email templates directory (10 min)
   - welcome.ts, reset-password.ts, etc.

7. Create public API index.ts (5 min)
   - Export all services
   - Export convenience functions
   - Export types

8. Update tsconfig.json (5 min)
   @core-infrastructure/lib/notifications/*
```

### Step 5: Payments Module (Phase 2D.4)
**Time:** 1 hour 15 minutes
```
1. Create directory structure (5 min)
   pillars/core-infrastructure/lib/payments/{services,types,webhooks}

2. Create PaymentService (30 min)
   - Provider abstraction
   - Payment routing
   - Transaction logging

3. Create CloudPaymentsProvider (20 min)
   - Existing integration
   - Payment creation
   - Verification

4. Create StripeProvider (20 min)
   - Stripe integration
   - Payment methods
   - Subscription support

5. Extract types (10 min)
   - Payment, Transaction interfaces
   - PaymentProvider, PaymentStatus enums
   - Provider configs

6. Create webhook handlers (15 min)
   - CloudPayments webhook
   - Stripe webhook
   - Notification to other services

7. Create public API index.ts (5 min)
   - Export PaymentService
   - Export convenience functions
   - Export types

8. Update tsconfig.json (5 min)
   @core-infrastructure/lib/payments/*
```

### Step 6: Event System (Phase 2D.5)
**Time:** 1 hour 30 minutes
```
1. Create directory structure (5 min)
   pillars/core-infrastructure/lib/events/{services,types,events,listeners}

2. Create EventBus service (30 min)
   - Pub/sub pattern
   - Listener registration
   - Event emission
   - Error handling

3. Define domain events (30 min)
   - booking.events.ts (BookingCreated, etc.)
   - user.events.ts (UserCreated, etc.)
   - tour.events.ts (TourCreated, etc.)
   - tour-interaction.events.ts (Reviewed, Booked, etc.)

4. Extract types (15 min)
   - Event interface
   - EventType enum (25+ event types)
   - EventHandler, EventConfig
   - EventPayload generics

5. Create listener registrations (15 min)
   - Set up all listeners
   - Cross-service subscriptions
   - Error handlers

6. Create public API index.ts (5 min)
   - Export EventBus
   - Export convenience functions (on, emit, off, once)
   - Export all events and types

7. Update tsconfig.json (5 min)
   @core-infrastructure/lib/events/*

8. Add EventBus initialization to database init.ts (5 min)
   - Start EventBus on app startup
   - Wire up inter-pillar communication
```

---

## 🔄 SEQUENCE & DEPENDENCIES

```
Phase 2C (Import Updates)
    ↓
    └─→ MUST COMPLETE FIRST (blocks everything)

Phase 2D.1 (Cache)
    ↓
    └─→ No dependencies, can run anytime after 2C

Phase 2D.2 (Monitoring)
    ↓
    └─→ No dependencies, but should integrate with Database/Cache
    └─→ Optional: Add query metrics to DatabaseService

Phase 2D.3 (Notifications)
    ↓
    └─→ Depends on: EventBus (Phase 2D.5) for event-driven notifications
    └─→ Can work without, but better with events

Phase 2D.4 (Payments)
    ↓
    └─→ Depends on: EventBus (Phase 2D.5) for payment status events
    └─→ Depends on: Notifications for receipts

Phase 2D.5 (Events - EventBus)
    ↓
    └─→ CRITICAL: Should complete BEFORE 3 & 4 start
    └─→ Needed for Stage 3+ (inter-pillar communication)

RECOMMENDED ORDER:
1. Phase 2C (Imports)        - 1 hour
2. Phase 2D.1 (Cache)        - 45 min
3. Phase 2D.2 (Monitoring)   - 1 hour
4. Phase 2D.5 (EventBus)     - 1.5 hours (BEFORE 3 & 4)
5. Phase 2D.3 (Notifications)- 1.25 hours
6. Phase 2D.4 (Payments)     - 1.25 hours

TOTAL: 6.5 hours
```

---

## 📋 PHASE 2D CHECKLIST

### Cache Module
- [ ] Create `/lib/cache/{services,types}` directories
- [ ] Migrate `lib/cache.ts` → `services/CacheService.ts`
- [ ] Extract types → `types/index.ts`
- [ ] Create `services/index.ts` (exports)
- [ ] Create `types/index.ts` (exports)
- [ ] Create main `index.ts` (public API)
- [ ] Update `tsconfig.json` with path alias
- [ ] Verify no circular dependencies
- [ ] Document cache API

### Monitoring Module
- [ ] Create `/lib/monitoring/{services,types,loggers}` directories
- [ ] Migrate `lib/monitoring.ts` → `services/MonitoringService.ts`
- [ ] Create `loggers/logger.ts` (Winston/Pino setup)
- [ ] Extract types → `types/index.ts`
- [ ] Create index files with exports
- [ ] Update `tsconfig.json` with path alias
- [ ] Add query metrics to DatabaseService
- [ ] Document monitoring API

### Notifications Module
- [ ] Create `/lib/notifications/{services,types,templates}` directories
- [ ] Create `EmailService` with templates
- [ ] Create `SMSService` with Twilio
- [ ] Create `PushService` with FCM
- [ ] Extract types → `types/index.ts`
- [ ] Create index files with exports
- [ ] Update `tsconfig.json` with path alias
- [ ] Create email templates
- [ ] Document notification API

### Payments Module
- [ ] Create `/lib/payments/{services,types,webhooks}` directories
- [ ] Migrate `lib/payments/` → `services/`
- [ ] Create `PaymentService` (provider abstraction)
- [ ] Maintain CloudPayments & Stripe providers
- [ ] Create webhook handlers
- [ ] Extract types → `types/index.ts`
- [ ] Create index files with exports
- [ ] Update `tsconfig.json` with path alias
- [ ] Document payments API

### Event System (EventBus)
- [ ] Create `/lib/events/{services,types,events,listeners}` directories
- [ ] Create `EventBus` class (pub/sub)
- [ ] Define event types (25+ events)
- [ ] Create listener registrations
- [ ] Extract types → `types/index.ts`
- [ ] Create index files with exports
- [ ] Update `tsconfig.json` with path alias
- [ ] Integrate with Database init
- [ ] Document events API

---

## 🎯 SUCCESS CRITERIA

Each module must meet these requirements:

1. **Structure**
   - ✅ Proper directory organization (services/, types/)
   - ✅ All code in pillar structure
   - ✅ No imports from old locations

2. **Code Quality**
   - ✅ TypeScript strict mode passing
   - ✅ Full type definitions
   - ✅ JSDoc comments
   - ✅ Error handling

3. **API Design**
   - ✅ Public API via index.ts
   - ✅ Singleton pattern where applicable
   - ✅ Convenience functions exported
   - ✅ Types properly exported

4. **Integration**
   - ✅ Updated `tsconfig.json` aliases
   - ✅ No circular dependencies
   - ✅ Proper initialization order
   - ✅ Health checks if applicable

5. **Documentation**
   - ✅ Usage examples
   - ✅ API documentation
   - ✅ Type definitions explained
   - ✅ Integration guide

---

## 📊 TIME BREAKDOWN

```
Activity                  Time      Cumulative
─────────────────────────────────────────────
Phase 2C (Imports)       1.0 h     1.0 h
Phase 2D.1 (Cache)       0.75 h    1.75 h
Phase 2D.2 (Monitoring)  1.0 h     2.75 h
Phase 2D.5 (EventBus)    1.5 h     4.25 h
Phase 2D.3 (Notifs)      1.25 h    5.5 h
Phase 2D.4 (Payments)    1.25 h    6.75 h
Testing & Verification   0.5 h     7.25 h
─────────────────────────────────────────────
TOTAL                    7.25 h
```

---

## 🚀 NEXT STEPS

### Immediate (Choose One)

**Option A: Continue Full Speed**
```
1. Complete Phase 2C (import updates) - 1 hour
2. Start Phase 2D.1-5 immediately
3. Target: Phase 2 complete in 6-7 hours
```

**Option B: Review First**
```
1. Read PHASE2D_PLAN.md (this file) carefully
2. Ask questions about specific modules
3. Then proceed with Phase 2C + 2D
```

**Option C: Selective Focus**
```
1. Phase 2C (imports) - required
2. Phase 2D.5 (EventBus) - most critical for stages 3+
3. Other modules on demand
```

---

## 📚 DOCUMENTATION UPDATES

After Phase 2D completion:
- [ ] Update LIVE_STATUS_PHASE2.md with final stats
- [ ] Create PHASE2_COMPLETE.md summary
- [ ] Update main README with Phase 2 capabilities
- [ ] Create Core Infrastructure module documentation
- [ ] Create inter-module communication guide

---

## ✨ PHASE 2D SUMMARY

**What This Accomplishes:**
- ✅ Completes Core Infrastructure layer
- ✅ Enables all Stages 3+ (pillar-specific work)
- ✅ Provides event-driven communication foundation
- ✅ Centralizes all shared services
- ✅ Blocks technical debt

**Impact on Stages 3-8:**
- Stage 3+ all depend on Phase 2 completion
- EventBus (2D.5) is critical for inter-pillar communication
- Database + Cache + Events enable scalability
- Payments + Notifications enable business logic

**Quality Metrics:**
- Code coverage: ~90% of Core Infrastructure
- Type safety: Full TypeScript strict mode
- Documentation: 100% of public APIs
- Testing readiness: Ready for integration tests

---

**Ready to start Phase 2C → 2D?**

Say:
- `"Start Phase 2C"` - Begin import updates now
- `"Execute Phase 2D"` - Execute entire plan (after 2C)
- `"Review more"` - Ask questions first
- `"Proceed Phase 2"` - Auto-execute 2C + 2D sequence

