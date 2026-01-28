# Pillar-Cluster Architecture: Executive Summary

## What is Pillar-Cluster Architecture?

A modern system design pattern that organizes code into **independent, interconnected business domains** (pillars), each containing specialized functional units (clusters).

### For KamHub:

- **5 Pillars**: Discovery, Booking, Engagement, Partner Management, Core Infrastructure
- **Vertical Organization**: Each pillar is self-contained but interconnected
- **Scalable**: Can run as monolith today, microservices tomorrow
- **Maintainable**: Clear ownership, boundaries, and communication patterns

---

## The 5 Pillars Explained Simply

```
User Journey Through Pillars:

Step 1: DISCOVERY 🔍
       "I want to find a tour in Kamchatka"
       → User browses tours, filters by price/difficulty
       → System shows weather, reviews, availability
       → User clicks "Book Now"

Step 2: BOOKING 💳
       → User selects dates and passengers
       → System checks real-time availability
       → User submits payment
       → Transaction confirmed
       → Booking status: CONFIRMED

Step 3: ENGAGEMENT 💬
       → System awards eco-points for booking
       → Sends notification: "Your tour is confirmed!"
       → User can chat with operator
       → After trip, user can submit review
       → User earns bonus points for review

Step 4: PARTNER MANAGEMENT 👥
       → Operator sees new booking in dashboard
       → Assigns a guide
       → Sends briefing to guide
       → Guide checks schedule and confirms
       → Operator modifies tour availability
       → Agent tracks commission
       → Admin monitors transactions

Step 5: CORE INFRASTRUCTURE 🏗️
       → Runs in the background for all steps
       → Handles authentication (login/register)
       → Manages user profiles
       → Caches search results
       → Logs events
       → Processes webhooks
```

---

## Key Principles

### 1. **One-Way Dependencies**
Discovery pillar can depend on Core Infrastructure, but Core Infrastructure never depends on Discovery.

```
Core ←── All other pillars
  ↑
  │ depends on
  │
Discovery ──→ Booking ──→ Engagement
  ↑              ↑            ↑
  └──────────────┼────────────┴─→ Partner Management
                 └─────────────────→
```

### 2. **Communication via APIs**
When pillars need to share data, they use API endpoints (not direct imports).

```typescript
// ❌ WRONG: Direct import between pillars
import { processTourBooking } from '@/lib/booking';

// ✅ CORRECT: API call (respects boundary)
const response = await fetch('/api/bookings', {
  method: 'POST',
  body: JSON.stringify({ tourId, dates, passengers })
});
```

### 3. **Event-Driven Communication**
Major pillar transitions emit events that other pillars can listen to.

```typescript
// Booking pillar completes a booking
emit('booking.confirmed', { bookingId, userId, tourId });

// Engagement pillar listens
listener('booking.confirmed', async (event) => {
  // Award points
  // Send notification
  // Enable review
});

// Partner Management pillar listens
listener('booking.confirmed', async (event) => {
  // Notify operator
  // Create assignment workflow
});
```

### 4. **Clear Data Ownership**
Each pillar owns specific entities and is the authoritative source for them.

| Pillar | Owns | Authority |
|--------|------|-----------|
| Discovery | Tours, Accommodations, Cars, Gear, Weather | Source of truth for offerings |
| Booking | Bookings, Payments, Cart | Source of truth for transactions |
| Engagement | Reviews, EcoPoints, Chat, Notifications | Source of truth for user engagement |
| Partner Mgmt | Operator/Agent/Admin metrics, Tours config | Source of truth for partner operations |
| Core Infrastructure | Users, Permissions, Sessions, Logs | Source of truth for platform foundation |

---

## Document Guide

### 1. `PILLAR_CLUSTER_ARCHITECTURE.md` ⭐ START HERE
- **Purpose**: Comprehensive system design
- **Contains**: 5 pillars explained, data models, dependency rules, evolution path
- **Best For**: Understanding the big picture
- **Read Time**: 20 minutes

### 2. `PILLAR_CLUSTER_IMPLEMENTATION_GUIDE.md` 🛠️ FOR BUILDING
- **Purpose**: Step-by-step implementation details
- **Contains**: Detailed cluster breakdown, APIs, data flows, best practices
- **Best For**: Writing code that follows the architecture
- **Read Time**: 30 minutes (skim as needed)

### 3. `PILLAR_CLUSTER_VISUAL_GUIDE.md` 📊 FOR QUICK REFERENCE
- **Purpose**: Diagrams and visual organization
- **Contains**: System diagrams, component maps, API endpoints, database schema
- **Best For**: Quick lookups during development
- **Read Time**: 10 minutes (reference as needed)

### 4. `PILLAR_CLUSTER_ENFORCEMENT.md` 🛡️ FOR COMPLIANCE
- **Purpose**: Tools to prevent architecture violations
- **Contains**: ESLint rules, pre-commit hooks, CI/CD validation
- **Best For**: Setting up automated checks
- **Read Time**: 15 minutes (implement as needed)

---

## Common Questions & Answers

### Q: "Should I put this feature in Discovery or Booking?"
**A**: Ask: Does the user discover it first, or do they purchase it first?
- Tour discovery → **Discovery pillar**
- Booking a tour → **Booking pillar**
- Tour details after booking → Still **Discovery pillar** (read-only)

### Q: "Can Booking pillar call Discovery API?"
**A**: ✅ **Yes!** Lower pillars can read (read-only) from higher pillars using their public APIs.

### Q: "Can Discovery pillar import from Booking?"
**A**: ❌ **No!** Only upward dependencies allowed. Use events or webhooks instead.

### Q: "Where does payment processing go?"
**A**: **Booking pillar**. It owns the entire booking lifecycle from cart to confirmation.

### Q: "Where does loyalty points go?"
**A**: **Engagement pillar**. It owns all post-booking user engagement (reviews, points, chat).

### Q: "Where do operator dashboards go?"
**A**: **Partner Management pillar**. It owns all partner-facing interfaces and operations.

### Q: "Should I create a new pillar?"
**A**: **Very rarely.** The 5 pillars cover all business domains. If you think you need a 6th pillar, you likely belong in one of the existing ones.

### Q: "What if a feature needs data from multiple pillars?"
**A**: **Orchestrate at the API layer**. Frontend calls multiple endpoints, or backend aggregates. The pillar that initiates the flow owns the coordination.

---

## Architecture Checklist for New Features

When you're building something new, ask yourself:

### 1. Discovery Phase
- [ ] Which pillar owns this feature?
- [ ] What business domain does it serve?
- [ ] Which user role primarily uses it?

### 2. Design Phase
- [ ] What APIs does it expose?
- [ ] What data does it create/modify/delete?
- [ ] What other pillars does it depend on?
- [ ] Should it emit events?

### 3. Implementation Phase
- [ ] Create files in the correct pillar directory
- [ ] Use correct path aliases (`@/discovery/*`, `@/booking/*`, etc.)
- [ ] Only import from allowed pillars
- [ ] Add types to correct `types/` file
- [ ] Add database tables to correct schema
- [ ] Write tests within pillar scope

### 4. Integration Phase
- [ ] Define API endpoints
- [ ] Set up webhooks if needed
- [ ] Document pillar boundaries
- [ ] Update this architecture guide

### 5. Validation Phase
- [ ] Run `npm run validate-architecture`
- [ ] Check ESLint reports
- [ ] Review for circular dependencies
- [ ] Verify import statements

---

## Real-World Example: Book a Tour End-to-End

### User: "I want to book a hiking tour"

#### 1. Discovery Pillar Involvement
```
User navigates to /tours
├── Gets /api/tours?category=hiking
├── Gets /api/weather/kamchatka
├── Gets /api/tours/{id} for details
└── Sees tour card with "Book Now" button
```

**Pillar Owns**: Search UI, tour listings, filter logic

#### 2. Booking Pillar Involvement
```
User clicks "Book Now"
├── Navigates to /cart
├── Adds tour to cart
├── Proceeds to checkout
├── Enters payment details
├── POST /api/bookings creates booking
├── POST /api/payments processes payment
└── Booking status becomes "CONFIRMED"
```

**Pillar Owns**: Cart, booking creation, payment processing, order management

#### 3. Engagement Pillar Involvement
```
System detects booking.confirmed event
├── Awards 100 eco-points
├── Sends notification: "Your booking confirmed!"
├── Enables review form (visible after trip)
├── Creates chat channel with operator
└── Prepares loyalty rewards
```

**Pillar Owns**: Points award logic, notifications, review forms, chat setup

#### 4. Partner Management Pillar Involvement
```
Operator receives notification
├── Logs into /operator dashboard
├── Sees new booking in list
├── Assigns a guide
├── Sends briefing to guide
├── Modifies tour availability
└── Tracks commission (for agent if applicable)
```

**Pillar Owns**: Operator dashboards, guide assignment, commission tracking

#### 5. Core Infrastructure Supporting All
```
Throughout the journey:
├── Auth checks every request (JWT validation)
├── Database stores all transactions
├── Cache speeds up tour searches
├── Sentry logs any errors
├── Webhooks notify interested services
└── Audit logs track all actions
```

**Pillar Owns**: Foundation for everything

---

## Migration Path: Monolith to Microservices

KamHub currently runs as a **monolithic Next.js app**, but this architecture enables future scaling:

### Phase 1: TODAY (Logical Separation)
```
One Next.js container
├── All code organized by pillar
├── ESLint enforces boundaries
└── Tests run per pillar
```

### Phase 2: SCALING (Service Separation)
```
Five services (if needed):
├── discovery-service (read-heavy, scales more)
├── booking-service (transaction-heavy, scales on traffic)
├── engagement-service (event-driven, scales on events)
├── partner-service (user-bound, seats-based scaling)
└── core-service (shared infrastructure)

Communication: REST APIs + Event Bus (Kafka/RabbitMQ)
```

### Phase 3: OPTIMIZATION (Full Microservices)
```
Fully distributed:
├── Each service has own database
├── Polyglot stack (Node, Python, Go)
├── Independent deployment pipelines
├── Container orchestration (Kubernetes)
└── Full observability (distributed tracing)
```

---

## Performance Implications

### Current (Monolithic)
- ✅ Simple deployment
- ✅ Shared cache
- ✅ One database pool
- ❌ Blast radius on errors
- ❌ Scaling requires scaling everything

### Future (Microservices)
- ✅ Independent scaling per pillar
- ✅ Fault isolation
- ✅ Optimized databases per service
- ✅ Polyglot technology choices
- ❌ Network latency between services
- ❌ Distributed transaction complexity

---

## Enforcement in Your Team

### For Developers
- Follow the path aliases in `tsconfig.json`
- Use ESLint to catch violations early
- Reference pillar guides when adding features
- Ask teammates in code review about pillar placement

### For Tech Leads
- Run `npm run validate-architecture` in CI/CD
- Review architectural violations in PRs
- Update this guide as architecture evolves
- Plan pillar extraction to microservices if needed

### For DevOps
- Monitor pillar performance separately
- Plan for pillar-specific scaling
- Set up alerts per pillar
- Track dependencies for deployment order

---

## Tools & Resources

### Built-in
- ESLint configuration (`.eslintrc.json`)
- TypeScript path aliases (`tsconfig.json`)
- Pre-commit hooks (`.husky/`)
- Validation script (`scripts/validate-architecture.js`)

### Optional
- Depcheck (detect unused imports)
- SonarQube (code quality gates)
- Dependency graph tools (npm+)
- Architecture visualization tools

---

## Getting Started Today

### 1. Read the Architecture
- Start with this file
- Review `PILLAR_CLUSTER_ARCHITECTURE.md`
- Skim `PILLAR_CLUSTER_IMPLEMENTATION_GUIDE.md`

### 2. Set Up Enforcement
- Configure ESLint rules from `PILLAR_CLUSTER_ENFORCEMENT.md`
- Install Husky pre-commit hooks
- Add validation to CI/CD pipeline

### 3. Refactor Existing Code
- Map existing code to pillars (already done in guide)
- Update imports to use correct aliases
- Add missing types to pillar-specific files
- Fix any violations

### 4. Train Your Team
- Share these documents in team meeting
- Discuss pillar placement for new features
- Review architecture in code reviews
- Celebrate clean boundaries

### 5. Monitor Progress
- Run `npm run lint:architecture` regularly
- Track violations over time
- Celebrate zero-violation milestones
- Plan microservice extraction if scaling needed

---

## FAQ: Architectural Decisions

### "Why 5 pillars and not 3 or 10?"

5 pillars map to natural business domains:
1. **Discovery** = Marketing + Catalog
2. **Booking** = Commerce + Transactions
3. **Engagement** = CRM + Community
4. **Partner Management** = Operations + B2B
5. **Core Infrastructure** = Platform foundation

Any fewer and you merge unrelated concerns. Any more and you fragment natural domains.

### "What if I have a feature that touches multiple pillars?"

Orchestrate at the boundary:
- Frontend calls multiple APIs
- Backend aggregation service
- Event-driven coordination
- Never create "bridge" code that directly connects pillars

### "How do I handle database transactions across pillars?"

- **Prefer**: Event-driven with eventual consistency
- **If needed**: Use distributed transactions with saga pattern
- **Avoid**: Synchronous updates across pillar boundaries

### "Can I break the rule if it's just this once?"

Possibly, but:
1. Document it in `ARCHITECTURE_VIOLATIONS.md`
2. Get approval from tech lead
3. Create a task to refactor it later
4. Plan the proper solution

---

## Metrics to Track

Monitor these over time:

| Metric | Target | Current |
|--------|--------|---------|
| Architecture violations | 0 | ? |
| Cross-pillar imports | 0 | ? |
| Test coverage per pillar | >80% | ? |
| Lines of code per pillar | Balanced | ? |
| API response time | <200ms | ? |
| Error rate per pillar | <0.1% | ? |

---

## Support & Feedback

### Questions?
- Review the appropriate guide document
- Check FAQ sections
- Ask in team Slack/chat
- Create an ADR (Architecture Decision Record)

### Improvements?
- Suggest changes to this guide
- Propose new pillar rules
- Share violations and resolutions
- Update documentation as you learn

---

## Conclusion

The **pillar-cluster architecture** provides KamHub with:

✅ **Clear structure** - Everyone knows where code belongs
✅ **Independent teams** - Each pillar can be owned by a team
✅ **Scalability** - From monolith to microservices seamlessly
✅ **Maintainability** - One-way dependencies prevent tangles
✅ **Testing** - Isolated pillars enable focused testing
✅ **Future-proof** - Designed for growth from day one

By following these principles, KamHub can scale from a single-developer prototype to an enterprise platform without major refactoring.

---

## Next Steps

1. **Read** `PILLAR_CLUSTER_ARCHITECTURE.md` (main document)
2. **Implement** enforcement from `PILLAR_CLUSTER_ENFORCEMENT.md`
3. **Reference** `PILLAR_CLUSTER_IMPLEMENTATION_GUIDE.md` when building
4. **Check** `PILLAR_CLUSTER_VISUAL_GUIDE.md` for quick lookups
5. **Validate** with `npm run validate-architecture`
6. **Celebrate** clean architecture! 🎉

---

**Version**: 1.0
**Created**: 2026-01-27
**Last Updated**: 2026-01-27
**Maintainer**: Architecture Team

For updates, feedback, or questions about the pillar-cluster architecture, please open an issue or create an ADR (Architecture Decision Record).
