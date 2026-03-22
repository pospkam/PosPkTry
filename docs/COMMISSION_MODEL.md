# KamchatourHub Commission Model

**Last Updated:** 22 марта 2026

---

## Overview

KamchatourHub uses a **multi-tier commission model** for agents, operators, and platform revenue.

```
Tourist Payment
     ↓
[Operator gets base revenue]
[Agent  gets 10% commission]
[Platform keeps processing fee]
```

---

## Agent Commission System

### Current Model (v1.0)

**Rate:** 10% flat of booking total_price

**Tables:**
- `agent_bookings` — bookings created by agents for their clients
- `agent_commissions` — commission records (1:1 with agent_bookings)
  - amount: 10% of booking total_price
  - rate: 10 (percentage)
  - status: pending → paid

### Booking Lifecycle

```
1. Agent creates booking via /api/agent/bookings POST
   ├─ INSERT agent_bookings (agent_id, client_id, tour_id, total_price, ...)
   └─ INSERT agent_commissions (agent_id, booking_id, amount=total_price*0.1, status='pending')

2. Tourist pays (external payment system)
   ├─ Payment webhook updates agent_bookings.payment_status = 'paid'
   └─ Later: PATCH agent_commissions.status = 'paid' (manual or cron)

3. Payout (monthly)
   ├─ SUM(agent_commissions WHERE agent_id=X AND status='paid')
   └─ Create commission_payouts record
```

### Auto-Tracking (CRITICAL FIX 22 марта)

⚠️ **BUG FIXED:** agent_commissions was NOT auto-created when booking was created.

**Fix:** After INSERT into agent_bookings, immediately INSERT into agent_commissions:
```sql
INSERT INTO agent_commissions (agent_id, booking_id, amount, rate, status)
VALUES ($1, $2, $3, $4, 'pending')
```

**Implementation:** `/app/api/agent/bookings/route.ts` lines 214-219

---

## Operator Commission (Future)

**Current:** Flat rate to operator for tour
**Future Options:**
- A) Variable tier (5-15% based on operator rating)
- B) Revenue share (% of THEIR revenue, not tour price)
- C) Hybrid (base + performance bonus)

⚠️ **AWAITING OWNER DECISION** (Architecture Decision A)

---

## Platform Revenue

**Current:**
- Processing fee: 2-5% embedded in payment (CloudPayments negotiation)

**Future:**
- Commission on operator revenue
- Premium feature fees (analytics, marketing tools)

---

## Payout Schedule

⚠️ **AWAITING OWNER DECISION** (Architecture Decision B)

**Options:**
- Weekly: Higher frequency, more admin overhead
- Monthly: Industry standard

---

## Audit

### Verify Commission Tracking
```sql
-- How many bookings of agent X don't have commissions?
SELECT COUNT(DISTINCT ab.id) as bookings_without_commission
FROM agent_bookings ab
LEFT JOIN agent_commissions ac ON ab.id = ac.booking_id
WHERE ab.agent_id = 'UUID'
  AND ac.id IS NULL;
-- Should return 0 after fix
```

### Commission Total by Agent
```sql
SELECT
  ab.agent_id,
  COUNT(ab.id) as booking_count,
  SUM(ac.amount) as total_commission,
  SUM(CASE WHEN ac.status='paid' THEN ac.amount ELSE 0 END) as paid_commission
FROM agent_bookings ab
JOIN agent_commissions ac ON ab.id = ac.booking_id
WHERE ab.agent_id = 'UUID'
GROUP BY ab.agent_id;
```

---

## Next Steps (Phase I-II)

- [ ] Test commission creation with multiple bookings
- [ ] Verify payout calculation (monthly reconciliation)
- [ ] Operator decision: Commission model type (A/B/C)
- [ ] Operator decision: Payout frequency (weekly/monthly)
- [ ] Implement payout API endpoint
- [ ] Implement payout webhook for payment confirmation

---

**Status:** ✅ Core tracking working | 🟡 Payout automation pending | 🔴 Long-term strategy pending
