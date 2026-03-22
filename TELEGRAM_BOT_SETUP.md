# Private Telegram Bot Setup

**Owner-Only Communication Channel**

Your personal bot for real-time platform updates and commands.

---

## Configuration

### Step 1: Set Environment Variables on Timeweb

1. Go to: https://timeweb.cloud/my/apps/159529 → "Environment"
2. Add these variables:

```bash
TELEGRAM_ADMIN_BOT_TOKEN=<your_bot_token_from_botfather>
TELEGRAM_OWNER_ID=833478813  # Your actual Telegram user ID
```

3. Save and redeploy (auto-restart)

---

### Step 2: Register Webhook

After deployment is live, run this command:

```bash
curl -X POST "https://api.telegram.org/bot<your_bot_token>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tourhab.ru/api/telegram/admin",
    "secret_token": "kh-admin-webhook-2026"
  }'
```

Expected response:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## Commands

Send any of these to the bot:

| Command | Purpose |
|---------|---------|
| `/start` | Initial setup message |
| `/health` | Check AI providers + DB health |
| `/stats` | Platform metrics (leads, bookings, users, tours) |
| `/leads` | Last 8 leads with status |
| `/digest` | AI analysis of daily metrics + priorities |
| `/kuzmich` | Post random route to Telegram channel |
| `/tip` | Post travel advice to channel |
| **free text** | Ask anything — Claude responds with real data |

---

## Examples

### Get Status Update
```
/stats

→ Response:
  Лиды: 5 всего, 2 новых
  Брони сегодня: 8 | ожидают: 3
  HELD-платежи: 1 шт. на 49500 руб
  Пользователей: 342 | Туров: 127
  Просмотров сегодня: 2341
```

### AI Analysis
```
Какой приоритет сегодня?

→ Claude analyzes current metrics and responds:
  "Лиды в тренде (+25% за неделю). Приоритет:
  1. Качество обработки лидов (6ч ожидания)
  2. Расширить операторов рыболовных туров
  3. Стабилизировать HELD-платежи
```

### Direct AI Command
```
/digest

→ Full platform digest with metrics + AI recommendations
```

---

## Security

- **Owner only**: Only messages from TELEGRAM_OWNER_ID are processed
- **Secret token**: Webhook uses X-Telegram-Bot-Api-Secret-Token validation
- **No public access**: This bot is isolated from public bot (@KuzmichKam_bot)
- **Real-time**: 24/7 uptime, no polling required

---

## Webhook Details

- **Endpoint**: `https://tourhab.ru/api/telegram/admin`
- **Secret**: `kh-admin-webhook-2026`
- **Auth**: TELEGRAM_OWNER_ID user check (only your Telegram ID accepted)
- **Polling**: None (webhook-based, zero latency)

---

## Verify Setup

1. **Bot is online**: Send `/start` — should get welcome message
2. **Stats working**: Send `/stats` — should see platform metrics
3. **AI responding**: Send any question — should get Claude response with real data
4. **Webhook active**: Monitor logs: `tail -f /var/log/app.log` (check for incoming updates)

---

## Daily Status Reporting Flow

Once configured, you can:

1. **Morning**: `/digest` — AI summary + priorities
2. **Throughout day**: Free-text questions about metrics
3. **Evening**: `/stats` — final metrics snapshot
4. **Anytime**: `/health` — check system health (AI + DB)

---

## Troubleshooting

**Bot not responding?**
- Check: TELEGRAM_ADMIN_BOT_TOKEN is set (6+ character prefix visible)
- Verify: TELEGRAM_OWNER_ID matches your Telegram user ID
- Test webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

**Webhook shows old URL?**
- Clear: `curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook`
- Re-register: `curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook ...` (see Step 2)

**Commands fail silently?**
- Check `/diag` in @KuzmichKam_bot to verify env vars
- Ensure DATABASE_URL and AI provider keys are set

---

## Next Steps

1. Set environment variables on Timeweb Console
2. Wait for app restart (~2 min)
3. Register webhook (curl command above)
4. Send `/start` to bot
5. Monitor status via `/stats` and `/digest`

**Status**: Ready to deploy. Awaiting Timeweb env vars configuration.
