Запусти параллельную разработку фичи: одновременно пишутся API и UI-компонент, не дожидаясь друг друга.

## Аргументы

`$ARGUMENTS` — описание фичи (например: "страница финансовой сводки оператора с графиком выручки")

## Шаг 1 — Декомпозиция (сделай сам, не делегируй)

Перед запуском агентов определи и зафикси:

```
FEATURE: {название}
API_ROUTE:   {метод} {путь}  — e.g. GET /api/hub/finance/summary
API_TABLES:  {таблицы}       — e.g. operator_payouts, tour_payments
UI_FILE:     {путь к tsx}    — e.g. app/hub/finance/page.tsx + _FinanceClient.tsx
UI_DATA:     {что отображать} — e.g. total_earned, pending_payout, chart_data[]
CONTRACT:    {JSON-структура ответа API}
```

Если чего-то не знаешь — сначала прочитай схему через `mcp__postgres__query`, потом продолжай.

## Шаг 2 — Параллельный запуск

Запусти **одним сообщением** два агента через Agent tool:

### Агент A — Backend

```
Задача: написать API endpoint для {feature}.

Route: {API_ROUTE}
Файл: {предполагаемый путь, e.g. app/api/hub/finance/summary/route.ts}

Требования (обязательно):
- import { pool } from '@/lib/db-pool'  (named, не default)
- JWT auth через requireAuth/requireAdmin из lib/auth/middleware.ts
- Zod валидация входных данных
- Параметризованный SQL ($1, $2), никогда не конкатенировать
- FROM operator_bookings (не FROM bookings), поле booking_status (не status)
- FROM operator_tours (не FROM tours)
- Ошибки — понятные сообщения на русском
- Тип ответа: {CONTRACT}

НЕ трогай: middleware.ts, lib/auth.ts, app/api/payments/, app/api/safety/sos

Таблицы для работы: {API_TABLES}
Перед написанием SQL — прочитай схему таблиц через mcp__postgres__query.

Формат ответа: верни только код файла(ов), без объяснений.
```

### Агент B — Frontend

```
Задача: написать UI-компонент для {feature}.

Файл: {UI_FILE}
Данные из API: {CONTRACT} (эндпоинт: {API_ROUTE})

Дизайн-система (строго):
- Цвета только через CSS-токены: var(--accent), var(--ocean), var(--bg-card),
  var(--text-primary), var(--text-secondary), var(--border) и т.д.
- DS-классы: ds-card, ds-page, ds-btn, ds-btn-primary, ds-h1, ds-h2, ds-label, ds-badge
- Шрифты: font-[family-name:var(--font-playfair)] для заголовков, остальное Outfit
- Иконки: только lucide-react
- Запрещено: bg-white, text-white, backdrop-blur, glassmorphism, emoji, hardcode hex

Структура страницы (Next.js App Router):
- page.tsx — server component с metadata export
- _FeatureClient.tsx — 'use client', вся логика + useState + fetch

Что показывать: {UI_DATA}

Используй fetch({API_ROUTE}) для загрузки данных.
Loading state: ds-skeleton классы.
Error state: текст на русском, ds-btn-secondary для retry.

Формат ответа: верни только код файла(ов), без объяснений.
```

## Шаг 3 — Сборка (после завершения обоих агентов)

1. Проверь что типы совпадают: CONTRACT из API ↔ что парсит UI
2. Убедись что путь fetch в UI совпадает с реальным API_ROUTE
3. Запусти `npx tsc --noEmit` — должно быть 0 ошибок
4. Если ошибки — исправь сам, не перезапускай агентов

## Шаг 4 — Отчёт

```
PARALLEL-DEV: {feature}

A (API):    {файл} — {статус}
B (UI):     {файл} — {статус}
TSC:        {OK | N ошибок}
Wiring:     {OK | проблемы}

Следующий шаг: {commit / fix / test}
```
