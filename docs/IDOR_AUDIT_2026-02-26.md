# IDOR audit worklog (2026-02-26)

## Контекст

Цель работ: пройтись по `GET/PUT/DELETE` маршрутам с `id` в `params`/`query`, проверить наличие object-level ownership-фильтров и закрыть подтвержденные IDOR-риски без изменения публичных сценариев discovery.

Работа выполнена в ветке:

- `cursor/middleware-security-rules-130a`

---

## Коммит по IDOR

- `fix(security): enforce sql ownership for operator review replies and tour photos`

---

## Область аудита

Проверено:

- `26` динамических роутов `app/api/**/[id]/route.ts`
- `24` роута с `id/*Id` в query (`searchParams.get(...)`)

Фокусные домены по задаче:

- `bookings/*`
- `tours/*`
- `operator/*` (включая dashboard-смежные API)

---

## Волны аудита

## Волна 1: инвентаризация id-маршрутов

- Собран полный список динамических `...[id]/route.ts`.
- Отдельно собраны маршруты с `id`/`*Id` в query.
- Для каждого маршрута проверена модель доступа:
  - public-by-design,
  - admin-only,
  - role-based + ownership (service-level или SQL-level).

## Волна 2: точечная проверка ownership в SQL

- Проверены CRUD-ветки в:
  - `bookings/[id]`,
  - `operator/bookings/[id]`,
  - `operator/tours/[id]`,
  - `operator/reviews/[id]/reply`,
  - `operator/tours/[id]/photos/[photoId]`,
  - `guide/schedule/[id]`,
  - `transfer/{drivers,vehicles,transfers}/[id]`.

## Волна 3: фиксы подтвержденных IDOR

### 1) `app/api/operator/reviews/[id]/reply/route.ts`

Проблема:

- ownership проверялся двумя шагами (select + сравнение в коде), но без ownership-фильтра в `WHERE`.

Фикс:

- Добавлен SQL ownership-фильтр в `WHERE r.id = $1 AND p.user_id = $2`.
- Для `UPDATE` добавлена повторная ownership-проверка через `FROM tours ... JOIN partners ...` (защита от race-condition).

### 2) `app/api/operator/tours/[id]/photos/[photoId]/route.ts`

Проблема:

- PATCH обновлял `assets` по `photoId` без SQL-подтверждения связи с `tour_id`.
- DELETE удалял связь/ассет без явного `RETURNING`-контроля принадлежности фото текущему туру.

Фикс:

- PATCH: `UPDATE assets ... WHERE a.id = $2 AND EXISTS (SELECT 1 FROM tour_assets WHERE tour_id = $3 AND asset_id = a.id)`.
- DELETE: удаление связи через `DELETE ... RETURNING asset_id`; если связи нет -> `404`.

---

## Safe exclusions (проверено, без изменений)

- `bookings/[id]` — ownership в service-layer (`getByIdForUser/updateForUser/cancel`).
- `operator/bookings/[id]` — ownership через `verifyBookingOwnership`.
- `operator/tours/[id]` — ownership через `verifyTourOwnership`.
- `guide/schedule/[id]` — ownership через `verifyScheduleOwnership`.
- `transfer/{drivers,vehicles,transfers}/[id]` — ownership через соответствующие helper-проверки.
- `admin/**/[id]` — закрыто `requireAdmin`.
- `tours/[id]`, `accommodations/[id]`, `discovery/tours/[id] (GET)` — публичные read endpoint'ы по продуктовой модели.

---

## Технический результат

- Подтвержденные IDOR-точки в operator-маршрутах закрыты SQL-level ownership-фильтрами.
- Object-level доступ к фото туров переведен на строгую проверку связки `tour_id + asset_id`.
- Поведение anti-enumeration сохранено (`404` для чужих ресурсов в приватных object-level endpoint'ах).

---

## Проверки

После внесения изменений:

- `npm run lint` — без новых ошибок (остаются исторические warnings `react-hooks/exhaustive-deps`).
- `JWT_SECRET=dummy-secret npm run build` — успешно.

---

## Текущий статус

- Все изменения по Task 1 закоммичены и запушены в `origin/cursor/middleware-security-rules-130a`.
- Рабочее дерево чистое.

---

## Wave 1 (дополнение): operator booking routes

Проверено в `app/api/operator/bookings/**`:

- `GET /api/operator/bookings` (`route.ts`, query: `tourId`)
- `PUT /api/operator/bookings/[id]` (`[id]/route.ts`, params: `id`)

### Findings

1. `GET /api/operator/bookings`
   - `requireOperator` выполняется до SQL-запросов.
   - Фильтр владения есть в обоих запросах (`t.operator_id = $1`).
   - При чужом `tourId` возвращается пустой список (anti-enumeration соблюдён).
   - Нарушений не обнаружено.

2. `PUT /api/operator/bookings/[id]`
   - До фикса ownership проверялся отдельным pre-check (`verifyBookingOwnership`), но `UPDATE` выполнялся только по `id`.
   - Риск: объектная проверка не была встроена в модифицирующий SQL.

### Fixes

- `app/api/operator/bookings/[id]/route.ts`:
  - сохранён guard `requireOperator` до любых SQL.
  - `operator_id` теперь берётся из JWT-пользователя через `getOperatorPartnerId(session.userId)`.
  - `UPDATE` усилен ownership-фильтром:
    - `WHERE bookings.id = $... AND bookings.tour_id = t.id AND t.operator_id = $...`
  - для `not found / чужой ресурс` возвращается `404` (anti-enumeration).
  - устранён `ApiResponse<any>` в ответе (`ApiResponse<unknown>`).

### Валидация после фикса Wave 1

- `JWT_SECRET=dummy-secret npm run build` — успешно.
- `npm run lint` — успешно, без новых ошибок.

