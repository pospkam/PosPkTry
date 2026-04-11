Создай новый cron endpoint по стандарту проекта.

## Аргументы

`$ARGUMENTS` — описание задачи (например: "отправка напоминаний операторам о незакрытых заявках")

## Шаг 1 — Определи параметры

Ответь на вопросы (если не указано в аргументах — предложи разумные дефолты):

```
ROUTE:      /api/cron/{kebab-case-name}     e.g. /api/cron/booking-reminders
FILE:       app/api/cron/{name}/route.ts
SCHEDULE:   {описание} e.g. "каждый час" / "ежедневно в 09:00"
TIMEOUT:    {секунды} e.g. 30 (для простых), 120 (для тяжёлых)
TELEGRAM:   {да/нет} — нужно ли уведомление в Telegram при ошибке/успехе
```

## Шаг 2 — Создай файл

Имя файла: `app/api/cron/{name}/route.ts`

### Обязательный шаблон:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
// import { sendTelegramAdminAlert } from '@/lib/notifications/telegram'; // если TELEGRAM=да

export const runtime = 'nodejs';
export const maxDuration = {TIMEOUT};  // секунды

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Auth — проверка CRON_SECRET
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    // 2. Основная логика
    const client = await pool.connect();
    try {
      // {LOGIC HERE}

      processed = 0; // заменить на реальный счётчик
    } finally {
      client.release();
    }

    const duration = Date.now() - startedAt;

    // 3. (Опционально) Telegram уведомление при успехе
    // if (processed > 0) {
    //   await sendTelegramAdminAlert(`✓ {cron_name}: обработано ${processed} за ${duration}ms`);
    // }

    return NextResponse.json({
      ok: true,
      processed,
      errors,
      duration_ms: duration,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // 4. Telegram уведомление при критической ошибке
    // await sendTelegramAdminAlert(`✗ CRON {cron_name} failed: ${message}`).catch(() => {});

    return NextResponse.json(
      { ok: false, error: message, processed, errors },
      { status: 500 },
    );
  }
}
```

### Правила:

- **Auth**: всегда проверяй `CRON_SECRET` через заголовок `x-cron-secret` или query param `secret`
- **runtime = 'nodejs'**: cron-задачи всегда Node.js, не Edge
- **maxDuration**: 30с для лёгких задач, 120с для тяжёлых (Vercel/Timeweb лимит)
- **pool.connect() + client.release()**: используй явный клиент в try/finally
- **Счётчик**: всегда считай `processed` и `errors`, возвращай в ответе
- **Telegram**: только для критических ошибок и значимых успехов (не каждый запуск)
- Никаких `console.log` — только `console.error` в catch
- Отвечай за `duration_ms` — полезно для мониторинга

### Пример — напоминания операторам:

```typescript
// Найти бронирования без ответа > 2 часов
const { rows } = await client.query<{ id: string; operator_id: number }>(
  `SELECT id, operator_id
   FROM operator_bookings
   WHERE booking_status = 'pending'
     AND created_at < NOW() - INTERVAL '2 hours'
     AND reminded_at IS NULL
   LIMIT 50`,
);

for (const booking of rows) {
  try {
    // ... отправить уведомление
    await client.query(
      `UPDATE operator_bookings SET reminded_at = NOW() WHERE id = $1`,
      [booking.id],
    );
    processed++;
  } catch {
    errors++;
  }
}
```

## Шаг 3 — Зарегистрируй в vercel.json / cron-config

Добавь в `vercel.json` (если используется) или в `README` раздел cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/{name}?secret=CRON_SECRET",
      "schedule": "0 * * * *"
    }
  ]
}
```

Для Timeweb — добавить через панель или Telegram-бот.

## Шаг 4 — Отчёт

```
CRON: {название}
Файл:    app/api/cron/{name}/route.ts
Route:   GET /api/cron/{name}
Auth:    CRON_SECRET header/query
Schedule: {расписание}
Timeout: {N}s

Для теста:
curl -H "x-cron-secret: $CRON_SECRET" https://tourhab.ru/api/cron/{name}
```
