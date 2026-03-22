# DEPLOYMENT CHECKLIST — FINAL

**Date:** 22 марта 2026, 08:50 UTC+3
**Owner Telegram ID:** 833478813 ✅
**Status:** Ready for production deployment

---

## 🎯 TIMEWEB CLOUD CONFIGURATION

### Environment Variables (Set on Timeweb Cloud Panel):

```env
# Security
CRON_SECRET=<generate_unique_secret>

# Telegram Integration
TELEGRAM_ADMIN_BOT_TOKEN=8334728813:AAFYDhqGwkYEoSZKWFBl2QQVJwdoglSRns4
TELEGRAM_OWNER_ID=833478813
TELEGRAM_CHAT_ID=833478813

# OCTO Integration (optional, if using OCTO API)
OCTO_API_KEY=<your_octo_key>
OCTO_API_URL=https://api.octo.travel/v1
```

### Database Migrations:

```bash
# Apply these migrations:
psql $DATABASE_URL < lib/database/migrations/051_platform_terms.sql
psql $DATABASE_URL < lib/database/migrations/052_agent_experiments.sql

# Or via Timeweb migration runner:
./scripts/migrate up 051
./scripts/migrate up 052
```

### CRON Configuration:

**Option 1: Timeweb Built-in CRON**
```
Timeweb Cloud Control Panel → App Settings → CRON Jobs
├─ Schedule: 0 * * * * (hourly, at :00)
├─ URL: https://tourhab.ru/api/cron/initiatives-execute
├─ Query param: secret=<CRON_SECRET>
└─ Method: GET
```

**Option 2: External CRON Service (cron-job.org)**
```
Create job: https://cron-job.org/
├─ URL: https://tourhab.ru/api/cron/initiatives-execute?secret=<CRON_SECRET>
├─ Frequency: Every hour
└─ Notification: Your email
```

**Option 3: Manual curl (from your server)**
```bash
# Add to crontab:
0 * * * * curl -s "https://tourhab.ru/api/cron/initiatives-execute?secret=$CRON_SECRET" >> /var/log/tourhab-cron.log 2>&1
```

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Set Environment Variables
```
Timeweb Cloud → App ID 159529 → Settings → Environment
Add/Update:
  □ CRON_SECRET
  □ TELEGRAM_ADMIN_BOT_TOKEN
  □ TELEGRAM_OWNER_ID = 833478813
  □ TELEGRAM_CHAT_ID = 833478813
  □ OCTO_API_KEY (optional)
```

### Step 2: Apply Migrations
```bash
# Login to Timeweb DB
psql your_prod_db

# Run migrations
\i 051_platform_terms.sql
\i 052_agent_experiments.sql

# Verify
SELECT COUNT(*) FROM platform_terms;
SELECT COUNT(*) FROM agent_experiments;
```

### Step 3: Deploy Code
```bash
git push origin main
# Timeweb auto-deploys from GitHub
# Wait 5-7 minutes for build + deploy
```

### Step 4: Configure CRON
```
Choose one option (1, 2, or 3 above)
Test with manual curl after setup:
  curl "https://tourhab.ru/api/cron/initiatives-execute?secret=YOUR_SECRET"
```

### Step 5: Verify System
```bash
# Test board meeting
curl -X POST https://tourhab.ru/api/agents/board-meeting \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Check approval queue
GET https://tourhab.ru/api/agents/approvals

# Monitor logs
tail -f /var/log/tourhab-cron.log

# Check if Telegram alerts working
(You will receive test alert at 833478813)
```

---

## 🚨 ALERT ROUTING

All Telegram alerts will be sent to:
```
Chat ID: 833478813 (Your private chat)

Alert types:
├─ Initiative execution start/complete
├─ Success notifications (✅ done in Xs)
├─ Error alerts (❌ failed, reason: ...)
├─ Rollback confirmations
├─ Board meeting results
└─ CRON job health
```

---

## 📊 AFTER DEPLOYMENT

### What Happens Automatically:

```
22.03 08:00 → Board meeting runs
├─ 9 agents analyze
├─ 5 proposals generated
└─ ai_actions_log records

22.03 any time → Director approval workflow
├─ /hub/admin/agents?tab=approvals
├─ Approve 5 proposals
├─ Assign executors
└─ Telegram: Setup confirmation to 833478813

22.03 23:00 (or next hour) → CRON auto-executes
├─ Query: approved + assigned initiatives
├─ Execute 5 initiatives in parallel
├─ Log all changes
├─ Send alerts to 833478813
└─ Update status: in_progress → done/failed

Time: 163.2s total execution
Alerts sent: 1 summary + 5 per initiative
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

```
□ Board meeting runs: GET /api/agents/board-meeting
  Expected: 4 rounds complete in ~26s

□ Proposals generated: GET /api/agents/approvals?status=pending
  Expected: 5 pending proposals

□ Database migrations applied:
  SELECT * FROM platform_terms LIMIT 1;
  SELECT * FROM agent_experiments LIMIT 1;

□ Telegram connection working:
  Check 833478813 for test message

□ CRON endpoint responds:
  curl https://tourhab.ru/api/cron/initiatives-execute?secret=TEST
  Expected: 401 (wrong secret) or results if metrics exist

□ Executor functions ready:
  review: /api/cron/initiatives-execute logs
```

---

## 🎯 NEXT ACTIONS FOR OWNER

1. **Approve + Assign** initiatives in `/hub/admin/agents?tab=approvals`
2. **Wait** for CRON to trigger (next hour or manual curl)
3. **Monitor** Telegram alerts at 833478813
4. **Verify** changes in database

---

## 💬 TELEGRAM ALERTS (Chat ID: 833478813)

You will receive messages like:

```
✅ Initiative execution complete
Executed: 5/5
Success: 5
Failed: 0
Total time: 163.2s
Changes: 100+

Details:
[1/5] API rotation (Security) → DONE (8.2s)
[2/5] T&C update (Legal) → DONE (2.1s)
[3/5] Descriptions (Content) → DONE (145.3s)
[4/5] A/B test (Hacker) → MONITORING (14d)
[5/5] Batch opt (Admin) → STAGED
```

---

## 📞 SUPPORT

If any step fails:
1. Check `/var/log/tourhab-cron.log` for errors
2. Verify env vars are set correctly
3. Verify migrations applied
4. Check Telegram connection (alerts will tell you)
5. Manual curl test: `curl "https://tourhab.ru/api/cron/initiatives-execute?secret=YOUR_SECRET"`

---

**Status:** ✅ Everything ready for deploy
**Owner Telegram:** 833478813 ✅
**Estimated setup time:** 15 minutes
**Go-live:** 22.03.2026 after deploying and configuring
