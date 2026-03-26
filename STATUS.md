# KamchatourHub — Статус платформы

_Обновлено: 2026-03-26_

---

## Текущее состояние

| Показатель | Значение |
|---|---|
| Build | ✅ `npm run build` проходит |
| TypeScript | ✅ 0 ошибок (`tsc --noEmit`) |
| Страниц | 94 (App Router) |
| API endpoints | 217+ |
| Роли | 6 (admin / operator / guide / tourist / moderator / support) |
| Миграции | 083 (raw SQL) |
| Туров в БД | 11+ |
| Маршрутов (kamchatka_routes) | 129 |
| Маршрутов (agent_route_knowledge) | 129 |
| Маршрутов (knowledge-base.json) | 129 |

---

## Исправленные критические баги

### P0 — устранено

| Баг | Статус | Решение |
|---|---|---|
| SOS API отсутствовал | ✅ ИСПРАВЛЕНО | `app/api/safety/sos/route.ts` создан |
| `chat_sessions` таблицы не было | ✅ ИСПРАВЛЕНО | Миграции 021 + 022 |
| `/api/profile` не существовал | ✅ ИСПРАВЛЕНО | `app/api/profile/route.ts` создан |
| Booking forms хардкод email/userId | ✅ ИСПРАВЛЕНО | `TourBookingForm.tsx`, `StayBookingForm.tsx` |

### P1 — устранено

| Баг | Статус | Решение |
|---|---|---|
| Витрина туров разбита на 3 несвязанные ветки | ✅ ИСПРАВЛЕНО | Единый `TourCard`, переписаны все страницы |
| Галерея туров не рендерилась (нет `relative`) | ✅ ИСПРАВЛЕНО | `_TourDetailsPageClient.tsx` |
| Несовпадение имён полей API↔frontend | ✅ ИСПРАВЛЕНО | `price/maxGroupSize/reviewCount/included` |
| `_FishingToursPageClient` из статических данных | ✅ ИСПРАВЛЕНО | Загрузка из `/api/tours?category=fishing` |
| `_FishingTourDetailPageClient` хардкод | ✅ ИСПРАВЛЕНО | Загрузка из `/api/tours/${id}` |
| `_HomePageClient` сломанные `require()` | ✅ ИСПРАВЛЕНО | Удалены строки 546–553 |
| `ai:setup-agent-rag` крашился | ✅ ИСПРАВЛЕНО | `ts-node` → `tsx` в package.json |

---

## Реализованные фичи (эта сессия)

### AI Lead Processor (26.03.2026)

AI-обработка входящих заявок для операторов. Цель: 80% заявок без участия человека.

**Пайплайн:** входящий лид → AI-квалификация → подбор туров → персональное предложение → PDF → Telegram-уведомление оператора

- Миграция `083_lead_processor.sql` — расширены `leads` (9 статусов), новые таблицы `lead_proposals`, `lead_activity_log`
- `lib/services/lead-processor.service.ts` — `LeadProcessorService` (AI-квалификация через `callAIFast`, ранжирование туров, генерация предложения)
- `lib/pdf/proposal-generator.ts` — PDF на PDFKit: шапка TourHab, headline, summary, highlights, карточка тура, контакты
- `lib/notifications/lead-notify.ts` — Telegram-нотификации: новый лид + готовое предложение со ссылкой
- `app/api/leads/process/route.ts` — `POST /api/leads/process` — запуск AI-обработки
- `app/api/leads/[id]/proposal/route.ts` — `GET /api/leads/[id]/proposal` — данные предложения
- `app/api/leads/[id]/proposal/pdf/route.ts` — `GET /api/leads/[id]/proposal/pdf` — скачать PDF
- `app/hub/operator/leads/` — страница лидов оператора с фильтрами, statcard, one-click AI-обработкой

**Зависимости:** `pdfkit` + `@types/pdfkit` добавлены в package.json

**Статусы лида (state machine):**
`new` → `ai_processing` → `ai_qualified` → `proposal_sent` → `awaiting_confirm` → `converted` / `lost`

**Booking state machine** расширен до 10 статусов (добавлены `awaiting_payment`, `deposit_paid`, `in_progress`).

---

### route_id у туров
Туры теперь ссылаются на объект `kamchatka_routes` через FK `route_id`.
- Миграция: `023_add_route_id_to_tours.sql`
- API: `GET /api/kamchatka-routes` — публичный список маршрутов
- TourForm: выбор базового маршрута при создании тура
- TourCard / TourDetails: показывает `📍 Маршрут`, координаты → WeatherWidget

### Единая витрина туров
- `components/tours/TourCard.tsx` — единый компонент для всех категорий
- `app/tours/_ToursPageClient.tsx` — каталог с пагинацией и фильтрами
- `app/tours/[id]/_TourDetailsPageClient.tsx` — детальная страница (галерея, оператор, бронирование)
- `app/tours/fishing/_FishingToursPageClient.tsx` — рыбалка через API
- `app/tours/fishing/[id]/_FishingTourDetailPageClient.tsx` — детальная рыбалка через API

### База знаний агентов
- 129 маршрутов в `agent_route_knowledge` (RAG)
- 129 маршрутов в `crew/knowledge-base.json`
- Синхронизация: `npm run db:sync:agent-routes`

---

## Известные ограничения (не блокируют деплой)

| Ограничение | Приоритет |
|---|---|
| Email-уведомления при бронировании / возврате хардкодят `user@example.com` | P2 |
| Grafana мониторинг работает только в docker-compose (не на Timeweb) | P2 |
| E2E тесты (Playwright) не написаны | P3 |

---

## Деплой

Timeweb Cloud автоматически деплоит при `git push origin main`.

**URL:** pospkam-pospktry-c1f3.twc1.net

**Переменные окружения (требуются на Timeweb):**
```
DATABASE_URL
JWT_SECRET
NEXTAUTH_SECRET
NEXT_PUBLIC_APP_URL
DEEPSEEK_API_KEY
XAI_API_KEY
MINIMAX_API_KEY
YANDEX_WEATHER_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## Команды

```bash
npm run dev                          # localhost:3000
npm run build                        # production build
npx tsc --noEmit --skipLibCheck      # TypeScript check

npm run db:sync:agent-routes         # синхронизация 129 маршрутов → agent_route_knowledge
npm run ai:setup-agent-rag           # обновить knowledge-base.json

npm run db:import:kamchatka-routes   # импорт маршрутов из JSON
npm run db:seed                      # тестовые данные
```
