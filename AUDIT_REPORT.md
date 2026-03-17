# Аудит KamchatourHub — 17 марта 2026

## Резюме

Кодовая база крупнее чем нужна — ~30% мёртвый код (k8s, PM2, load-tests, pillar-архитектура). Логика бронирований **реально реализована** в `lib/bookings/booking.service.ts` с транзакциями, правилами возврата и защитой от дублей — но существует параллельно с устаревшим `lib/services/booking.service.ts`. Rate limiting на продакшне **не активен** (Upstash не настроен). Мониторинг (Sentry) **отсутствует** полностью. Две папки миграций с конфликтами нумерации — риск при накате.

---

## Критичное

| # | Проблема | Где | Риск |
|---|---|---|---|
| 1 | **Rate limiting не работает** | `middleware.ts` — Upstash не настроен | Нет защиты от brute-force и DDoS |
| 2 | **JWT без refresh** | `lib/auth/jwt.ts` — 7d expiry, нет refresh endpoint | Нельзя инвалидировать украденный токен до 7 дней |
| 3 | **CSP с `unsafe-inline`** | `middleware.ts` строки с `script-src`, `style-src` | XSS через inline-скрипты не блокируется |
| 4 | **Два разных booking service** | `lib/services/booking.service.ts` (старый) vs `lib/bookings/booking.service.ts` (рабочий) | Разные API routes используют разные версии, поведение расходится |
| 5 | **Две папки миграций** | `lib/database/migrations/` (40 файлов) + `migrations/` в корне (10 файлов) | Неясно что накатывается на прод. `booking_logs` только в корневой папке |
| 6 | **Sentry отсутствует** | `sentry.client.config.ts` — не найден | Ошибки в продакшне невидимы |
| 7 | **Конфликты нумерации миграций** | `006`+`006b`, `007`+`007b`, `030`+`030_fix` | Неопределённый порядок накатки |

---

## Бронирования — состояние

### Итог: **рабочий код**, но с серьёзным архитектурным долгом

Существуют ДВА отдельных сервиса бронирований:

#### `lib/bookings/booking.service.ts` — РАБОЧИЙ (основной)

Используется в `app/api/bookings/route.ts` и `app/api/bookings/[id]/cancel/route.ts`.

| Функция | Наличие | Описание |
|---|---|---|
| State machine | ✅ | `ALLOWED_TRANSITIONS` из `types/booking.types.ts`, `validateTransition()` |
| Атомарные транзакции | ✅ | `transaction(async client => ...)` с `BEGIN`/`COMMIT`/`ROLLBACK` на всех мутациях |
| Защита от double-booking | ✅ | `FOR UPDATE` lock на `tour_departures` + подсчёт `pending`+`confirmed` мест |
| Правила возврата | ✅ | `calculateRefund()`: оператор = 100%; турист >48ч = 100%, 24-48ч = 50%, <24ч = 0% |
| BookingLog | ✅ | `logStatusChange()` пишет в `booking_logs` при каждой смене статуса |
| Отмена с возвратом | ✅ | `cancelBooking()` — транзакция, возврат считается, `cancelled_at`/`cancelled_by` записывается |
| Перенос | ✅ | `rescheduleBooking()` — транзакция, проверка вместимости |

#### `lib/services/booking.service.ts` — УСТАРЕВШИЙ

| Функция | Наличие | Описание |
|---|---|---|
| Транзакции | ❌ | Прямые INSERT/UPDATE без BEGIN |
| Защита от дублей | ❌ | Нет |
| Правила возврата | ❌ | `cancel()` возвращает `refundAmount: 0` хардкодом |
| `availabilityService` | ❌ заглушки | `search()` → `[]`, `createSlot()` → fake UUID, `getCalendar()` → `{ days: [] }` |

#### booking_logs таблица

Существует, но создаётся в `migrations/019_booking_status_expansion.sql` (корневая папка), а не в `lib/database/migrations/`. Неясно накатывается ли на прод.

---

## Мёртвый код

| Папка/файл | Размер | Вердикт |
|---|---|---|
| `k8s/` | 3 папки (`base/`, `production/`, `staging/`) | Мёртвый. Деплой через Timeweb Cloud, не Kubernetes |
| `load-tests/k6/` | 1 папка | Мёртвый. Скрипты `npm run test:load` не запускались с продакшна |
| `ecosystem.config.js` | 1 файл | Мёртвый. Адрес сервера `147.45.158.166` — не совпадает с текущим `89.23.116.15`. Путь `/var/www/kamchatour` не используется |
| `docker-compose.yml` | 1 файл | Частично мёртвый. Полезен для локальной БД, но пути не совпадают с продом |
| `pillars/booking-pillar/` | 1 папка | Мёртвый. Pillar-архитектура не используется в основных API routes |
| `pillars/engagement-pillar/` | 1 папка | Мёртвый |
| `pillars/support-pillar/` | 1 папка | Мёртвый |
| `lib/services/booking.service.ts` | 1 файл | Устаревший. Нужно удалить или заменить на `lib/bookings/booking.service.ts` |
| 3 конфига тестов | `jest.config.js`, `vitest.config.ts`, `playwright.config.ts` | Избыточно — нужен один тест-раннер |
| `mobile-app/`, `driver-app/` | — | Не найдены |

---

## Рекомендации (топ-5)

1. **Настроить Upstash Redis** — иначе rate limiting в `middleware.ts` мёртв, систему можно спамить.
2. **Удалить `lib/services/booking.service.ts`** — заменить все импорты на `lib/bookings/booking.service.ts`. Сейчас два сервиса с разным поведением — мина.
3. **Объединить папки миграций** — перенести файлы из корневого `migrations/` в `lib/database/migrations/`, исправить конфликты нумерации.
4. **Добавить Sentry** — без мониторинга ошибок в продакшне вслепую. Бесплатный план достаточен.
5. **Удалить k8s/, load-tests/, ecosystem.config.js** — мёртвый код путает и раздувает репо.

---

## Детальные результаты

### 1. Структура и размер

| Метрика | Значение |
|---|---|
| `.tsx` файлов в `app/` | 174 |
| `.ts` файлов в `lib/` | 82 |
| Файлов в `lib/database/migrations/` | 40 (+ 10 в корневом `migrations/`) |
| Зависимостей (`dependencies`) | 40 |
| `devDependencies` | 7 |
| NPM scripts | 52 |
| Веток git | 2 (`main`, `refactor-services-split`) |

Ветка `refactor-services-split` существует локально и удалённо — активность неизвестна.

### 2. Безопасность

**middleware.ts (290 строк):**
- Edge Runtime, `jose` для JWT — корректно
- RBAC: 7 prefix-правил (`/api/tourist/*`, `/api/operator/*`, и т.д.) — работает
- Rate limit: скользящее окно 100 req/60s — **условно**, только при наличии `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. По `/diag` — не настроен.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy` — есть
- CSP: только в production, но `script-src 'unsafe-inline'` и `style-src 'unsafe-inline'` — слабая защита
- ❗ Catch block на `jwtVerify` глотает ошибку без логирования

**JWT:**
- Алгоритм: HS256
- Срок: 7 дней
- Хранилище: HttpOnly cookie `auth_token` или `Authorization: Bearer`
- Refresh: **отсутствует**

**Секреты в коде:** не найдены (grep по `sk-ant`, `password =`, `apiKey =` — пусто).

**SQL-инъекции:** все проверенные запросы используют параметризацию (`$1, $2`). ORM отсутствует — ручной SQL везде.

### 3. База данных

**Схема `lib/database/schema.sql`:** определяет ~15 таблиц включая `users`, `partners`, `tours`, `bookings`, `reviews`, `eco_points`.

**Таблица `bookings`** — базовая схема имеет 14 колонок с `status CHECK ('pending', 'confirmed', 'cancelled', 'completed')`. Расширение до 7 статусов (`cancelled_by_tourist`, `cancelled_by_operator`, `refunded`) — в `migrations/019_booking_status_expansion.sql` (корневая папка).

**Индексы на bookings:** `user_id`, `tour_id`, `date`, `start_date`, `status` — адекватно.

**`booking_logs`:** создаётся в корневом `migrations/019`. Индексы: `booking_id`, `created_at`.

**`audit_log`:** создаётся в `lib/database/migrations/029_add_partner_legal_fields.sql`. JSONB поле `data`, индексы на `(entity_type, entity_id)` и `created_at`.

**Конфликты нумерации:** `006`+`006b`; `007`+`007b`; `030_fix_tours_schema`+`030_add_phone_to_users` — не определён порядок при автоматическом накате.

### 4. Инфраструктура

| Компонент | Статус |
|---|---|
| `k8s/` | Существует (`base/`, `production/`, `staging/`) — мёртвый для Timeweb |
| `load-tests/k6/` | Существует — не используется |
| Sentry | Файлы конфига не найдены |
| `docker-compose.yml` | Существует, PostgreSQL `postgis/postgis:15-3.3-alpine` — полезен локально |
| `ecosystem.config.js` | Существует, PM2 config на устаревший сервер `147.45.158.166` |

### 5. AGENTS.md и pillars/

`AGENTS.md` описывает **8 ролей и хабов** включая `stay-provider`, `gear-provider`, `cars`, `souvenirs` — которых нет в текущей кодовой базе. Документ не актуален стратегии "завод лопат". Нужно переписать под текущий фокус: маршруты → маркетплейс → бронирования.

`pillars/`: `booking-pillar/`, `engagement-pillar/`, `support-pillar/` — альтернативная архитектура, не используется основными API routes.

### 6. Фронтенд

**Главная (`_HomePageClient.tsx`):** Hero + CategoryCards + TripPlanner. Минимальная, но рабочая.

**Хабы (проверено 5 страниц):** все 5 — реальный код с интерфейсами, state management, fetch к API. Не заглушки.

**CSS-переменные:** `globals.css` определяет и `--kh-*` (homepage) и `--bg-*`/`--text-*` (hub pages) — обе системы существуют параллельно.

**Шрифты:** Playfair Display + Outfit загружаются через `next/font/google` в `app/layout.tsx`.

### 7. Тестирование

Три конфига тест-раннеров (`jest.config.js`, `vitest.config.ts`, `playwright.config.ts`). Активность: неизвестна без запуска. Избыточность — риск конфликта конфигураций. `app/test/markers/page.tsx` — единственный files в `app/test/`, dev-страница для тестирования маркеров карты.

### 8. package.json

**40 dependencies** — умеренно (для Next.js 15 + Postgres + AI). Зависимостей с очевидным мусором не обнаружено.

**52 scripts** — из них ~20 для Kubernetes и scraping-пайплайнов. Если k8s мёртвый — эти скрипты можно удалить.

**Next.js:** 15.x. TypeScript: 5.x. Актуальные версии.

### 9. Git

**Последние 20 коммитов** — все по существу, последние 3 месяца фокус на: AI-функционал бота, аналитика и маркетплейс маршрутов.

**Ветки:** только `main` активна. `refactor-services-split` — не мёржена, статус неизвестен.

---

*Аудит проведён: 17.03.2026 | Инструмент: Claude Sonnet 4.6*
