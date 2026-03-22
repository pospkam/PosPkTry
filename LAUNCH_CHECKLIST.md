# PHASE II LAUNCH CHECKLIST

> Quick reference for Owner to go live

**Date:** 23 марта 2026
**Status:** ✅ READY TO LAUNCH (all autonomous work done)

---

## 🚀 TO LAUNCH PHASE II

### Option 1: Automated (Recommended)

```bash
# One command starts everything:
bash scripts/deploy-production.sh

# Outputs:
# ✓ Repo checked (clean)
# ✓ TypeScript verified (0 errors)
# ✓ Migrations applied (054, 0645, 0646, 066)
# ✓ Ирина account created (kamlandinfo@yandex.ru)
# ✓ Code pushed → Timeweb auto-deploys
# ✓ ETA: 10 min total (5 min Docker + 1 min DB + 4 min buffer)

# Test it first:
bash scripts/deploy-production.sh --dry-run
```

### Option 2: Manual Steps

```bash
# Check migrations (preview only)
npx ts-node scripts/run-all-missing-migrations.ts --dry-run

# Apply migrations to prod
npx ts-node scripts/run-all-missing-migrations.ts

# Create Ирина account
npx ts-node scripts/setup-agent-irina.ts

# Deploy
git push origin main
```

---

## ✅ What Gets Deployed

### Database Changes (0 downtime)
- Migration 054: agent_clients, agent_bookings, agent_commissions, commission_payouts
- Migration 0645: safety layer tables (sos_requests, emergency_contacts, etc)
- Migration 0646: agent_memory (for AI learning)
- Migration 066: board_meeting execution tracking

### User Account
- Ирина: kamlandinfo@yandex.ru
- Role: agent
- Temp password: TempPass2026! (change on first login)
- Access: /hub/agent (leads, find-tours, deals)

### Code Changes
- Commission bug fix (auto-create after booking) ✅ LIVE
- Board meeting v2 (topic input + executor tracking) ✅ LIVE
- Agent hub infrastructure ✅ LIVE
- Admin deployment endpoints ✅ NEW

---

## 📊 Expected Results

### Immediate (after deploy)
- ✅ Ирина can log in
- ✅ Commission system working end-to-end
- ✅ Board meeting v2 running with 10 agents
- ✅ Safety layer active

### After Ирина tests (1-2 days)
- ✅ Agent hub stable
- ✅ Leads/find workflow validated
- ✅ Deal creation tested
- ✅ Commission tracking verified

### Phase II Success (1 week)
- ✅ 5-10 real leads from bot/forms
- ✅ Ирина converts 1-2 leads to bookings
- ✅ Commissions calculated + tracked
- ✅ Operator payout workflow validated

---

## 🎯 Architecture Decisions STILL PENDING

You still need to choose (doesn't block launch, but impacts roadmap):

**A. Commission Model**
- [ ] Option 1: Fixed 10% (current, simple)
- [ ] Option 2: Variable 5-15% (complex, more fair)
- [ ] Option 3: Hybrid (base + bonus, complex)

**B. Payout Schedule**
- [ ] Option 1: Weekly (higher overhead)
- [ ] Option 2: Monthly (standard)

**C. Guide Integration**
- [ ] Option 1: Phase 1 (now)
- [ ] Option 2: Phase 2 (later, 2 weeks)

> These don't block launch. Choose anytime in next 48h.

---

## 🔍 Verification After Deploy

```bash
# 1. App is alive
curl -s https://pospkam-pospktry-c1f3.twc1.net/health | jq .

# 2. Ирина can log in
# Go to: https://pospkam-pospktry-c1f3.twc1.net/auth/signin
# Email: kamlandinfo@yandex.ru
# Password: TempPass2026!

# 3. Agent endpoints work
curl -s https://... /api/agent/leads \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Commission system active
# Create booking → should create agent_commissions record
```

---

## 📞 Troubleshooting

**Deploy stuck (Docker still building)?**
- Check: https://timeweb.cloud/my/apps/159529 → Deployments tab
- View logs: Click "View build logs"
- Rollback: `git revert HEAD && git push origin main`

**Ирина can't log in?**
- Verify: `SELECT * FROM users WHERE email = 'kamlandinfo@yandex.ru'`
- Check password hash exists
- Try: Reset password via admin endpoint

**Migrations failed?**
-  Check logs: `schema_migrations` table (what was applied?)
- Manual fix: SQL in `migrations/` can be re-run

---

## 📋 Timeline

```
T+0:   Run deploy script
T+1:   DB migrations applied ✓
T+1:   Ирина account created ✓
T+2:   Code pushed to GitHub
T+5:   Docker building on Timeweb
T+10:  App restarts + live
T+11:  Test Ирина login
T+15:  PHASE II LIVE
```

---

## 🎬 Next Steps (After Launch)

1. **Ирина onboarding** (Day 1-2)
   - She logs in, tests agent hub
   - Creates test booking, verifies commission
   - Sends feedback

2. **Real operator integration** (Day 3-5)
   - Artemiy or other operator joins
   - Creates real tours
   - Ирина finds tours, creates first real lead

3. **Payout workflow** (Day 7)
   - Commission payout system tested
   - Operator receives first payout

4. **Scale to 3-5 agents** (Week 2)
   - More agents onboarded
   - Dashboard monitoring commission volume

---

## 🆘 Emergency Contacts

**Deploy breaks production?**
- Rollback code: `git revert && git push`
- Rollback DB: Contact Timeweb for restore from backup
- Fix locally: `npx ts-node scripts/...` to debug

**Questions?**
- Check: `/GOVERNANCE.md` (governance rules)
- Check: `docs/COMMISSION_MODEL.md` (commission system)
- Check: `docs/FAST_DEPLOY_GUIDE.md` (deploy details)

---

##  READY?

**Yes → Run:**
```bash
bash scripts/deploy-production.sh
```

**Testing first → Run:**
```bash
bash scripts/deploy-production.sh --dry-run
```

**Questions → Read:**
```bash
cat docs/FAST_DEPLOY_GUIDE.md
```

---

**Status:** 🟢 GO / NO-GO (your call, Owner)

Last updated: 23 марта 2026 (commit e93732d)
