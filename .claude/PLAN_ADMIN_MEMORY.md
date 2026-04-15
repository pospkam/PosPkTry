# ПЛАН: Fix Intelligence System — COMPLETED 2026-04-15

**Date:** 2026-04-15  
**Status:** 100% DONE  
**Audited:** код проверен, дубликаты убраны  

---

## ✅ УЖЕ ИСПРАВЛЕНО (не трогать)

| # | Issue | Commit/Status |
|---|-------|---------------|
| 1 | Scout endpoint missing | ✅ `/api/cron/scout/route.ts` exists |
| 2 | RSS fetch errors not logged | ✅ `fetchFeed` logs errors |
| 3 | No retry logic | ✅ `fetchWithRetry()` with exponential backoff |
| 4 | AI analysis errors silent | ✅ `console.error` added |
| 5 | TTL 7 days deletes intel | ✅ Changed to 30 days |
| 6 | `remember()` silent errors | ✅ Logs errors now |

---

## ❌ ОСТАЛОСЬ СДЕЛАТЬ

### Task 1: 🔴 CRITICAL — Fix Timing Attacks (10 endpoints)

**Problem:** 10 cron endpoints use `secret !== cronSecret` (vulnerable to timing attacks)  
**13 endpoints already fixed** (use `timingSafeCompare`)

**Files to fix:**
```
app/api/cron/tour-reminder/route.ts
app/api/cron/kb-gap/route.ts
app/api/cron/abandoned-bookings/route.ts
app/api/cron/smart-notify/route.ts
app/api/cron/trip-reminders/route.ts
app/api/cron/followups/route.ts
app/api/cron/sos-events-bridge/route.ts
app/api/cron/memory-bridge/route.ts
app/api/cron/channel-sync/route.ts
app/api/cron/support-escalate/route.ts
```

**Fix:** Replace `secret !== cronSecret` with `!timingSafeCompare(secret, cronSecret)`  
**Time:** 30 min  

---

### Task 2: 🟠 HIGH — Fix Silent Catches in agent-memory.ts

**File:** `/lib/agents/memory/agent-memory.ts`  
**Problem:** ~10 catch blocks return empty silently (no logging)

**Lines to fix:**
```
Line 155: catch { return []; }          — recall()
Line 174: catch { return []; }          — recallByTags()
Line 188: catch { return 0; }           — cleanup()
Line 203: catch { return 0; }           — count()
Line 228: catch { return []; }          — search()
Line 263: catch { return []; }          — getByAgent()
Line 280: catch { return null; }        — getByKey()
Line 328: catch { }                     — forget()
Line 349: catch { }                     — update()
```

**Fix:** Add `console.error('[agent-memory] methodName failed:', err);` before return  
**Time:** 20 min  

---

### Task 3: 🟡 MEDIUM — Move RSS URLs from Code to DB

**Problem:** RSS sources hardcoded in `INTELLIGENCE_DOMAINS` (lines 57-107)  
**Current:** 11 RSS URLs + 3 search queries in code  
**Desired:** Sources stored in `intelligence_sources` table, editable from admin

**Steps:**
1. Create migration: `intelligence_sources` table
2. Seed: current 11 RSS URLs + metadata
3. Update `intelligence-monitor.service.ts`: read from DB instead of hardcoded
4. Create API: `/api/admin/memory/sources` (GET/POST/PATCH/DELETE)
5. Create UI: `/hub/admin/memory/sources` page

**Migration:**
```sql
CREATE TABLE intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  category VARCHAR(50),           -- 'rss', 'api_tavily', 'api_brave'
  domain VARCHAR(50),             -- 'ai_tech', 'travel_industry', 'competitors'
  label TEXT,
  active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_error_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_intelligence_sources_active ON intelligence_sources(active, domain);
```

**Time:** 3 hours  

---

### Task 4: 🟢 OBSERVABILITY — Admin Dashboard + History

**Problem:** No visibility into what agents do, no execution history, no manual testing

**Steps:**

#### 4.1 Execution History Table
```sql
CREATE TABLE agent_run_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50),
  run_started_at TIMESTAMPTZ,
  run_ended_at TIMESTAMPTZ,
  status VARCHAR(20),             -- 'success', 'partial', 'failed'
  items_processed INT,
  items_created INT,
  errors_count INT,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_run_history ON agent_run_history(agent_id, run_started_at DESC);
```

#### 4.2 Admin Pages (3 pages)
- `/hub/admin/memory/sources` — CRUD RSS sources (add/edit/toggle/delete/test)
- `/hub/admin/memory/intelligence` — Dashboard (stats, last runs, error trends)
- `/hub/admin/memory/history` — Execution history (last 30 runs per agent)

#### 4.3 Admin APIs
- `GET /api/admin/memory/sources` — list sources
- `POST /api/admin/memory/sources` — add source
- `PATCH /api/admin/memory/sources/[id]` — edit source
- `DELETE /api/admin/memory/sources/[id]` — deactivate
- `GET /api/admin/memory/stats` — memory statistics
- `POST /api/admin/memory/inject` — manual signal injection
- `GET /api/admin/memory/list` — browse all memories with filters

#### 4.4 Manual Test Endpoints
- `POST /api/admin/test/rss` — test single RSS URL
- `POST /api/admin/test/intelligence` — run Intelligence Monitor NOW
- `POST /api/admin/test/scout-digest` — run Scout Digest NOW

**Time:** 4 hours  

---

## ⏱ ОБНОВЛЁННЫЙ TIMELINE

| Task | Priority | Time | Status |
|------|----------|------|--------|
| Fix timing attacks (10 endpoints) | 🔴 CRITICAL | 30 min | TODO |
| Fix silent catches (agent-memory.ts) | 🟠 HIGH | 20 min | TODO |
| Move RSS to DB + admin | 🟡 MEDIUM | 3 hours | TODO |
| Observability (history + dashboard) | 🟢 NICE | 4 hours | TODO |

**Total remaining:** ~8 hours (~1.5 дня)

---

## ✅ EXPECTED RESULT

After all tasks:
- ✅ ALL cron endpoints secure (timingSafeCompare)
- ✅ ALL errors logged (no silent failures)
- ✅ RSS sources in DB (admin can add/remove)
- ✅ Execution history tracked
- ✅ Admin dashboard shows what's happening
- ✅ Manual testing possible from admin

**From:** "50% fixed but still blind"  
**To:** "100% fixed, observable, manageable"
