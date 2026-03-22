# 🚀 PHASE II LIVE — MIGRATION INSTRUCTIONS

**Status:** ✅ Code deployed to main | 🔥 Live on production

**Next:** Apply migrations to production DB

---

## Option 1: Via Production API (Recommended)

Timeweb dashboard → Connect via SSH → Run:

```bash
export ADMIN_JWT="your_admin_token"

curl -X POST https://tourhab.ru/api/admin/migrations/apply \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "migrations": ["054", "0645", "0646", "066"]
  }'
```

**Expected response:**
```json
{
  "success": true,
  "results": [
    {"migration": "054", "status": "success", "message": "Applied successf..."},
    {"migration": "0645", "status": "success", ...},
    {"migration": "0646", "status": "success", ...},
    {"migration": "066", "status": "success", ...}
  ]
}
```

---

## Option 2: Via Node Script (Requires DATABASE_URL)

On machine with DATABASE_URL env set:

```bash
export DATABASE_URL="postgres://..."
node scripts/apply-prod-migrations.js
```

---

## Option 3: Direct psql (Manual)

SSH into Timeweb → psql → Run each migration file:

```sql
\i migrations/054_agent_tables.sql
\i migrations/0645_safety_capacity_layer.sql
\i migrations/0646_agent_memory.sql
\i migrations/066_board_meeting_execution.sql
```

---

## After Migrations Applied: Create Ирина Account

```bash
# Option A: Via Node script (if local access to DB)
export DATABASE_URL="postgres://..."
npx tsx scripts/setup-agent-irina.ts

# Option B: Via curl to API endpoint
curl -X POST https://tourhab.ru/api/admin/users/create-agent \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kamlandinfo@yandex.ru",
    "name": "Ирина (YaKamchatka)",
    "temporary_password": "TempPass2026!"
  }'
```

---

## Verify

```bash
# 1. Check app is live
curl https://tourhab.ru/health

# 2. Ирина can log in
# Go to: https://tourhab.ru/auth/signin
# Email: kamlandinfo@yandex.ru
# Password: TempPass2026!

# 3. Access agent hub
# https://tourhab.ru/hub/agent
```

---

**Status:** ✅ Ready (waiting on you to apply migrations)

When ready, choose one option above and send the output.

