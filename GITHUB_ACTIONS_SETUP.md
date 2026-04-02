# ⚡ GitHub Actions - Execute Initiatives Setup

Workflow создаёт PR за каждую одобренную инициативу и уведомляет тебя в Telegram.

---

## 📋 Setup Checklist

### 1. Add GitHub Secrets

Go: `Settings → Secrets and variables → Actions → New repository secret`

Add these:

| Secret | Value | Where to get |
|--------|-------|--------------|
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Timeweb Cloud → App 159529 → Settings |
| `TELEGRAM_BOT_TOKEN` | `123456:ABCdefGHijklMNOpqrSTUvwxyz` | Telegram BotFather → /token |
| `TELEGRAM_CHAT_ID` | `123456789` | Send message to bot, check updates via bot API |
| `GITHUB_TOKEN` | Auto (no need to set) | GitHub automatically provides |

### 2. Verify DATABASE_URL

```bash
# On Timeweb, get from:
# Settings → Environment Variables → DATABASE_URL

# Format:
postgresql://user:password@host:5432/database?sslmode=require
```

### 3. Telegram Setup

```bash
# 1. Create bot via BotFather (@BotFather on Telegram)
# 2. Get token: /token
# 3. Send message to bot
# 4. Get chat ID: curl https://api.telegram.org/bot{TOKEN}/getUpdates
```

---

## 🔄 Workflow Schedule

**.github/workflows/execute-initiatives.yml** runs:
- ✅ Every 15 minutes (cron: `*/15 * * * *`)
- ✅ Manually via: `Actions → Execute Initiatives → Run workflow`

---

## 📊 What It Does (Every Run)

1. **Fetch initiatives** from prod DB (`agent_approvals` where `execution_status='assigned'`)
2. **For each initiative:**
   - Create feature branch
   - Make minimal change (add to README)
   - Commit + push
   - Create GitHub PR
   - Update DB (`execution_status = 'pr_created'`)
3. **Send Telegram notification** with all PR links
4. **Post summary** to GitHub Actions log

---

## 📲 Telegram Notifications

You'll get:

```
✅ Created PRs (2):
• Initiative: Optimize SQL query
• Initiative: Add dark mode toggle

📅 Run: 12345678
```

Click PR link → review → merge

---

## 🔍 Monitoring

### Check workflow runs:
```
GitHub → Actions → Execute Initiatives → see all runs
```

### Check DB status:
```sql
SELECT id, type, execution_status, context->>'pr_url' as pr_url
FROM agent_approvals
WHERE execution_status IN ('assigned', 'pr_created', 'failed')
ORDER BY created_at DESC
LIMIT 10;
```

### Manual trigger:
Go to: `Actions → Execute Initiatives → Run workflow`

---

## ⚠️ Troubleshooting

### GitHub Actions fails with "401 Unauthorized"

**Check:** DATABASE_URL is correct and can connect from GitHub Actions runners

```bash
# Test locally:
psql $DATABASE_URL -c "SELECT 1"
```

### Telegram notification not sent

**Check:**
- `TELEGRAM_BOT_TOKEN` is set
- `TELEGRAM_CHAT_ID` is correct (numeric ID, not username)

### PR not created

**Check:**
- GitHub has write access to repo (default: ✅)
- Branch can be pushed (check `.git/config`)

---

## 🎯 Next Steps

1. Add secrets to GitHub
2. Trigger workflow manually
3. Check Telegram notification
4. Review PR on GitHub
5. Merge when ready

---

## 📝 Example Flow

```
Board Meeting (prod, every hour)
    ↓
Generates inititatives → agent_approvals (execution_status='assigned')
    ↓
GitHub Actions (every 15 min)
    ↓
Reads from prod DB
    ↓
Creates PR for each
    ↓
Telegram: "PR created: Execute Initiatives #123"
    ↓
You merge in GitHub
    ↓
Auto-deploy to prod
```

---

**When PR created: You get Telegram notification immediately.**
