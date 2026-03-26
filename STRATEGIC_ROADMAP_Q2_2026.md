# TourHab — STRATEGIC ROADMAP Q2 2026

**Обновлено:** 26 марта 2026 (по факту кода в репозитории)
**Цель:** 50 активных операторов, 500 бронирований/мес к концу Q2

---

## ТЕКУЩЕЕ СОСТОЯНИЕ (26 марта 2026)

**Готовность MVP:** ~65% общего роадмапа / ~45% MVP для оператора

### РЕАЛИЗОВАНО

- **20 AI-агентств** (admin, rescue, eco, legal, security, hacker, planning, quality, content, finance и др.)
- **Agent Scheduler** (4h cron, Redis-lock) — `lib/agents/scheduler.ts`
- **Board Meeting** (`/hub/admin/board-meeting`) — совещания директоров с Proposals
- **AI Lead Processor** (код) — квалификация, PDF, Telegram, scoring 0-100
- **Operator Hub** — 17 страниц (leads, bookings, tours, calendar, analytics, finance, guides…)
- **Admin Hub** — 24 страницы
- **Tourist Hub** — 8 страниц
- **83 миграции** БД (последняя: 083_lead_processor)
- **CloudPayments** webhook endpoint существует
- **Commission Service** — `lib/services/commission.service.ts`
- **TripBuilder** — планировщик маршрутов
- **14 cron-задач** (digest, safety, SOS, agents-evolve, payouts…)
- **Semantic search** — `/api/discovery/semantic-search`
- **robots.txt** — правильный домен tourhab.ru
- **CI/CD** — GitHub → Timeweb автодеплой

### НЕ РЕАЛИЗОВАНО (критичные пробелы)

| Пробел | Критичность | Где |
|--------|------------|-----|
| Оператор Dashboard KPI (revenue 7d, bookings today) | КРИТИЧНО | `/hub/operator/page.tsx` минимальный |
| CloudPayments webhook → auto-create commission records | КРИТИЧНО | `/api/payments/webhook` не пишет в agent_commissions |
| Real-time availability check перед бронированием | HIGH | нет `operator_availability` проверки |
| Bulk CSV import туров | HIGH | нет `/api/operator/tours/import` |
| Mobile navbar на `/planner` | HIGH | нет |
| GDPR Export API `/api/user/export` | HIGH | нет |
| GDPR Delete API `/api/user/delete` | HIGH | нет |
| Consent checkpoints в регистрации/бронировании | MEDIUM | нет |
| Guide marketplace в TripBuilder | MEDIUM | нет |
| Event bus для межагентных алертов | MEDIUM | нет `lib/events/agent-bus.ts` |
| Post-booking Telegram reminders (полная интеграция) | MEDIUM | код есть, flow неполный |
| Lead Processor analytics dashboard | MEDIUM | нет |
| Health check `/api/health/lead-processor` | LOW | нет |

---

## РОАДМАП ПО НЕДЕЛЯМ

### Неделя 1 (26 марта – 1 апреля): ДЕПЛОЙ + СТАБИЛИЗАЦИЯ

**Цель:** Всё что написано — работает на проде.

- [ ] Timeweb задеплоил коммит 0a9af271 (build ID сменился)
- [ ] Миграция 083 применена (`POST /api/admin/migrations/apply {"migrations":["083"]}`)
- [ ] OperatorPromo видна на tourhab.ru (скролл главной до конца)
- [ ] AI Lead Processor протестирован на реальных лидах (5+)
- [ ] PDF генерируется без ошибок
- [ ] Telegram уведомления доходят операторам
- [ ] Первые 3-5 операторов зарегистрированы (outreach)

**Метрика:** OperatorPromo видна + 1 реальный обработанный лид на проде

---

### Неделя 2 (1-7 апреля): OPERATOR DASHBOARD V1

**Цель:** Оператор заходит и сразу видит цифры.

- [ ] KPI-карточки на `/hub/operator/page.tsx`: выручка 7d, бронирований сегодня, активных туров, новых лидов
- [ ] API `GET /api/operator/metrics/7d` — агрегированная статистика
- [ ] Bulk CSV import туров `POST /api/operator/tours/import`
- [ ] Lead analytics mini в `/hub/operator/leads` (итого, % обработано, avg время)

**Метрика:** 5 новых операторов прошли онбординг, каждый загрузил хотя бы 1 тур

---

### Неделя 3 (8-14 апреля): ФИНАНСОВАЯ МОДЕЛЬ

**Цель:** Каждый платёж → автоматическая запись комиссии.

- [ ] CloudPayments webhook → INSERT в `agent_commissions` при `paid`-статусе
- [ ] Payout dashboard для агента `GET /api/agent/payouts`
- [ ] Проверка доступности слота перед бронированием (`operator_availability`)
- [ ] Dispute flow (возврат → перерасчёт комиссии)

**Метрика:** 100% транзакций создают commission record, 0 ручных правок

---

### Неделя 4 (15-21 апреля): ТУРИСТ + МОБИЛКА

**Цель:** Турист может забронировать end-to-end.

- [ ] Mobile navbar на `/planner`
- [ ] TripBuilder → real booking flow (выбор тура → оплата → подтверждение)
- [ ] Post-booking: Telegram-напоминание за 1 день, за 1 час до тура
- [ ] Рескедулинг при погодном алерте (показать альтернативные даты)

**Метрика:** Booking conversion 1%+ (сейчас < 0.5%)

---

### Неделя 5 (22-28 апреля): GDPR + COMPLIANCE

**Цель:** Пройти базовый аудит 152-ФЗ / GDPR.

- [ ] Consent checkpoint при регистрации и бронировании
- [ ] Audit log: `user_id, doc_id, version, timestamp, ip`
- [ ] `GET /api/user/export` — все персданные в JSON
- [ ] `POST /api/user/delete` — soft-delete с 30-дневным окном

**Метрика:** 0 audit flags, consent для 100% новых регистраций

---

### Неделя 6-8 (май): МАСШТАБ

- Event bus для межагентных алертов (`lib/events/agent-bus.ts`)
- Guide marketplace в TripBuilder
- Operator discovery page с badges
- 25+ активных операторов
- SEO: `/routes/*`, `/operators/*` проиндексированы Яндексом

---

## КЛЮЧЕВЫЕ МЕТРИКИ Q2

| Метрика | Сейчас | Цель Q2 |
|---------|--------|---------|
| Активных операторов | 1 | 50 |
| Бронирований/мес | ~8 | 500 |
| Лидов обработано AI | 0 | 80%+ |
| Выручка комиссий | 0 | 500к ₽/мес |
| Uptime | ~99% | 99.9% |
| GDPR compliance | ~20% | 100% |

---

## РИСКИ

| Риск | Митигация |
|------|-----------|
| Timeweb не деплоит (webhook broken) | Ручной redeploy через панель |
| Миграция 083 падает на проде (конфликт) | `dry_run: true` сначала, смотреть ошибку |
| CloudPayments webhook double-fire | Idempotency key по `payment_id` |
| AI галлюцинации в предложениях | Human review для лидов >300к бюджета |
| GDPR аудит до реализации | Временный disclaimer на регистрации |

---

## АРХИТЕКТУРНЫЕ РЕШЕНИЯ (зафиксированные)

- **Scheduler:** In-process (node-cron) + Redis deduplication lock
- **Commission:** Per-booking immutable ledger (не aggregate)
- **Migration применение:** Через `/api/admin/migrations/apply` (admin JWT), не через прямой SQL доступ
- **Deploy:** GitHub push → CI (tsc + vitest) → Timeweb webhook автодеплой
- **AI провайдеры:** OpenRouter (primary) → DeepSeek → YandexGPT waterfall
