# KamchatourHub — 90-Day Architecture Roadmap

**Годограф:** 22 марта — 20 июня 2026
**Режим:** Claude AI как Chief Architect + Technical Lead
**Owner:** Ultimate override на любую решение

---

## I. КРИТИЧЕСКАЯ ФАЗА (Неделя 1-2: 22-31 марта)

### P0 — Stabilization (ВЫПОЛНЯЮ БЕЗ ОТСРОЧЕК)

- [ ] **Fix: Commission INSERT bug**
  - agent_bookings POST → должен создавать agent_commissions
  - Risk: Medium (data integrity)
  - Files: `app/api/hub/operator/bookings/`, `lib/api/operator-tours.ts`
  - Status: READY (осталось применить)

- [ ] **Apply migrations to production**
  ```
  054: agent_clients, agent_bookings, agent_commissions (существ)
  064: safety_capacity_layer (новая) + agent_memory (новая)
  066: board_meeting_execution (новая) ← DONE локально
  ```
  - Verification: SELECT COUNT(*) from each table
  - Rollback plan: DB snapshot перед каждой миграцией

- [ ] **Verify integrations after migrations**
  - Test: /api/agent/leads, /api/agent/find-tours, /api/agent/dashboard
  - Test: /hub/agent/* pages (leads, find, deals)
  - Test: /api/agents/board-meeting с topic + approvals

### P1 — Data Integrity Check
- [ ] Audit: agent_approvals (status, executor_agent_id consistency)
- [ ] Audit: operator_tours (commission rates, pricing)
- [ ] Audit: tour_availability (overlapping slots)

---

## II. OPERATOR ONBOARDING (Неделя 3-4: 1-14 апреля)

### Create Agent Infrastructure

- [ ] **Ирина (YaKamchatka) account creation**
  - Email: ✍️ ТРЕБУЕТСЯ ОТ OWNER
  - Role: agent
  - Permissions: view leads, find tours, manage deals
  - Database: INSERT into users + agent_settings

- [ ] **Agent Hub stabilization**
  - /hub/agent/leads — pagination, filters, bulk actions
  - /hub/agent/find — search optimization, price ranges
  - /hub/agent/deals — deal lifecycle (new → closed/lost)

- [ ] **Test with real operator**
  - Lead generation test
  - Tour discovery workflow
  - Deal creation feedback

---

## III. CORE PLATFORM (Неделя 5-8: 15-30 апреля)

### Architecture Decisions (ТРЕБУЮ ОДОБРЕНИЯ)

**Decision A: Commission Model**
- Current: Fixed 10% per agent booking
- Options:
  1. Variable commission (5-15% by agent tier)
  2. Revenue share model (% of operator income)
  3. Hybrid: base + performance bonus
- **REQUIRE:** Owner choice + financial impact analysis

**Decision B: Payment Infrastructure**
- CloudPayments webhook: ✅ Ready (migration 040)
- Payouts to operators: Not implemented yet
- Payouts to agents: Not implemented yet
- **REQUIRE:** Payout schedule (weekly/monthly?)

**Decision C: Guide/Rafting Integration (migration 065)**
- Table: guides (id, name, specialty, rating)
- Table: guide_availability (date, lead_count)
- Table: guide_assignments (booking_id, guide_id)
- **REQUIRE:** Do we launch this in Phase 1 or Phase 2?

### Features to Build

- [ ] **Payment Payout System**
  - Operator payouts via CloudPayments
  - Automatic reconciliation
  - Tax compliance (Russian requirements)

- [ ] **Guide Marketplace** (if Decision C = YES)
  - Guide profile + ratings
  - Availability calendar
  - Tour assignments

- [ ] **Analytics Dashboard** (for Owner)
  - Revenue (total, operator, agent, platform)
  - Booking metrics (conversion, average price, repeat rate)
  - User retention

---

## IV. SCALE & OPTIMIZATION (Неделя 9-12: 1-15 мая)

### Performance

- [ ] Database query optimization
  - Identify slow queries (GraphQL-like N+1 issues)
  - Add indexes where needed
  - Benchmark: /map должна быть < 500ms

- [ ] Caching strategy
  - Redis for: routes, routes search, operator tours
  - TTL: 5-60 минут (в зависимости)

- [ ] API rate limiting
  - Current: Upstash-based
  - Verify: public endpoints (leads, routes, search)

### Monitoring

- [ ] Observability stack
  - Error tracking: current (if any?)
  - Logging: structured logs to Timeweb logs
  - Metrics: request latency, error rates

---

## V. ADVANCED FEATURES (Неделя 13-16: Май-июнь)

### AI Direction Evolution

- [ ] **Planning Agent (новое)**
  - Интент: predict_demand (demand forecasting)
  - Data: historical bookings + seasonality
  - Output: tour recommendations by month

- [ ] **Loyalty System** (migration 048 exists)
  - Tier progression: Новичок → Платина
  - Points redemption
  - Referral rewards

- [ ] **OCTO API** (migrations 045-046 exist)
  - Prepare for OTA integration (Tiqets, Headout)
  - Booking lifecycle: ON_HOLD → CONFIRMED → REDEEMED

### Dynamic Pricing (если Owner захочет)

- [ ] Price optimization algorithm
  - Input: demand, inventory, competition
  - Output: recommended price range
  - Risk: May impact operators if not communicated

---

## VI. QUALITY & HARDENING (On-going)

### Testing

- [ ] Unit tests: 80%+ coverage for critical paths
- [ ] Integration tests: API workflows
- [ ] E2E tests: User journeys (booking flow)

### Security

- [ ] Penetration test (security workshop)
- [ ] SQL injection audit (finish)
- [ ] CSRF tokens on admin forms
- [ ] Rate limiting verification

### Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema diagram
- [ ] Deployment runbook
- [ ] Disaster recovery plan

---

## VII. GOVERNANCE & REPORTING

### Daily Standup (EOD)
```
Summary (2-3 lines)
Completed: [.md diff]
In Progress: [current task]
Blockers: [if any]
Approvals needed: [yes/no]
```

### Weekly Review (Mondays)
```
## Week X Status

### Metrics
- Commits: N
- Tests: passed/total
- Performance: avg latency
- Errors: 0/N critical

### Risks
- [list]

### Next Week Priority
- P0: [tactical]
- P1: [strategic]
```

### Architecture Reviews (Bi-weekly)
- Decision rationale
- Trade-offs considered
- Owner feedback loop

---

## VIII. CRITICAL SUCCESS FACTORS

### Must-Have (Deal Breakers)
- ✅ Zero security breaches
- ✅ 99%+ API uptime
- ✅ Data consistency (no orphaned records)
- ✅ Owner approval on all major decisions

### Should-Have
- ✅ < 2% error rate
- ✅ < 1s p99 latency
- ✅ 80%+ test coverage

### Nice-to-Have
- ✅ Full OpenAPI documentation
- ✅ CD pipeline improvements
- ✅ Developer experience tooling

---

## APPROVAL GATES

**Before I execute on Sections I-II:**
```
APPROVAL_REQUEST: Commission bug fix + migrations to production

Type: critical-fix
Impact: high
Summary: Fix data integrity issue in commission system; apply pending DB migrations
Details: [SEE ABOVE]
Risks: If migrations fail, could lock production DB
Rollback: Database snapshot exists; can restore
Timeline: 2-3 hours for Section I
```

**Before Section III (Architecture Decisions A-C):**
```
APPROVAL_REQUEST: Core platform architecture decisions

Type: architecture
Impact: critical
Decisions needed:
  A. Commission model (1/2/3)
  B. Payout schedule (weekly/monthly)
  C. Guide integration (Phase 1/2)
Owner input: Strategic direction needed
```

---

## TIMELINE SUMMARY

| Phase | Duration | Status | Exit Criteria |
|-------|----------|--------|--------------|
| I. Critical Fix | 1 week | ⏱️ Waiting approval | All migrations applied, zero errors |
| II. Operator Setup | 1 week | 📋 Ready | Ирина account active, hub tested |
| III. Core Platform | 2 weeks | 📋 Blocked on decisions | Commission + payout working |
| IV. Scale | 2 weeks | 📋 Queued | Performance benchmarks met |
| V. Advanced | 2 weeks | 📋 Queued | New features shipped |
| VI. Quality | On-going | ✅ Active | Tests + security passing |

---

**Next Action:** ⚠️ REQUIRE OWNER INPUT

I'm ready to execute. Awaiting:
1. Production migration approval (green light)
2. Ирина email address
3. Architecture decisions (A, B, C)

Then proceeding without further blocks.

