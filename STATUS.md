# KamchatourHub — Статус платформы

_Обновлено: 2026-03-08_

---

## Текущее состояние

| Показатель | Значение |
|---|---|
| Build | ✅ `npm run build` проходит |
| TypeScript | ✅ 0 ошибок (`tsc --noEmit`) |
| Страниц | 91 (App Router) |
| API endpoints | 210+ |
| Роли | 6 (admin / operator / guide / tourist / moderator / support) |
| Миграции | 023 (raw SQL) |
| Туров в БД | 11 (10 рыбалка, 1 комбо) |
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
