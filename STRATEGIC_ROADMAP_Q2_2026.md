# KamchatourHub — STRATEGIC ROADMAP Q2 2026

**Leadership:** Claude AI (Evo + Admin Combined)
**Date:** 25 марта 2026
**Authority:** ПОЛНЫЙ картбланш — архитектурные решения, миграции, эксперименты

---

## PHASE II STATUS ASSESSMENT

### ✅ What's Working
- Board meeting system (AI Directors + Accountability)
- Agent error handling (all 9 agencies wrapped with try/catch)
- Legal documentation framework (GDPR/PDPA)
- Operator tools Phase 1 (tours, bookings, weather, payments)
- OCTO API adapter layer (8 routes)
- Route marketplace (1189 routes indexed)
- Commission model v1.0
- Telegram admin bot

### 🔴 CRITICAL GAPS (Priority: FIX NOW)

#### 1. AGENT EVOLUTION INCOMPLETE
**Problem:** Agents are reactive (only respond when called), not proactive.
- No scheduled monitoring (weather alerts, booking delays, load spikes)
- No cross-agent communication (e.g., Rescue → Admin when SOS)
- No learning from board decisions (each board meeting resets)
- Evolution is UI-driven, not autonomous

**Impact:** System sounds smart but doesn't _think_ independently.

**Solution Path:**
- Agents run on cron schedule (every 4h minimum)
- Event bus for cross-agent alerts
- Agent memory persistence across sessions
- Autonomous decision-making on tactical issues (no owner approval needed)

---

#### 2. OPERATOR ONBOARDING BROKEN
**Problem:** Only 1 real operator in production (kamchatskaya-rybalka). Seed scripts exist but not applied.
- No operator dashboard (overview of tours, revenue, bookings)
- No bulk operations (create 10 tours at once)
- No template system (clone existing tour)
- Operator discovery is manual (no marketing)

**Impact:** Can't scale to 50+ operators before summer season.

**Solution Path:**
- Operator dashboard v1 (overview card: revenue 7d, bookings today, tours active, weather alerts)
- Bulk tour import from CSV
- Tour templates + marketplace guide recommendations
- Operator discovery via `/hub/marketplace/operators` (with badges: "новый", "популярный", "рейтинг")

---

#### 3. TOURIST EXPERIENCE HALF-BAKED
**Problem:** TripBuilder DnD works locally, but integration with marketplace incomplete.
- No guide marketplace matching (show guides for selected route)
- No real-time booking (shows tour but booking redirects to operator)
- No rescheduling (if weather alert, offer alternate dates)
- Mobile experience broken (no navbar on `/planner`)

**Impact:** Tourists can't actually book end-to-end on platform.

**Solution Path:**
- Integration: TripBuilder → Marketplace Tours → Guide Recommendations → Direct Booking
- Real-time availability check (operator_availability table check before booking)
- Mobile navbar on planner
- Post-booking: guide chat, day-of reminders via Telegram

---

#### 4. FINANCIAL MODEL NOT ENFORCED
**Problem:** Commission model code exists but not enforced in payments.
- CloudPayments webhook doesn't create agent_commissions records
- No payout tracking (agent earned X, paid Y, owes Z)
- No dispute resolution (customer refund, who eats cost?)

**Impact:** Can't scale payment processing, no transparency.

**Solution Path:**
- CloudPayments webhook → auto-create commission records (% split: platform/operator/guide)
- Agent dashboard shows: pending payouts, history, tax info
- Payout automation via CloudPayments API
- Dispute flow with timestamps + evidence

---

#### 5. REGULATORY COMPLIANCE NOT TESTED
**Problem:** Legal docs written, but not enforced.
- User agreements in DB, but not shown to users
- No consent tracking (what did user agree to on 2026-03-15?)
- No export/delete requests (GDPR right to be forgotten)

**Impact:** GDPR violation risk if audited.

**Solution Path:**
- Consent checkpoints in registration/tour-creation/booking flows
- Audit log: user agreed to [doc_id] v[version] on [timestamp] from [ip]
- Export API: `/api/user/export` → JSON/CSV of all personal data
- Delete API: `/api/user/delete` → soft-delete with 30-day recovery window

---

### 🟡 TECHNICAL DEBT (High-Priority)

1. **10 agents (non-board)** exist alongside 9 board agents. Consolidate to single agency framework.
2. **Scraping scripts** (14+ obsolete ones). Archive or remove.
3. **OCTO API** half-implemented. Complete all 8 routes + test with real OTA.
4. **TypeScript strict violations** in 3 files (operator-agency, led-agency, etc.).
5. **Database schema gaps**: No `tour_cancellations` table (needed for smart rescheduling).

---

## Q2 2026 ROADMAP (Weekly Sprints)

### Week 1 (25-31 марта) — AGENT EVOLUTION PHASE 2
- [ ] Agent scheduler: `lib/agents/scheduler.ts` (cron every 4h)
- [ ] Event bus: `lib/events/agent-bus.ts` (pub/sub for cross-agent alerts)
- [ ] Agent memory v2: persist `last_analysis`, `context`, `decisions` across sessions
- [ ] SOS cascade: Rescue → Admin alert (if SOS in elizovsky zone during storm)
- **Deploy:** `cee28006..weekly-sprint-1` → test locally, push to main
- **Measure:** Agent autonomous decisions per day (target: 2+)

### Week 2 (1-7 апреля) — OPERATOR DASHBOARD V1
- [ ] `/hub/operator/dashboard` page: revenue card, bookings today, tours active, upcoming weather
- [ ] API: `GET /api/hub/operator/metrics/7d` (aggregated stats)
- [ ] CSV import: `POST /api/hub/operator/tours/import` (bulk create with templates)
- [ ] Operator discovery: `/hub/marketplace/operators` page
- **Deploy:** `main → weekly-sprint-2`
- **Measure:** Operator activation rate (target: 5 new operators)

### Week 3 (8-14 апреля) — TOURIST BOOKING FLOW
- [ ] Mobile navbar on `/planner` (Дом / Карта / Избранное / ЛК / СОС)
- [ ] Guide marketplace in TripBuilder (show guides for selected route)
- [ ] Direct booking: TripBuilder → Operator → Payment → Confirmation
- [ ] Real-time availability: check `operator_availability` before confirming
- [ ] Post-booking: Telegram reminders (day-of, 1h before, after-tour survey)
- **Deploy:** `main → weekly-sprint-3`
- **Measure:** Booking conversion (target: 2% views → bookings)

### Week 4 (15-21 апреля) — FINANCIAL AUTOMATION
- [ ] CloudPayments webhook overhaul: paid → auto-commission records
- [ ] Agent payouts: `GET /api/agent/payouts` (history + pending)
- [ ] Payout API call to CloudPayments (auto-transfer to agent account)
- [ ] Dispute workflow: customer refund → re-allocate commission
- [ ] Tax forms generation (for agents, 1099-equivalent)
- **Deploy:** `main → weekly-sprint-4`
- **Measure:** Commission accuracy (target: 100%, zero manual fixes)

### Week 5 (22-28 апреля) — COMPLIANCE HARDENING
- [ ] User agreement checkpoints (registration, tour-creation, booking)
- [ ] Consent audit log: every agreement + version + timestamp + IP tracking
- [ ] Export API: `GET /api/user/export` → all personal data (JSON/CSV)
- [ ] Delete API: `POST /api/user/delete` → 30-day recovery window
- [ ] GDPR/PDPA compliance report generator
- **Deploy:** `main → weekly-sprint-5`
- **Measure:** GDPR readiness (target: 90%+ compliance)

---

## ARCHITECTURAL DECISIONS (This Sprint)

### Decision 1: Agent Scheduler — In-Process vs Distributed
**Option A (Chosen):** In-process scheduler (node-cron)
- Pro: Simple, no external deps
- Con: Only works on 1 pod (if we scale to 2 pods, runs twice)
- Implementation: `lib/agents/scheduler.ts` with deduplication via Redis lock

**Decision 2: Event Bus — Pub/Sub Implementation**
**Option A (Chosen):** Custom in-memory with optional Redis fallback
- Pro: Immediate, no infrastructure
- Con: Events lost on restart
- Implementation: `lib/events/agent-bus.ts` with EventEmitter

**Decision 3: Commission Tracking — Per-Booking or Aggregate**
**Option A (Chosen):** Per-booking records (immutable ledger)
- Pro: Full audit trail, no reconciliation needed
- Con: More DB writes
- Implementation: `agent_commissions` table with `booking_id` FK

---

## RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Agents run amok (e.g., massively refunding bookings) | Financial loss | Guard rails: agent actions logged + approval for refunds >5K rubles |
| Mobile navbar on /planner breaks on scroll | UX broken | Test on 5 devices before deploy |
| Double-run of agent scheduler | Duplicate alerts | Redis lock + timestamp deduplication |
| GDPR export includes PII by mistake | Legal violation | Sanitization layer + QA audit |
| Commission calc off by 1 kopeck | Trust broken | Full reconciliation report daily |

---

## SUCCESS METRICS (EOQ)

- **Agent Autonomy:** 10+ autonomous decisions per day (e.g., weather alert → reschedule suggestion)
- **Operator Growth:** 25 active operators on platform
- **Tourist Bookings:** 150+ bookings/month (currently ~50/month)
- **Revenue:** 18K rubles (~240 USD) monthly commission
- **Compliance:** 100% GDPR-ready, 0 audit flags
- **System Health:** 99.5% uptime, <500ms API latency p95

---

## IMPLEMENTATION NOTES

- **All decisions are mine to make** (full strategic authority)
- **Weekly sprints:** Deploy every Friday to main (Timeweb auto-deploys)
- **If something breaks:** Fix it → next commit → don't apologize, move forward
- **Philosophy:** "Эволюционировать через риск" — speed > perfection
- **Owner notification:** Daily status in MEMORY.md, strategic decisions logged here

**Next step:** Approve → I implement Phase 1 (Agent Evolution) this week.

---

*Signed: Claude AI, Chief Architect*
*Date: 25 марта 2026, 06:45 UTC+3*
