# ПЛАН: Fix Intelligence System — Critical Bugs First

**Date:** 2026-04-14  
**Status:** 🔴 CRITICAL ISSUES FOUND  
**Scope:** 3-4 дня (fixes + observability)  

---

## 🔴 РЕАЛЬНАЯ БОЛЕЗНЬ (не UI, а потеря данных)

### Critical Issues Found:

| # | Issue | Impact | Fix Time |
|---|-------|--------|----------|
| 1 | Scout endpoint MISSING | Scout-Innovator never runs | 30 min |
| 2 | Silent DB errors | All memories get lost | 20 min |
| 3 | Timing attacks on cron | CRON_SECRET can be hacked | 45 min |
| 4 | RSS errors gluedin | Periodic data loss | 30 min |
| 5 | No retry logic | Network hiccup = lost signals | 1 hour |
| 6 | AI errors silent | Findings disappear | 20 min |
| 7 | Hardcoded RSS URLs | Brittle to changes | 1 hour |
| 8 | TTL deletes needed data | Intelligence expires in 7 days | 30 min |

---

## 🎯 ПЕРЕСТРОЕННЫЙ ПЛАН

### **Phase 1: FIX CRITICAL BUGS (1 день)**

#### 1.1 Create Missing Scout Endpoint
- **File:** `/app/api/cron/scout/route.ts` (NEW)
- **What:** Endpoint that workflow calls at 06:00 UTC
- **Calls:** Scout-Innovator agent (generate evolutionary proposals)
- **Stores:** results in `agent_knowledge` (permanent) + `agent_memory` (7d TTL)

#### 1.2 Fix Silent Database Errors
- **File:** `/lib/agents/memory/agent-memory.ts` (lines 108-110, 157-160, etc)
- **Problem:** `catch { }` blocks silence DB errors
- **Fix:**
  ```typescript
  } catch (err) {
    console.error('[agent-memory] DB error:', err);
    throw err;  // or return false + check caller
  }
  ```
- **Impact:** Now we'll see when memories fail to save

#### 1.3 Fix Timing Attack Vulnerabilities (18 endpoints)
- **Files:** All `/app/api/cron/*.ts` endpoints
- **Problem:** Use `secret !== cronSecret` (vulnerable to timing attacks)
- **Fix:** Use `timingSafeCompare(secret, cronSecret)` in ALL cron endpoints
- **Endpoints to fix:**
  - `/app/api/cron/scout-digest/route.ts`
  - `/app/api/cron/watchdog/route.ts`
  - `/app/api/cron/editor/route.ts`
  - `/app/api/cron/intelligence/route.ts` (already correct)
  - And 14 others...

---

### **Phase 2: IMPROVE RELIABILITY (1 день)**

#### 2.1 Add Logging to RSS Fetch
- **File:** `/lib/services/intelligence-monitor.service.ts` (lines 165-167, 196-198, 218-220)
- **Problem:** `catch { return []; }` — no visibility
- **Fix:**
  ```typescript
  } catch (err) {
    console.error(`[intelligence] Failed to fetch ${url}:`, err.message);
    return [];
  }
  ```

#### 2.2 Add Retry Logic (3x with backoff)
- **File:** `/lib/services/intelligence-monitor.service.ts` (line 155)
- **Problem:** Single 8-second timeout → data loss on network hiccups
- **Fix:**
  ```typescript
  async function fetchWithRetry(url, maxAttempts = 3) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fetch(url, { signal: AbortSignal.timeout(8000) });
      } catch (err) {
        if (i === maxAttempts - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // backoff
      }
    }
  }
  ```

#### 2.3 Fix AI Analysis Error Handling
- **Files:** 
  - `/lib/services/intelligence-monitor.service.ts` (lines 328-330)
  - `/lib/agents/scout-digest.ts` (lines 142-144)
- **Problem:** AI fails → `return null` → no findings
- **Fix:**
  ```typescript
  } catch (err) {
    console.error('[intelligence] AI analysis failed:', err.message);
    return {
      summary: 'AI analysis unavailable',
      urgency: 'informational',
      confidence: 0.3
    };
  }
  ```

---

### **Phase 3: FIX CONFIGURATION (0.5 дня)**

#### 3.1 Move RSS URLs to Database
- **Table:** `intelligence_sources` (NEW)
  ```sql
  CREATE TABLE intelligence_sources (
    id UUID PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    category VARCHAR(50),           -- 'rss', 'api_tavily', 'api_brave'
    domain VARCHAR(50),             -- 'ai_tech', 'travel', 'competitors'
    active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    fetch_error_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **Seed:** Move hardcoded URLs from code → table
- **Update:** Intelligence Monitor reads from table (not hardcoded)

#### 3.2 Fix TTL Strategy
- **File:** `/lib/agents/memory/agent-memory.ts` (line 180)
- **Problem:** Intelligence expires in 7 days (gets deleted)
- **Fix:**
  - Intelligence: 30 days TTL (or no TTL for critical)
  - Temporary signals: 7 days TTL
  - Use `memory_tier` to distinguish (core = no ttl, archival/recall = ttl)

---

### **Phase 4: OBSERVABILITY (1 день)**

#### 4.1 Cron Execution History
- **Table:** `agent_run_history` (NEW)
  ```sql
  CREATE TABLE agent_run_history (
    id UUID PRIMARY KEY,
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
  ```
- **Updated by:** Each cron endpoint logs its run

#### 4.2 Admin Pages for Debugging
- **Pages:**
  - `/hub/admin/memory/intelligence` — Dashboard (show last 30 runs, error trends)
  - `/hub/admin/memory/sources` — Manage RSS sources (add/remove/test)
  - `/hub/admin/memory/history` — View cron execution history + errors
  - `/api/admin/test/fetch/:source_id` — Test single RSS source right now

#### 4.3 Manual Testing Endpoints
- **Endpoints:**
  - `GET /api/admin/test/intelligence` → Run Intelligence Monitor NOW (not cron)
  - `GET /api/admin/test/scout-digest` → Run Scout Digest NOW
  - `GET /api/admin/test/rss?url=...` → Test single RSS URL
  - `POST /api/admin/memory/inject` → Manual signal injection (for testing)

---

## 💾 Database Changes

**New Tables:**
- `intelligence_sources` — RSS/API source management
- `agent_run_history` — Audit trail for cron jobs

**New Columns (in existing tables):**
- None (reuse existing `agent_memory`, `agent_knowledge`)

---

## 📊 Verification Plan

### Before Fixes:
```sql
SELECT COUNT(*) FROM agent_memory WHERE memory_type = 'intelligence' AND created_at > NOW() - '24 hours'::interval;
-- Result: 0 or very few (data lost)
```

### After Phase 1-2:
```sql
SELECT COUNT(*) FROM agent_memory WHERE memory_type = 'intelligence' AND created_at > NOW() - '24 hours'::interval;
-- Result: 50+ (data is flowing)
```

### After Phase 4:
```sql
SELECT agent_id, status, COUNT(*) FROM agent_run_history GROUP BY agent_id, status;
-- Result: Shows which runs succeeded/failed + error trends
```

---

## 📁 Critical Files to Modify

**New (CREATE):**
- `/app/api/cron/scout/route.ts` — Missing Scout endpoint
- `/app/api/admin/test/[name]/route.ts` — Testing endpoints
- `/app/api/admin/memory/inject/route.ts` — Manual injection
- `/app/hub/admin/memory/intelligence/page.tsx` — Dashboard
- `/app/hub/admin/memory/sources/page.tsx` — Source management
- `/app/hub/admin/memory/history/page.tsx` — Execution history
- `/migrations/XXX_intelligence_sources.sql` — New table
- `/migrations/XXX_agent_run_history.sql` — New table

**Modify (FIX):**
- `/lib/agents/memory/agent-memory.ts` — Add error logging
- `/lib/services/intelligence-monitor.service.ts` — Add logging + retry + error handling
- `/lib/agents/scout-digest.ts` — Add error handling
- `/app/api/cron/scout-digest/route.ts` — Fix timing attack + add logging
- `/app/api/cron/watchdog/route.ts` — Fix timing attack
- `/app/api/cron/editor/route.ts` — Fix timing attack
- (+ 15 other cron endpoints) — Fix timing attacks
- `/lib/services/intelligence-monitor.service.ts` (line ~60) — Switch to DB sources

---

## ⏱ Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **1** | Fix critical bugs (missing endpoint, silent errors, security) | 2 hours | 🔴 DO FIRST |
| **2** | Improve reliability (logging, retry, error handling) | 3 hours | 🔴 DO FIRST |
| **3** | Fix configuration (RSS DB, TTL strategy) | 2 hours | 🟠 HIGH |
| **4** | Add observability (dashboard, testing) | 4 hours | 🟡 MEDIUM |

**Total:** ~3-4 дней

---

## ✅ Expected Result

- ✅ Scout Digest actually runs (endpoint exists)
- ✅ All errors are logged (we see what breaks)
- ✅ Retry logic stops losing data on network hiccups
- ✅ RSS sources managed from DB (not hardcoded)
- ✅ Intelligence memories don't expire (30-day TTL)
- ✅ TTL security fixed (no timing attacks)
- ✅ Admin can test RSS sources and debug failures
- ✅ Execution history shows why things broke
- ✅ System reliable, observable, manageable

**From:** "Memory parsing doesn't work, data is lost"  
**To:** "Memory parsing works, we see everything, we can fix it"

---

**This is the REAL plan, not symptoms.**
