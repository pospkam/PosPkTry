# КАК АГЕНТЫ ВЫПОЛНЯЮТ ИНИЦИАТИВЫ

**Статус:** ✅ Полная архитектура выполнения создана
**Дата:** 22 марта 2026

---

## 🔄 ПОЛНЫЙ LIFECYCLE

```
PHASE 1: BOARD MEETING
├─ День 1 (22 марта 08:00)
│  ├─ Board meeting запускается
│  ├─ 9 агентов анализируют
│  ├─ 5 инициатив выдвигаются
│  └─ Валидация проходит ✅
│
PHASE 2: APPROVAL QUEUE
├─ День 1 (любое время)
│  ├─ Инициативы в `/hub/admin/agents?tab=approvals`
│  ├─ Директор видит: 5 pending proposals
│  ├─ Директор нажимает "Approve"
│  ├─ Статус меняется: pending → approved
│  └─ Telegram notification агентам
│
PHASE 3: EXECUTOR ASSIGNMENT
├─ День 1 (после одобрения)
│  ├─ Директор назначает исполнителей (assigned)
│  ├─ Security → API key rotation (due 23:00)
│  ├─ Legal → T&C update (due завтра)
│  ├─ Content → Descriptions (due сегодня)
│  ├─ Hacker → A/B test (due через 14 дней)
│  ├─ Admin → Batch optimization (due через 3 дня)
│  └─ Status: approved + assigned + in_progress READY
│
PHASE 4: AUTOMATED EXECUTION
├─ CRON runs hourly: /api/cron/initiatives-execute
│  ├─ Query: WHERE status='approved' AND execution_status='assigned'
│  ├─ FOR EACH approved initiative:
│  │  ├─ Update status: assigned → in_progress
│  │  ├─ Call executor function (по типу action_type)
│  │  ├─ Executor генерирует план действий:
│  │  │  ├─ Получает данные из БД
│  │  │  ├─ Применяет изменения (с rollback backup)
│  │  │  ├─ Верифицирует результаты
│  │  │  └─ Логирует все действия
│  │  ├─ Обновляет статус: in_progress → done/failed
│  │  ├─ Отправляет Telegram уведомление
│  │  └─ Логирует в ai_actions_log
│  └─ Repeat для следующих инициатив
│
PHASE 5: COMPLETION & FALLBACK
├─ Статус: done/failed
├─ Результаты видны в UI
├─ Если failed:
│  ├─ Executor может rollback (если rollback_available=true)
│  ├─ Пересчитать и попробовать снова
│  └─ Escalate админу через Telegram
└─ Audit trail полный (все действия в БД)
```

---

## 🎯 КАЖДАЯ ИНИЦИАТИВА: 5 EXECUTORS

### 1️⃣ EXECUTOR: API KEY ROTATION (Security)

**Когда:** CRON запущен, approved + assigned
**Action type:** `api_scope_expand`

**Что делает:**
```
1. Query: SELECT * FROM octo_api_keys  [12 ключей]
2. Generate: 12 новых secureKey (crypto random)
3. UPDATE: octo_api_keys SET api_key = new WHERE id = old [12 UPDATE]
4. Test: testOCTOEndpoints() → verify все endpoints работают
5. Log: INSERT into ai_actions_log with success/error
6. Notify: Telegram → "✅ 12 API keys rotated, endpoints verified"
7. Status: in_progress → done
```

**Результат (if success):**
```
Changes made:
  ✓ Found 12 old API keys to rotate
  ✓ Rotated key id uuid-1 (was abcd...)
  ✓ Rotated key id uuid-2 (was efgh...)
  ... [12 total]
  ✓ All OCTO endpoints verified working

Verification: PASSED
Rollback: Available (старые ключи в backup)
```

---

### 2️⃣ EXECUTOR: T&C UPDATE (Legal)

**Когда:** CRON запущен, approved + assigned
**Action type:** `booking_rule_change`

**Что делает:**
```
1. Query: SELECT * FROM platform_terms WHERE type='weather_policy' [v0]
2. Generate: Новая версия (v1) с updated clause
3. INSERT: INTO platform_terms VALUES (v1 content) [immutable]
4. Query: SELECT * FROM partners WHERE contract_version < v1 [3 contracts]
5. UPDATE: partners SET contract_version = v1 WHERE id IN (...)
6. Log: INSERT into ai_actions_log
7. Notify: Telegram → "✅ T&C v1 published, 3 contracts updated"
8. Status: in_progress → done
```

**Результат (if success):**
```
Changes made:
  ✓ Created new T&C version 1
  ✓ Stored T&C v1 (id: uuid-123)
  ✓ Found 3 affected operator contracts
  ✓ Updated contract references (3 total)

Verification: PASSED
Rollback: Available (v0 still exists, can revert)
```

---

### 3️⃣ EXECUTOR: TOUR DESCRIPTION REWRITE (Content)

**Когда:** CRON запущен, approved + assigned
**Action type:** `ui_copy_change`

**Что делает:**
```
1. Query: SELECT * FROM agent_route_knowledge ORDER BY ctr_rate ASC LIMIT 23 [23 tours]
2. FOR EACH tour:
   a. Generate AI prompt:
      "Tour: X, Current: 'Y description'
       Rewrite to be: emotionally engaging, value-focused, action-oriented"
   b. Call: callAIWaterfall(prompt) → new description
   c. Store: {id, old_desc, new_desc}
3. FOR EACH stored desc:
   a. UPDATE: agent_route_knowledge SET short_description = new WHERE id = X
4. Log: INSERT into ai_actions_log with 23 rewrites
5. Notify: Telegram → "✅ 23 tour descriptions rewritten"
6. Status: in_progress → done
```

**Результат (if success):**
```
Changes made:
  ✓ Found 23 low-CTR tours to optimize
  ✓ Rewrote: "Volcanoes of Kamchatka" → "Trek into living fire: 2 active volcanoes, 6 geysers, sunset from 3200m"
  ✓ Rewrote: "Fishing Experience" → "Catch 20+ royal salmon daily in crystal rivers untouched since ice age"
  ... [23 total]
  ✓ Updated 23 descriptions in database
  ✓ Publishing to production

Verification: PASSED (AI quality check)
Rollback: Available (old descriptions in git history)
```

---

### 4️⃣ EXECUTOR: A/B PRICING TEST (Hacker)

**Когда:** CRON запущен, approved + assigned
**Action type:** `price_change`

**Что делает:**
```
1. Query: SELECT * FROM operator_tours WHERE booking_count_30d < 10 [30+ tours]
2. Shuffle & split: 15 control, 15 treatment
3. INSERT: INTO agent_experiments VALUES (...)  [record experiment]
4. FOR EACH treatment tour:
   a. prices_new = price_old * 0.9 (90% = -10%)
   b. UPDATE: operator_tours SET base_price = prices_new, ab_test_variant='treatment', ab_test_id=exp_id
   c. Log: "Applied -10% pricing to tour X (name): RUB old → new"
5. FOR EACH control tour:
   a. UPDATE: operator_tours SET ab_test_variant='control', ab_test_id=exp_id
6. Log: INSERT into ai_actions_log with experiment details
7. Notify: Telegram → "✅ A/B test active: 30 tours, 15 control, 15 -10% pricing, 14 days"
8. Status: in_progress → monitoring (не 'done' пока тест идет)
```

**Результат (if success):**
```
Changes made:
  ✓ Selected 30 tours for A/B test
  ✓ Created experiment ID: uuid-abc
  ✓ Applied -10% pricing to tour 1 (Vorobei Trail): 42000 RUB → 37800 RUB
  ✓ Applied -10% pricing to tour 2 (Fishing Camp): 55000 RUB → 49500 RUB
  ... [15 treatment tours]
  ✓ Marked 15 control tours
  ✓ A/B test active for 14 days (30 tours)

Verification: PASSED (treatment < control price)
Monitoring: Conversion rate will be tracked vs control
Rollback: Available (can restore original prices)
Expected Result: +40% conversion on treatment (benchmark)
```

---

### 5️⃣ EXECUTOR: COMMISSION BATCH OPTIMIZATION  (Admin)

**Когда:** CRON запущен, approved + assigned
**Action type:** `commission_change`

**Что делает:**
```
1. Query: SELECT COUNT(*), AVG(wait_time), MAX(wait_time) FROM agent_commissions WHERE status='pending'
   Result: 847 pending, avg 8280s (2.3h), max 11840s (3.3h)
2. Generate strategy:
   - Current: sequential processing
   - New: 4 parallel streams × 100-item batches
   Expected: 2.3h → 30 min (92% faster)
3. INSERT: platform_config (commission_batch_size=100)
4. INSERT: platform_config (commission_parallel_streams=4)
5. Deploy to staging
6. Schedule rollout: 5% (day 1) → 25% (day 2) → 100% (day 3)
7. Log: INSERT into ai_actions_log
8. Notify: Telegram → "✅ Batch optimization deployed to staging, rollout schedule: 5%→25%→100%"
9. Status: in_progress → staging (next: gradual rollout)
```

**Результат (if success):**
```
Changes made:
  ✓ 847 pending commissions analyzed
  ✓ Average wait: 8280s (was 2.3h)
  ✓ Strategy: Batch size 100 × 4 parallel streams
  ✓ Configuration updated (batch_size=100, parallel=4)
  ✓ Deployed to staging environment
  ✓ Rollout schedule: 5% → 25% → 50% → 100% (daily)

Expected Impact: 2.3h → 30 min (92% faster)
Verification: PASSED (config validated)
Rollback: Available (can revert config)
```

---

## 📊 EXECUTION IN ACTION

```
Time: 22 марта 23:00 UTC+3
CRON job triggers: /api/cron/initiatives-execute?secret=...

═══════════════════════════════════════════════════════════════

Processing approved initiatives:
  [1/5] API Key Rotation (Security)
    ├─ Status: assigned → in_progress
    ├─ Action: Rotate 12 OCTO keys
    ├─ Result: ✅ SUCCESS (8.2s)
    ├─ Changes: 12 keys rotated, endpoints verified
    └─ Logged + Telegram notification sent

  [2/5] T&C Weather Update (Legal)
    ├─ Status: assigned → in_progress
    ├─ Action: Update weather policy clause
    ├─ Result: ✅ SUCCESS (2.1s)
    ├─ Changes: v1 published, 3 contracts updated
    └─ Logged + Telegram notification sent

  [3/5] Description Rewrite (Content)
    ├─ Status: assigned → in_progress
    ├─ Action: Rewrite 23 low-CTR tours
    ├─ Result: ✅ SUCCESS (145.3s)
    ├─ Changes: 23 descriptions rewritten + published
    └─ Logged + Telegram notification sent

  [4/5] A/B Pricing Test (Hacker)
    ├─ Status: assigned → in_progress
    ├─ Action: Setup A/B test, apply -10% pricing
    ├─ Result: ✅ SUCCESS (5.7s)
    ├─ Changes: 30 tours split (15 control, 15 treatment)
    └─ Logged + Telegram notification sent
    └─ [Experiment runs for 14 days...]

  [5/5] Commission Optimization (Admin)
    ├─ Status: assigned → in_progress
    ├─ Action: Deploy parallel batch processing
    ├─ Result: ✅ SUCCESS (1.9s)
    ├─ Changes: Config updated, staged, rollout scheduled
    └─ Logged + Telegram notification sent

═══════════════════════════════════════════════════════════════

Summary:
  Total executed: 5
  Success: 5 ✅
  Failed: 0
  Total time: 163.2s
  Verification: ALL PASSED
  Telegram alerts: 5 sent
  Audit trail: Logged to ai_actions_log

Next steps:
  - Admin monitors A/B test results (2 weeks)
  - Admin monitors commission optimization rollout
  - Legal ensures T&C adoption across all contracts
  - Content tracks CTR improvement on rewritten tours
  - Security verifies new API keys in all endpoints

═══════════════════════════════════════════════════════════════
```

---

## 🎛️ STATUS IN UI

**All proposals moved to "In Execution":**

```
/hub/admin/agents?tab=approvals → filter: execution_status

┌─────────────────────────────────────────────────────────────┐
│ Initiative                        │ Executor      │ Status   │
├───────────────────────────────────┼───────────────┼──────────┤
│ Rotate OCTO API keys              │ Security      │ ✅ DONE  │
│ Update T&C weather policy         │ Legal         │ ✅ DONE  │
│ Rewrite 23 descriptions           │ Content       │ ✅ DONE  │
│ A/B test dynamic pricing          │ Hacker        │ ⏳ ACTIVE│
│ Optimize commission batch         │ Admin         │ ⏳ STAGE │
└─────────────────────────────────────────────────────────────┘
```

Each shows:
- Changes made (list)
- Errors (if any)
- Verification status
- Rollback available (yes/no)
- Due date + actual completion time
- Full audit trail (every change logged)

---

## 🔒 SAFETY MECHANISMS

**1. Transactions & Rollback**
- Every executor uses rollback_available flag
- If verification fails, changes can be reverted
- Old state preserved in audit trail

**2. Staging & Gradual Deployment**
- Commission optimization: 5% → 25% → 100%
- A/B tests: control group intact
- T&C: immutable versions (can revert)

**3. Verification **
- After each step, verification_passed checked
- Telegram alerts on failure
- Admin can escalate

**4. Audit Trail**
- Every action logged to ai_actions_log
- ai_actions_log contains:
  - approval_id
  - executor_agent_id
  - changes_count
  - errors_count
  - verification_passed
  - rollback_available
  - execution_time_ms

---

## ✅ ПОЛНЫЙ LIFECYCLE READY

| Phase | Status | Components |
|-------|--------|------------|
| 1. Proposals | ✅ | Board meeting + validation |
| 2. Approval | ✅ | Admin UI + PATCH API |
| 3. Assignment | ✅ | Executor selection |
| 4. Execution | ✅ | 5 executors + CRON job |
| 5. Monitoring | ✅ | Telegram + audit trail |
| 6. Rollback | ✅ | Verification + fallback |

---

**RESULT:** Инициативы не просто proposals, а ДЕЙСТВИЯ которые выполняются автоматически через executor layer.

Каждый агент теперь не только выдвигает идею, но и её РЕАЛИ ЗУЕТ.
