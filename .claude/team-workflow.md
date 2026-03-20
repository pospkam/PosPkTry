# KamchatourHub — Team Workflow & Operations Guide

> Обновлено: Март 2026 | Стек: Next.js 15, TypeScript, PostgreSQL, Timeweb Cloud

---

## 1. ДЕПЛОЙ

```bash
npx tsc --noEmit        # 0 ошибок — обязательно перед push
git push origin main    # → автодеплой Timeweb (~5-7 минут)
```

**Timeweb-специфика:**
- Timeweb игнорирует наш Dockerfile — использует свой auto-generated
- `@types/*` — в `dependencies`, НЕ `devDependencies` (`NODE_ENV=production`)
- Логи: Timeweb Cloud панель → App ID 159529

**Env переменные (только на Timeweb, никогда в коде):**
`DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`TELEGRAM_CHANNEL_ID`, `CLOUDPAYMENTS_PUBLIC_ID`, `CLOUDPAYMENTS_SECRET`,
`CRON_SECRET`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
`NEXT_PUBLIC_YANDEX_MAPS_APIKEY`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`

---

## 2. МИГРАЦИИ БД

```
Следующая миграция: 053_name.sql
Не трогать: 001–050
```

**Применение:**
1. Создать `migrations/0NN_name.sql` с `BEGIN; ... COMMIT;`
2. Создать `app/api/mig0NN/route.ts` (GET endpoint читает файл, выполняет SQL)
3. Задеплоить → `https://tourhab.ru/api/mig0NN`
4. Убедиться в идемпотентности (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

**Применённые миграции (ключевые):**
- 040–041: operator_tours, tour_availability, operator_bookings
- 045: v_route_marketplace (источник: operator_tours)
- 048: loyalty_transactions, promo_codes, referrals
- 050: octo_api_keys, tour_options, octo_booking_log
- 051: tour_payments, operator_payouts
- 052: operator_applications, profile_status, onboarding_completed
- 053: octo_webhook_log, webhook_url/secret в octo_api_keys
- 054: agent_clients, agent_bookings, agent_commissions, commission_payouts
- 055: tour_pricing_rules, agent_referral_links, agent_referral_events

---

## 3. CRON ЗАДАЧИ (cron-job.org)

| URL | Интервал | Назначение |
|-----|----------|-----------|
| `/api/cron/leads-followup?secret=<CRON_SECRET>` | каждые 30 мин | Уведомление операторов о лидах |
| `/api/cron/payouts?secret=<CRON_SECRET>` | каждый час | HELD→RELEASED после 36ч |

**Диагностика:** лог на cron-job.org → должен быть HTTP 200.

---

## 4. КОНТЕНТ

### Новый маршрут в каталог (agent_route_knowledge)
```sql
INSERT INTO agent_route_knowledge (route_dedupe_key, category, location_type, activity_type,
  title, description, search_text, source_hash, lat, lng, zone, is_visible, payload)
VALUES ('slug|lat|lng', 'category', 'volcano|river|bay|...', 'trekking|boat_trip|...',
  'Название', 'Описание', 'поисковые слова', md5('slug|lat|lng'),
  55.0, 158.0, 'avachinsky|northern|western|eastern', TRUE,
  '{"difficulty":"easy","season":["июль"],"price_from":5000,"duration_hours":8}'::jsonb)
ON CONFLICT (route_dedupe_key) DO UPDATE SET ...;
```

### Не применённые seed-скрипты (ждут операторов)
- `scripts/seed-operator-topkam.sql`
- `scripts/seed-operator-kamchatintour.sql`
- `scripts/seed-operator-vulkangid.sql`
- `scripts/seed-operator-kamchatka-wild.sql`

---

## 5. АРХИТЕКТУРНЫЕ ПРАВИЛА

```
ЗАПРЕЩЕНО:
  import pool from           →  import { pool } from '@/lib/db-pool'
  SELECT * FROM kamchatka_routes  →  только v_kamchatka_routes_api
  fetch('https://tourhab.ru')     →  в server components таймаутит — import { query }
  console.log в app/         →  запрещён (console.error — допустим только в catch)
  Хардкод hex цветов         →  только var(--token)
  Glassmorphism              →  абсолютно запрещён
  Эмодзи в .tsx              →  только lucide-react иконки
  JSONB ->  оператор         →  предпочитать ->> для строк
```

**Паттерн API route:**
```typescript
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const Schema = z.object({ ... });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const parsed = Schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: '...' }, { status: 400 });
  const { rows } = await pool.query('SELECT ... WHERE id = $1', [parsed.data.id]);
  return NextResponse.json({ success: true, data: rows[0] });
}
```

**Публичные API роуты** — добавлять в `middleware.ts` массив `PUBLIC_API_ROUTES`.

---

## 6. ФИНАНСОВЫЙ КОНТУР

```
Турист платит → CloudPayments webhook → tour_payments (HELD)
Тур + 36ч → cron/payouts → tour_payments (RELEASED)
Admin trigger → operator_payouts (PENDING→PAID)
```

**Комиссия:** 15% → 12% (100k/мес) → 10% (500k) → 8% (1M).
Функция: `recalculate_commission(partner_id)` — вызывается автоматически.

---

## 7. OCTO API

**Файлы:** `lib/octo/` (auth, schemas, service, mappers, webhooks) + `app/api/octo/`

**Создать API ключ для OTA:** `POST /api/admin/octo-keys`

**Self-certification (не пройдена):**
1. Установить OCTO test suite
2. Запустить тесты против staging
3. Подать заявку Tiqets/Headout Partnership

---

## 8. СПЛАВЫ — СТАТУС

| Что | Статус |
|-----|--------|
| 84 маршрута `boat_trip` в knowledge base | В БД, видны на карте |
| `scripts/seed-place-bystraya-splav.sql` | Закомичен, применить psql |
| Тур "Голубые озёра + сплав" (topkam) | В seed-скрипте, не применён |
| Специализированный оператор сплавов | **Нет** — искать |

**Следующий шаг:** связаться с Катериной (источник данных о Быстрой — Telegram-группа операторов) как потенциальным оператором сплавов.

---

> tourhab.ru | Admin: /hub/admin | App ID: 159529 | Branch: main (auto-deploy)
