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

---

## Wave 2 (дополнение): operator tour routes

Проверено в `app/api/operator/tours/**` (только `GET/PUT/DELETE` c `id` в `params/query`):

- `GET /api/operator/tours/[id]`
- `PUT /api/operator/tours/[id]`
- `DELETE /api/operator/tours/[id]`
- `GET /api/operator/tours/[id]/photos`
- `DELETE /api/operator/tours/[id]/photos/[photoId]`
- `GET /api/operator/tours/[id]/generate-tags`
- `GET /api/operator/tours/schedules?tourId=...`

Дополнительно по требованию проверен `POST /api/operator/tours`:

- `operator_id` берётся только из JWT (`getOperatorPartnerId(session.userId)`), не из request body.

### Findings

1. `app/api/operator/tours/[id]/route.ts`
   - До фикса ownership проверялся pre-check (`verifyTourOwnership`), но:
     - `GET` выбирал тур по `t.id` без `operator_id`;
     - `PUT` обновлял по `id` без `operator_id`;
     - `DELETE` удалял по `id` без `operator_id`.
   - Риск: ownership не был встроен в основную SQL-операцию (TOCTOU/рассинхронизация pre-check и mutation).

2. `app/api/operator/tours/[id]/generate-tags/route.ts` (`GET`)
   - До фикса `SELECT ai_tags FROM tours WHERE id = $1` без ownership-фильтра.

3. `app/api/operator/tours/[id]/photos/route.ts` (`GET`)
   - До фикса контроль владения был отдельным pre-check, а получение фото шло по `tour_id` без `operator_id`.

4. `app/api/operator/tours/[id]/photos/[photoId]/route.ts` (`DELETE`)
   - До фикса удаление связи выполнялось по `tour_id + asset_id`, без прямого ownership-фильтра `operator_id` в SQL удаления.

5. `app/api/operator/tours/schedules/route.ts` (`GET`, query `tourId`)
   - До фикса чужой `tourId` возвращал пустой список; теперь введён явный `404` для object-level anti-enumeration.

### Fixes

- `app/api/operator/tours/[id]/route.ts`:
  - добавлен strict operator context (`role === 'operator'`) до любых DB-запросов.
  - `GET`: `WHERE t.id = $1 AND t.operator_id = $2`.
  - `PUT`: `UPDATE ... WHERE id = $... AND operator_id = $... RETURNING *`, при `0 rows` -> `404`.
  - `DELETE`: ownership-check `SELECT id FROM tours WHERE id = $1 AND operator_id = $2` + финальный `DELETE ... WHERE id = $1 AND operator_id = $2 RETURNING id`, при `0 rows` -> `404`.

- `app/api/operator/tours/[id]/generate-tags/route.ts`:
  - добавлен strict operator context (`role === 'operator'` + `operatorId` из JWT).
  - `GET`: `SELECT ai_tags ... WHERE id = $1 AND operator_id = $2`.
  - дополнительно усилен `POST`: выбор/обновление тура также через `id + operator_id`.

- `app/api/operator/tours/[id]/photos/route.ts`:
  - добавлен strict operator context (`role === 'operator'` + `operatorId` из JWT).
  - добавлен ownership-check: `SELECT id FROM tours WHERE id = $1 AND operator_id = $2`.
  - при отсутствии владения -> `404`; для своего тура без фото остаётся корректный `200` с пустым массивом.

- `app/api/operator/tours/[id]/photos/[photoId]/route.ts` (`DELETE`):
  - добавлен strict operator context (`role === 'operator'` + `operatorId` из JWT).
  - удаление связи переведено на ownership-aware SQL:
    - `DELETE FROM tour_assets ... USING tours t ... AND t.operator_id = $3 RETURNING ta.asset_id`.
  - при `0 rows` -> `404` (anti-enumeration).

- `app/api/operator/tours/schedules/route.ts` (`GET`):
  - добавлена явная проверка `role === 'operator'` до DB.
  - при наличии `tourId` добавлен ownership-check:
    - `SELECT id FROM tours WHERE id = $1 AND operator_id = $2`
    - при `0 rows` -> `404`.

### Валидация после фикса Wave 2

После каждого изменённого файла выполнялись:

- `JWT_SECRET=dummy-secret npm run build` — успешно.
- `npm run lint` — успешно, без новых ошибок.

