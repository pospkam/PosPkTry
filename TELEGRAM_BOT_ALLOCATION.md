# Telegram Bot — Admin Bot для инициатив

**Date:** 22 марта 2026
**Owner Telegram ID:** 833478813
**Status:** Deployment-ready

---

## Существующая инфраструктура (не трогаем)

Вы уже используете:

1. **Канал КУЗЬМИЧ** → Чат КУЗЬМИЧ → Бот КУЗЬМИЧ
   - Воронка продаж туров
   - Постит маршруты, операторов, советы Кузьмича

2. **Канал AI_hab_money** → Чат AI_hab_money → Бот ai_hab_bot
   - Новости из мира ИИ

---

## Новое: Bot администрирования (#5) для инициатив

**Ваш существующий админ-бот** используется как основной для системы инициатив.

**Назначение:** Owner-only alerts + commands

**Чат:** 833478813 (ваш приватный чат)

**Функция:** Уведомления о board meetings и инициативах

**Environment variables (Timeweb):**
```env
TELEGRAM_ADMIN_BOT_TOKEN=<ваш_токен_админ_бота>
TELEGRAM_OWNER_ID=833478813
```

---

## Данные потоки

### Board Meeting → Admin Bot

```
Событие: Board Meeting запустился
   ↓
9 агентов анализируют параллельно (8-10s)
   ↓
Результат: 5 инициатив сгенерировано
   ↓
Admin Bot отправляет в 833478813:
   "Board Meeting completed
    - 5 proposals generated
    - Ready for approval"
```

### Одобрение инициатив → Admin Bot

```
Вы в UI: /hub/admin/agents?tab=approvals
   ↓
Кликаете "Approve" на инициативе
   ↓
Admin Bot отправляет в 833478813:
   "[1/5] API rotation (Security) → APPROVED by you"
```

### CRON Выполнение → Admin Bot

```
Ежечасно: GET /api/cron/initiatives-execute?secret=CRON_SECRET
   ↓
Выполняются одобренные + назначенные инициативы
   ↓
Admin Bot отправляет результаты:

   "[1/5] API rotation (Security) → DONE (8.2s)"
   "[2/5] T&C update (Legal) → DONE (2.1s)"
   "[3/5] Descriptions (Content) → DONE (145.3s)"
   "[4/5] A/B test (Hacker) → MONITORING (14d)"
   "[5/5] Batch optimization (Admin) → STAGED"

   "Total: 163.2s | Success: 5/5"
```

---

## Что происходит с КУЗЬМИЧ ботом?

**Он остаётся как есть** — для публичного контента и продаж.

**Но теперь туры, которые инициативы изменяют, обновляются в БД:**
- Когда инициатива "Descriptions" выполняется → описания туров переписываются
- Когда инициатива "Pricing" выполняется → цены изменяются
- КУЗЬМИЧ бот постит их в свой канал (уже работает, не требует изменений)

---

## Commands в Admin Bot (843478813)

**Существующие команды** (не менял):
```
/health       — Статус системы
/stats        — Напоминание лидов, брони, платежи
/leads        — Последние 8 лидов
/digest       — Дневной дайджест
/tip          — Совет от Кузьмича
```

**Новые команды** (инициативы):
```
/initiatives   — Список ожидающих одобрения инициатив
/approvals     — Текущий статус одобренных инициатив
```

---

## Deployment

### Step 1: Verify Admin Bot Token

```env
# Timeweb Cloud → Environment Variables

TELEGRAM_ADMIN_BOT_TOKEN=<ваш_токен_админ_бота>
TELEGRAM_OWNER_ID=833478813
CRON_SECRET=<generate_unique_secret>
```

### Step 2: Test Admin Bot

```bash
# Test connection
curl "https://tourhab.ru/api/telegram/admin?command=health"

# Expected: Message in 833478813 chat with stats
```

### Step 3: Configure CRON

```bash
# Option 1: Timeweb built-in CRON
# Settings → CRON Jobs
# Schedule: 0 * * * * (hourly, at :00)
# URL: https://tourhab.ru/api/cron/initiatives-execute?secret=<CRON_SECRET>

# Option 2: cron-job.org
# URL: https://tourhab.ru/api/cron/initiatives-execute?secret=<CRON_SECRET>
# Frequency: Every hour

# Option 3: Manual curl (from your server)
# 0 * * * * curl -s "https://tourhab.ru/api/cron/initiatives-execute?secret=$CRON_SECRET"
```

---

## Architecture: Как Admin Bot интегрирован с инициативами

### Файлы (не трогать КУЗЬМИЧ и AI_hab):

- `/app/api/cron/initiatives-execute/route.ts` → Hourly executor
  - Queries approved + assigned initiatives from DB
  - Executes each executor (API rotation, T&C, descriptions, etc.)
  - **Calls Admin Bot** with results
  ```typescript
  const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: ownerId,
    text: executionResults,
  });
  ```

- `/lib/agents/execution/initiative-executor.ts` → 5 Executors
  - executeAPIKeyRotation()
  - executeTCUpdate()
  - executeTourDescriptionRewrite()
  - executeABTestSetup()
  - executeCommissionOptimization()

- `/app/api/agents/board-meeting/route.ts` → Board Meeting
  - 4 rounds of AI agents discussing
  - Generates 5 initiatives
  - **Calls Admin Bot** with proposal summary

---

## Summary

| Item | Бот | Использование |
|------|-----|--------------|
| Канал КУЗЬМИЧ | Бот КУЗЬМИЧ | Воронка продаж (не меняем) |
| Канал AI_hab_money | Бот ai_hab_bot | ИИ новости (не меняем) |
| Приватный чат 833478813 | Admin Bot (#5) | **Новое: Board Meeting + инициативы** |

**Итого:** 3 бота, 4 чата + канала. Инициативы используют только Admin Bot в приватном чате.

---

## Troubleshooting

### Admin Bot не отправляет сообщения
- Проверьте: `TELEGRAM_ADMIN_BOT_TOKEN` установлен на Timeweb?
- Проверьте: `TELEGRAM_OWNER_ID = 833478813` правильный?
- Тест: `curl "https://tourhab.ru/api/telegram/admin?command=health"`

### Board Meeting не запускается
- GET `/api/agents/board-meeting`
- Должен завершиться за ~26s и отправить результат в Admin Bot

### CRON не выполняется
- Проверьте: `CRON_SECRET` установлен на Timeweb?
- Проверьте: Webhook зарегистрирован для Bot КУЗЬМИЧ? Для Admin Bot не нужен.
