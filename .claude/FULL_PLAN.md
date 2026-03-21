# FULL PLAN — KamchatourHub
> Дата: 21 марта 2026 | Статус: к исполнению

---

## ЗАДАЧА 0: Применить Миграции на Прод

### Контекст
Два отдельных блока функциональности не работают на проде, потому что их таблицы не существуют в БД Timeweb.

### Migration 054 — Agent CRM Tables

**Что создаёт:**
```sql
agent_clients       -- клиентская база агента (name, phone, email, tags, source, status)
agent_bookings      -- брони через агента → оператора (tour_id BIGINT FK operator_tours)
agent_commissions   -- учёт комиссий (one row per booking, rate DEFAULT 10%)
commission_payouts  -- пакетные выплаты агенту (batch payouts)
```

**Риски при применении:**
- `agent_bookings.tour_id` → FK на `operator_tours.id` — должна применяться ПОСЛЕ migration 040
- Migration 040 применена? → судя по тому что operator_tours есть на проде + брони работают: ДА
- Нет конфликтов с существующими таблицами (уникальные имена)

**Как применить:**
```
GET https://tourhab.ru/api/mig054?secret=CRON_SECRET
```
Ожидаемый ответ: `{ "success": true, "statements_executed": 20+ }`

**Как проверить:**
```
https://tourhab.ru/hub/agent/clients  → должен загрузиться без 500 ошибки
```

---

### Migration 064 — Safety & Capacity Layer

**Что создаёт:**
```sql
location_safety_profile      -- статические профили: вместимость, опасности, высота
location_real_time_status    -- динамика: is_open, tourists_today, alert_severity
external_alerts              -- тревоги МЧС/VK
crowd_log                    -- лог посещений групп
emergency_contacts           -- контакты МЧС по зонам

SEED: заполняет все 1189 маршрутов базовыми профилями безопасности
```

**Риски при применении:**
- `location_safety_profile.agent_route_id` → FK на `agent_route_knowledge.id`
- agent_route_knowledge должна существовать → применена давно, есть на проде: ДА
- SEED делает UPDATE + INSERT для 1189 записей → может занять 30-60 секунд
- Endpoint читает файл через `fs.readFileSync` → Timeweb Docker должен иметь доступ к migrations/

**Важное замечание:** migration 064 читается через `app/api/mig064/route.ts` который читает файл `migrations/064_safety_capacity_layer.sql` через fs. Проверить что файл попадает в Docker образ (не в .dockerignore).

**Как применить:**
```
GET https://tourhab.ru/api/mig064?secret=CRON_SECRET
```

**Как проверить:**
```
https://tourhab.ru/hub/admin/safety → должны появиться данные по маршрутам
GET https://tourhab.ru/api/safety/capacity → должен вернуть список маршрутов
```

---

## ЗАДАЧА 1: SQL Injection Fix

### Где находится
`/app/api/agent/dashboard/route.ts`, строка ~20

### Проблема
```typescript
const period = searchParams.get('period') || '30';
// ...
AND c.created_at >= NOW() - INTERVAL '${period} days'  // ← УЯЗВИМОСТЬ
```

Атакующий может передать `?period=1' OR '1'='1` и получить все записи всех агентов.

### Решение
```typescript
// Whitelist: разрешаем только конкретные числа
const ALLOWED_PERIODS = ['7', '30', '90', '365'] as const;
type AllowedPeriod = typeof ALLOWED_PERIODS[number];

const rawPeriod = searchParams.get('period') || '30';
const period: AllowedPeriod = ALLOWED_PERIODS.includes(rawPeriod as AllowedPeriod)
  ? (rawPeriod as AllowedPeriod)
  : '30';

// В SQL — безопасно, так как period — только одно из 4 значений whitelist
// Альтернатива через параметр:
AND c.created_at >= NOW() - ($2 * INTERVAL '1 day')
// передаём: [agentId, parseInt(period)]
```

**Выбираем параметризованный вариант** — это каноничный способ.

---

## ЗАДАЧА 2: Agent Hub Rebuild для Ирины

### Контекст
Ирина — агент. Принимает звонки/заявки, ищет свободные даты у операторов, подтверждает бронь, зарабатывает комиссию. Сейчас это делается вручную через CRM U-ON + звонки.

### Что выбрасываем из текущего agent hub
| Раздел | Причина выброса |
|--------|----------------|
| `/hub/agent/vouchers` | Таблица `vouchers` не существует в БД → 500 на каждый запрос |
| `/hub/agent/stats` | 100% mock data через `setTimeout`, вводит в заблуждение |
| "Создать ваучер" quick action | Ведёт в сломанный раздел |

### Что сохраняем
- `/hub/agent/clients` — рабочий CRM, нужен Ирине
- `/hub/agent/commissions` — рабочий, но покажет 0 (баг INSERT будет исправлен)
- `/hub/agent/bookings` — рабочий список броней

### Новая Information Architecture

```
/hub/agent/                ← Обзор (упрощённый: 3 метрики + 2 CTA)
/hub/agent/leads/          ← НОВОЕ: Входящие заявки с платформы
/hub/agent/find/           ← НОВОЕ: Поиск свободных дат у операторов
/hub/agent/clients/        ← СУЩЕСТВУЮЩИЙ: База клиентов
/hub/agent/deals/          ← НОВОЕ (заменяет bookings): Мои сделки
/hub/agent/commissions/    ← СУЩЕСТВУЮЩИЙ: Комиссии
```

### Sidebar (новый)

```typescript
const SIDEBAR_ITEMS = [
  { href: '/hub/agent',             label: 'Обзор',     icon: LayoutDashboard },
  { href: '/hub/agent/leads',       label: 'Заявки',    icon: Inbox },      // НОВОЕ
  { href: '/hub/agent/find',        label: 'Найти тур', icon: Search },     // НОВОЕ
  { href: '/hub/agent/clients',     label: 'Клиенты',   icon: Users },
  { href: '/hub/agent/deals',       label: 'Сделки',    icon: Handshake },  // НОВОЕ
  { href: '/hub/agent/commissions', label: 'Комиссии',  icon: CreditCard },
];
```

---

### Новый экран: `/hub/agent/leads/`

**Задача:** Ирина видит все входящие заявки с платформы, может взять в работу.

**Источник данных:** таблица `leads` (уже есть).

**API: `GET /api/agent/leads`**
```sql
SELECT
  l.id, l.name, l.phone, l.comment,
  l.route_title, l.source_url,
  l.source_data,   -- JSONB: interests[], date_from, date_to, trip_days
  l.status,
  l.created_at
FROM leads l
WHERE l.status IN ('new', 'contacted')
ORDER BY l.created_at DESC
LIMIT $1 OFFSET $2
```
Auth: `requireAgent` — только агент/admin.

**API: `PATCH /api/agent/leads/[id]`**
```sql
UPDATE leads SET status = $2, notes = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, status
```
Разрешённые статусы для агента: `contacted`, `qualified`, `converted`, `lost`.

**UI компонент: LeadCard**
```
┌─────────────────────────────────────────┐
│ Лариса Иванова         Новая  22 марта  │
│ +7 924 123-45-67       [Копировать]     │
│ Вулкан · Рыбалка · Термальный           │
│ 6–13 июня · 4 человека                 │
│ Источник: TripPlanner                  │
│                          [В работу] ▼  │
└─────────────────────────────────────────┘
```

**Фильтры в UI:**
- Табы: Новые / В работе / Завершённые
- Поиск по имени/телефону
- Фильтр по интересам (volcano, fishing, thermal, ...)

---

### Новый экран: `/hub/agent/find/`

**Задача:** Ирина вводит дату и тип активности — видит ВСЕ свободные слоты у всех операторов.

**API: `GET /api/agent/find-tours`**
```
Параметры:
  date         — конкретная дата (YYYY-MM-DD) или date_from + date_to
  activity_type — boat_trip / trekking / fishing / helicopter / ...
  group_size    — минимальное количество мест
```

```sql
SELECT
  t.id,
  t.title,
  t.description,
  t.activity_type,
  t.duration_hours,
  COALESCE(a.price_override, t.base_price) AS price,
  t.max_participants,
  COALESCE(a.available_spots, t.max_participants) AS available_spots,
  t.includes_guide,
  t.includes_equipment,
  p.company_name AS operator_name,
  p.id AS operator_id,
  p.contacts->>'phone' AS operator_phone,
  a.available_date,
  a.price_override,
  -- агентская комиссия 10%
  ROUND(COALESCE(a.price_override, t.base_price) * 0.10) AS agent_commission
FROM operator_tours t
JOIN partners p ON t.operator_id = p.id
LEFT JOIN tour_availability a
  ON a.tour_id = t.id
  AND a.available_date = $1
WHERE t.is_published = TRUE
  AND t.deleted_at IS NULL
  AND ($2::text IS NULL OR t.activity_type = $2)
  AND COALESCE(a.available_spots, t.max_participants) >= $3
ORDER BY price ASC
```

**UI: TourCard**
```
┌─────────────────────────────────────────┐
│ Сплав по реке Быстрая          13 000 ₽ │
│ Камчатка Рафтинг               /чел     │
│ 8 часов · до 6 человек                 │
│ Свободно: 4 места              22 июня  │
│ Ваша комиссия: 1 300 ₽                 │
│              [Связаться] [Предложить ▶] │
└─────────────────────────────────────────┘
```

**"Предложить клиенту" flow:**
1. Агент нажимает кнопку
2. Выбирает из своих clients кому предложить
3. Создаётся `agent_booking`:
   - `agent_id` = текущий пользователь
   - `tour_id` = выбранный тур
   - `client_id` = выбранный клиент
   - `commission_rate` = 10%
4. Создаётся запись в `agent_commissions` (исправленный INSERT)

---

### Новый экран: `/hub/agent/deals/`

**Задача:** История всех сделок агента с комиссиями.

**Источник:** `agent_bookings` JOIN `agent_commissions`

**UI:**
```
Мои сделки

Фильтр: [Все] [В работе] [Завершены] [Комиссия ожидает]

┌────────────────────────────────────────────────┐
│ Лариса Иванова                    Подтверждена │
│ Сплав по реке Быстрая · 22 июня               │
│ 4 человека · 52 000 ₽ итого                   │
│ Ваша комиссия: 5 200 ₽           ○ ожидает    │
└────────────────────────────────────────────────┘
```

---

### Исправление: INSERT agent_commissions

В `app/api/agent/bookings/route.ts` после INSERT agent_bookings добавить:

```sql
INSERT INTO agent_commissions (agent_id, booking_id, amount, rate, status)
VALUES ($1, $2, $3, $4, 'pending')
```

Параметры: agentId, bookingId, calculatedCommission, commissionRate.

---

## ЗАДАЧА 3: Сплавы — Guide Hub

### Текущее состояние

Что уже есть:
```
migrations/011 (lib/database/)  ← guide_schedule, guide_availability,
                                   guide_earnings, guide_reviews, guide_certifications
                                   + 4 триггера/функции
app/api/guide/schedule/route.ts ← GET+POST, geo-enabled, конфликт-проверка
app/hub/guide/schedule/         ← UI для просмотра расписания
migrations/060                  ← "Камчатка Рафтинг" + тур (is_published=FALSE)
```

Что отсутствует:
```
Гид НЕ МОЖЕТ:
  → видеть туры оператора к которому прикреплён
  → объявить свою готовность на дату
  → принять запрос на сплав от туриста
  → видеть состав своей группы до экскурсии
```

### Архитектура: Кто такой гид в системе?

Гид — физлицо, прикреплённое к оператору через таблицу `partners`.
Гид работает на конкретных турах оператора.

```
partners (operator)
    └─ operator_tours (boat_trip)
           └─ guide_schedule   ← гид назначен на конкретную дату тура
                  └─ bookings  ← туристы записаны
```

### Что нужно для сплавов

**Новая вкладка `/hub/guide/tours/`:**
- Гид видит туры своего оператора (activity_type = 'boat_trip')
- Видит расписание по этим турам
- Видит состав группы на каждую дату
- Может отметить "готов" / "недоступен"

**API: `GET /api/guide/tours`:**
```sql
SELECT
  ot.id, ot.title, ot.activity_type,
  ot.duration_hours, ot.base_price,
  p.company_name AS operator_name,
  COUNT(ta.id) AS upcoming_slots,
  COUNT(ob.id) AS total_bookings
FROM operator_tours ot
JOIN partners p ON ot.operator_id = p.id
-- Гид привязан к партнёру через guide_id в partners
JOIN partners gp ON gp.user_id = $1  -- текущий гид
WHERE ot.operator_id = gp.operator_partner_id  -- если гид работает у оператора
   OR ot.is_published = TRUE  -- OR все опубликованные для free agents
AND ot.activity_type = 'boat_trip'
```

**Проблема:** В схеме нет явной привязки `guide → operator`. Гид в `partners` — это отдельная запись с `partner_type = 'guide'`. Нет FK guide → operator.

**Нужна migration 065:**
```sql
ALTER TABLE partners
  ADD COLUMN guide_operator_id BIGINT REFERENCES partners(id);
-- guide заполняет: "я работаю на этого оператора"
```

**Sidebar guide hub (обновлённый):**
```typescript
const SIDEBAR_ITEMS = [
  { href: '/hub/guide',          label: 'Обзор',      icon: Star         },
  { href: '/hub/guide/tours',    label: 'Мои туры',   icon: Map          }, // НОВОЕ
  { href: '/hub/guide/schedule', label: 'Расписание', icon: CalendarDays },
  { href: '/hub/guide/groups',   label: 'Группы',     icon: Users        },
  { href: '/hub/guide/earnings', label: 'Заработок',  icon: CreditCard   },
  { href: '/hub/guide/reviews',  label: 'Отзывы',     icon: MessageSquare},
  { href: '/hub/guide/profile',  label: 'Профиль',    icon: User         },
];
```

### Рафтинг-тур is_published=FALSE

Migration 060 создала тур `"Сплав по реке Быстрая"` с `is_published=FALSE`.
Нужна migration 065 которая:
```sql
UPDATE operator_tours
SET is_published = TRUE
WHERE slug = 'bystraya-river-rafting';
```
Это должно произойти ПОСЛЕ того как оператор "Камчатка Рафтинг" заведёт аккаунт.

---

## ЗАДАЧА 4: Safety Layer Активация

### Предусловия
1. ✓ Код задеплоен (migration endpoint существует)
2. ? Файл `migrations/064_safety_capacity_layer.sql` входит в Docker → проверить .dockerignore
3. ? CRON_SECRET установлен в Timeweb ENV

### Порядок запуска
```
Шаг 1: GET https://tourhab.ru/api/mig064?secret=CRON_SECRET
→ Создаёт таблицы + seed 1189 маршрутов
→ Время: ~45 секунд

Шаг 2: GET https://tourhab.ru/api/cron/safety-ingest?secret=CRON_SECRET
→ Первый парсинг МЧС/VK/Wikipedia
→ Время: ~60 секунд

Шаг 3: cron-job.org
→ Каждые 30 минут
→ URL: https://tourhab.ru/api/cron/safety-ingest?secret=CRON_SECRET
```

### Что будет видно после
- `/hub/admin/safety`: Карточки (0 алертов / N маршрутов / статусы)
- По мере работы cron: реальные данные МЧС-каналов

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

```
ДЕНЬ 1 (сегодня):
  [ ] 1. Применить mig054 на проде → проверить agent hub
  [ ] 2. SQL injection fix → commit
  [ ] 3. /api/agent/leads + /api/agent/find-tours → новые endpoints
  [ ] 4. /hub/agent/leads/ page → UI
  [ ] 5. /hub/agent/find/ page → UI
  [ ] 6. Cleanup layout.tsx → убрать vouchers/stats, добавить leads/find/deals
  [ ] 7. tsc + commit + push → деплой

ДЕНЬ 2 (до встречи с Ириной):
  [ ] 8. Применить mig064 → safety layer оживает
  [ ] 9. Настроить cron-job.org для safety-ingest
  [ ] 10. /hub/agent/deals/ page (упрощённые agent_bookings)
  [ ] 11. INSERT agent_commissions fix в bookings/route.ts

ДЕНЬ 3 (после встречи):
  [ ] 12. migration 065 — guide_operator_id + is_published rafting fix
  [ ] 13. /api/guide/tours → API для гидов на сплавах
  [ ] 14. /hub/guide/tours/ → страница "Мои туры" для гида
  [ ] 15. Создать аккаунт Ирины с role='agent'
  [ ] 16. Seed: привязать guide к оператору Камчатка Рафтинг
```

---

## РИСКИ И ЗАВИСИМОСТИ

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| mig054 конфликт FK если operator_tours не применена | Низкая (туры работают) | Проверить через API перед применением |
| mig064 файл не в Docker | Средняя | Проверить .dockerignore; альтернатива — инлайн SQL |
| agent_commissions всегда пустые | Высокая | Исправить INSERT в ДЕНЬ 1 |
| Гид не привязан к оператору в БД | Высокая | Migration 065 решает; до этого показывать все boat_trip туры |
| visitkamchatka.ru изменит структуру | Низкая | Используем как справочник, не как live feed |

---

> Обновлено: 21 марта 2026
