# 🌀 Evolution Loop Setup Guide

Setup для автономной эволюции на GitHub Actions + локальная разработка.

---

## 📋 **GitHub Actions Configuration**

### Step 1: Add Secrets to GitHub

Go: `Settings → Secrets and variables → Actions`

Add these secrets:

| Secret | Value | Source |
|--------|-------|--------|
| `TOURHAB_URL` | `https://tourhab.ru` | Production URL |
| `CRON_SECRET` | `93cb1fbc1...` | Timeweb Cloud env vars |
| `DATABASE_URL` | `postgres://...` | Timeweb Cloud env vars |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic console |
| `OPENROUTER_API_KEY` | `sk-or-...` | OpenRouter dashboard |
| `DEEPSEEK_API_KEY` | `sk-...` | DeepSeek console |
| `TELEGRAM_CHAT_ID` | `123456789` | Telegram channel ID |
| `TELEGRAM_BOT_TOKEN` | `123:ABC...` | Telegram bot token |

### Step 2: Verify Workflow

1. Open: `.github/workflows/evolution-loop.yml`
2. Check schedule: `0 * * * *` = every hour at :00
3. Test manually: `Actions → Evolution Loop → Run workflow`

---

## 🏃 **Local Development**

### Setup

```bash
# 1. Clone repo
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry

# 2. Install deps
npm install

# 3. Create .env.local
cp .env.example .env.local
```

### .env.local

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/tourhab
TOURHAB_URL=http://localhost:3000
CRON_SECRET=your_secret_here

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
DEEPSEEK_API_KEY=sk-...

# Notifications
TELEGRAM_BOT_TOKEN=123:ABC...
TELEGRAM_CHAT_ID=123456789
TELEGRAM_CHANNEL_ID=-1003519846560
```

### Run Local

```bash
# Test mode (no real changes)
DRY_RUN=true node scripts/evolution-runner.js

# Production mode (actually executes)
node scripts/evolution-runner.js
```

### Watch Output

```bash
# JSON structured logs
node scripts/evolution-runner.js | jq '.stage, .message'

# Pretty print
node scripts/evolution-runner.js | jq '.'
```

---

## 📊 **Monitor Results**

### Check Status

```bash
# Latest evolution run
curl https://tourhab.ru/api/cron/evolution-loop/status | jq '.last_evolution_run'

# Recent initiatives
curl https://tourhab.ru/api/cron/evolution-loop/status | jq '.recent_initiatives'
```

### GitHub Actions UI

1. Go: `Actions → Evolution Loop`
2. Click on last run
3. Logs show JSON output

---

## 🔧 **Troubleshooting**

### "CRON_SECRET not found"

Check Timeweb Cloud:
- App 159529 → Settings → Environment Variables
- Verify `CRON_SECRET` exists

### "Database connection failed"

```bash
# Test connection locally
psql $DATABASE_URL -c "SELECT 1"
```

### "Dry run keeps passing, real run fails"

1. Check AI keys: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`
2. Check board-meeting endpoint: `https://tourhab.ru/api/cron/board-meeting`
3. Set `CRON_SECRET` in .env.local

---

## 📈 **Schedule Options**

Edit `.github/workflows/evolution-loop.yml`:

```yaml
schedule:
  # Every hour (default)
  - cron: '0 * * * *'

  # Twice a day (8am, 8pm UTC)
  - cron: '0 8,20 * * *'

  # Every 30 minutes
  - cron: '0,30 * * * *'

  # Weekdays at 9am UTC
  - cron: '0 9 * * 1-5'
```

---

## ✅ **Production Checklist**

Before enabling on GitHub Actions:

- [ ] All AI keys are valid and active
- [ ] Database connection works
- [ ] CRON_SECRET is correct
- [ ] Telegram notifications configured
- [ ] Dry run passes (`DRY_RUN=true`)
- [ ] One manual test passes
- [ ] Logs are clean (no errors)

---

## 🚀 **Deployment Flow**

```
GitHub Actions (hourly) →
  ↓
  scripts/evolution-runner.js
  ↓
  POST /api/cron/board-meeting (trigger)
  ↓
  13 Board Members (parallel)
  ↓
  Initiatives → ai_actions_log (DB)
  ↓
  GET /api/cron/evolution-loop/status (check)
  ↓
  Telegram notification + logs
```

---

## 📞 **Support**

For issues:
1. Check GitHub Actions logs
2. Run locally with `DRY_RUN=true`
3. Verify all .env vars are set
4. Check prod endpoint: `https://tourhab.ru/api/cron/evolution-loop/status`
