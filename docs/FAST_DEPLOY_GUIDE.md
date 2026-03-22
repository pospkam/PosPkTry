# Fast Deploy Guide

> How to deploy to production with minimal blocking

---

## Current State

- App: Next.js 15 on Timeweb Cloud (App ID: 159529)
- Deploy time: ~7-10 minutes (Docker build + npm ci + restart)
- Bottleneck: Docker build + `npm ci` with NODE_ENV=production

---

## Fast Path: Database + Schema Changes

### 1. Apply Migrations Locally (< 1 min)

```bash
# Dry run first (no changes)
npx ts-node scripts/run-all-missing-migrations.ts --dry-run

# Apply all pending migrations
npx ts-node scripts/run-all-missing-migrations.ts
```

**What happens:**
- Reads all `*.sql` files in `migrations/`
- Tracks applied via `schema_migrations` table
- Transactions rollback on error
- Idempotent (safe to re-run)

### 2. Create Ирина Account (< 30 sec)

```bash
# After migrations applied
npx ts-node scripts/setup-agent-irina.ts
```

**Output:**
```
User ID:    <uuid>
Email:      kamlandinfo@yandex.ru
Password:   TempPass2026! (send securely)
Login URL:  https://tourhab.ru/auth/signin
```

### 3. Deploy Code (7-10 min)

```bash
git push origin main
# → GitHub webhook triggers Timeweb deploy
# → Auto-deploy without waiting
```

**Timeweb does:**
1. Git pull
2. Docker build (~5-7 min)
3. npm start
4. Health check + restart

---

## Parallel Approach (Fastest)

**Step 1 (parallel):**
```bash
# Terminal 1: Start code deploy
git push origin main

# Terminal 2: Apply DB changes while deploy is running
npx ts-node scripts/run-all-missing-migrations.ts
npx ts-node scripts/setup-agent-irina.ts

# Terminal 3: Monitor deploy
watch -n 5 'curl -s https://pospkam-pospktry-c1f3.twc1.net/health || echo waiting'
```

**Benefits:**
- DB + user setup happens WHILE Docker is building (saves ~5 min)
- By time app restarts, DB is already ready
- Zero waiting on deploy

---

## Optimization Opportunities (Future)

### 1. Reduce Docker Build Time
- [ ] Cache node_modules in Docker layer
- [ ] Use npm ci --prefer-offline
- [ ] Multi-stage build for production

### 2. Faster Migrations
- [ ] Background schema changes (non-blocking)
- [ ] Index creation in parallel
- [ ] Defer non-critical migrations to post-deploy

### 3. Health Checks
- [ ] GET /health endpoint (< 5ms)
- [ ] Deep health check: GET /health?deep (checks DB)
- [ ] Monitor in real-time during deploy

### 4. Zero-downtime Deploys
- [ ] Blue-green deployment
- [ ] Feature flags for risky changes
- [ ] Canary rollout to 10% users first

---

## Current Deploy Checklist

```bash
# Pre-deploy (on local machine)
npx tsc --noEmit           # Type check
npx vitest run             # Tests (if needed)
git push origin main       # Commit + push

# Post-deploy (verify)
curl -s https://tourhab.ru/health | jq .       # App ready?
curl -s https://tourhab.ru/api/agents/activity | jq .  # API works?
```

---

## Timeweb Dashboard

**Monitor deploy progress:**
1. Go to https://timeweb.cloud/my/apps/159529
2. Check "Deployments" tab
3. View logs: "View build logs"
4. Rebuild if needed: "Force rebuild"

---

## Rollback (if something breaks)

```bash
# Rollback code (previous commit)
git revert HEAD
git push origin main

# Rollback DB (if migrations are problematic)
# Manual: SSH to Timeweb, run script to revert
# Need: Database backup + rollback script
```

---

## Metrics to Track

- **Time to deploy:** From `git push` to app ready
- **DB migration time:** Time to apply schema changes
- **Health check:** Time for LS to healthy state
- **User impact:** Any errors/downtime

**Target:** < 15 min total (5min code + 1min DB + 9min Docker)

