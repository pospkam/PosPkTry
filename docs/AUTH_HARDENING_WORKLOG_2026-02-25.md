# AUTH hardening worklog (2026-02-25)

## Контекст

Цель работ: закрыть критичные пробелы по авторизации в `app/api/**`, убрать заглушки, перевести маршруты на реальные JWT-based guards и явно зафиксировать публичные endpoints там, где это задумано по дизайну.

Работа выполнена в ветке:

- `cursor/middleware-security-rules-130a`

---

## Коммиты по AUTH

1. `9a1c139` - `chore: annotate api routes missing explicit auth checks`
2. `2c74ef6` - `fix: enforce auth checks for critical api groups`
3. `d29e6a3` - `fix: enforce role auth for guide and transfer apis`
4. `f1f1e6b` - `fix: enforce auth on support notifications and partner apis`
5. `fe7e6aa` - `fix: secure booking and creation endpoints with auth guards`
6. `50d240c` - `fix: finalize auth coverage and explicit public endpoint policy`

---

## Основные изменения по волнам

## Волна 1: инвентаризация

- Выполнен аудит `app/api/**/*.ts`.
- Во все маршруты без явной auth-логики были добавлены маркеры `TODO: AUTH` для дальнейшего поэтапного закрытия.

## Волна 2: critical группы

- Закрыты ключевые группы:
  - `admin/**` -> `requireAdmin`
  - `operator/**` -> `requireOperator`
  - `guide/**` / transfer-группы -> role guards
  - критичные bookings/payments маршруты -> `verifyAuth`/guards + ownership checks
- Начата замена небезопасных header-проверок (`x-user-*`) на JWT-based проверки.

## Волна 3: support + notifications + partner + loyalty + tourist

- `support/*`:
  - SLA, agents, feedback, tickets, ticket messages закрыты нужными guard'ами.
  - Добавлены проверки доступа участника/агента/админа в тикетных маршрутах.
- `notifications/*`:
  - GET/PUT/DELETE/mark-all-read -> `requireAuth`
  - send/tour-reminders -> `requireAdmin`
- `partner/*`, `partners/*`:
  - management endpoints -> admin/operator rules по контексту.
  - публичные маршруты явно помечены как public-by-design.
- `loyalty/promo/apply` -> userId только из JWT.
- `tourist/recommendations` -> `requireRole(['tourist','admin'])`.

## Волна 4: auth + tours + accommodations + cart + availability

- Маршруты `auth/*` промаркированы по фактической модели доступа:
  - login/register/signin/signup/demo -> публичные entry points
  - signout -> idempotent endpoint
  - me -> JWT validation inside handler
- `tours`:
  - public GET endpoints помечены явно.
  - create/book endpoints закрыты guard'ами.
  - для оператора привязка `operatorId` к профилю пользователя через helper.
- `accommodations`:
  - public read endpoints помечены явно.
  - create/book endpoints закрыты guard'ами.
- `cart` и `bookings/availability/calendar` оставлены публичными с явной маркировкой.
- Для внутренних вызовов `payments/create` токен передается через `Authorization: Bearer` из входящего запроса.

## Волна 5: analytics + discovery + eco/gear/souvenirs + infra/webhooks + ai

- `analytics/*` закрыты role-guards для operator/admin + auth для user dashboards.
- `discovery/*`:
  - public read/search endpoints явно помечены.
  - create/update/delete/publish/review moderation endpoints закрыты role/ownership guard'ами.
- `eco-points`:
  - GET public
  - POST admin-only
- `gear/*` и `reviews/tour/[tourId]`:
  - приватные действия переведены на `requireAuth` и JWT userId.
- `souvenirs/[id]`:
  - GET public
  - PUT/DELETE admin-only
- infra endpoints:
  - upload endpoints -> `requireAuth`
  - import/asset, telegram/check -> `requireAdmin`
  - webhooks оставлены публичными с явной пометкой про HMAC/signature protection
  - health/ping/docs/csrf/geocode/weather/trip-plan оставлены публичными с явной пометкой
- `ai/knowledge-base` переведен на admin-only (GET/POST), остальные AI-assistant routes оставлены публичными по продуктовой логике.

---

## Технические результаты

- Убраны legacy-проверки через кастомные user headers в целевых приватных маршрутах.
- Добавлены и унифицированы guards:
  - `requireAuth`
  - `requireRole`
  - `requireAdmin`
  - `requireOperator`
  - `requireTransferOperator`
- Добавлены ownership проверки в критичных CRUD маршрутах.
- Исправлены случаи неправильной работы с `params: Promise<{...}>` (`await params`).

---

## Проверки

Выполнено после каждой крупной волны:

- `npm run lint` (успешно, есть старые предупреждения `react-hooks/exhaustive-deps`)
- `JWT_SECRET=dummy-secret npm run build` (успешно)

Итоговая проверка:

- количество `TODO: AUTH` в `app/api/**/*.ts` = `0`

---

## Объем изменений

По AUTH-волнам затронуто:

- `163` уникальных файлов
- из них `161` в `app/api/**`

---

## Текущий статус

- Все изменения закоммичены и запушены в `origin/cursor/middleware-security-rules-130a`.
- Рабочее дерево чистое.

---

## Следующий логичный шаг

Провести отдельный deep-аудит IDOR не по маркерам, а по фактическим SQL/ownership веткам (особенно в маршрутах с фильтрами, обновлениями и delete-операциями), и оформить отдельный отчет по рискам и фиксам.

