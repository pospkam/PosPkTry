# TourHab — AI-first туристическая платформа Камчатки

AI-помощник Кузьмич подбирает маршрут за минуту. Турист описывает мечту — система комбинирует базовые туры в персональный план. Каталог работает как страховка для тех, кто предпочитает выбирать руками.

Внутри — 10 AI-директоров (Board of Directors), которые управляют платформой: от безопасности и экологии до роста и финансов. Собственник имеет финальное слово через систему одобрений.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

**Продакшен:** [tourhab.ru](https://tourhab.ru)

---

## Концепция

```
Турист: "Хочу 3 дня — рыбалка + вулканы + медведи"
    │
    ▼
Кузьмич AI → находит Reference Tours → комбинирует → генерирует план
    │
    ▼
Бронирование прямо из чата
```

**Гибридная модель:** AI как суперсила, каталог как страховка.

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS |
| Backend | Next.js API Routes, PostgreSQL (pg pool, прямой SQL) |
| Auth | JWT (jose) + bcrypt, 6 ролей |
| AI Providers | OpenRouter (primary, OR_API_KEY) → DeepSeek → MiniMax 2.5 → YandexGPT → MiMo → Gemini → Anthropic → xAI |
| Agent Layer | 10 AI-директоров + 7 рабочих агентов (`lib/agents/`) |
| Maps | Yandex Maps API 2.1 |
| Telegram | @KuzmichKam_bot (tourist) + admin bot |
| Storage | Timeweb S3 (`s3.twcstorage.ru`) |
| Deploy | Timeweb Cloud, GitHub → автодеплой |

---

## Быстрый старт

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.example .env.local
# Заполнить: DATABASE_URL, JWT_SECRET, хотя бы один AI-ключ
npm run dev
```

### Команды

```bash
npm run dev              # Dev-сервер (порт 3000)
npm run build            # Production-сборка
npx tsc --noEmit         # TypeScript (0 ошибок)
npx vitest run           # Тесты

# Скрипты (Node.js)
node scripts/migrate.js                      # Накатить миграции
node scripts/seed-prod.js                    # Сид-данные (операторы + туры)
node scripts/outreach-operator.js [handle]   # Telegram outreach оператору
```

---

## Структура проекта

```
app/
  page.tsx                       # Главная (Hero + AI Section + Directions + Trust)
  ai-assistant/                  # AI-чат с Кузьмичом
  routes/                        # Каталог маршрутов
    [id]/                        # Детальная: описание + AI-отзыв + офферы +
                                 # InsuranceBlock / FlightsBlock / HotelsBlock / TransfersBlock
  operators/                     # Каталог операторов
    [slug]/                      # Профиль оператора
  map/                           # Интерактивная карта (Yandex Maps)
  hub/                           # Личные кабинеты (8 хабов)
    tourist/ operator/ guide/ admin/ agent/
    transfer/ transfer-operator/ fishing/
  api/                           # 400+ API endpoints
    ai/                          # AI chat, waterfall, debug
    agents/                      # Board meeting, dispatch, approvals, intelligence
    cron/                        # Digest, intelligence monitoring (каждые 6ч)
    planner/compose/             # AI composition engine
    reference-tours/             # Базовые туры для AI
    routes/ bookings/ tours/     # Каталог, бронирования
    tours-feed/                  # Channel manager export (JSON + XML)
    telegram/                    # Webhook бота
    webhooks/travelpayouts/      # Payout уведомления от TravelPayouts
    analytics/affiliate-clicks/  # Трекинг аффилиат-кликов

components/
  homepage/                      # HeroSection, AISection, FeaturedDirections,
                                 # TrustSection, HomeBottomNav, Reveal
  routes/                        # RouteCard, LeadModal, BookingModal
                                 # InsuranceBlock, FlightsBlock, HotelsBlock, TransfersBlock
  affiliate/                     # AffiliateFlightBanner, AffiliateCard
  operator/                      # OperatorEarningsCard
  shared/                        # SOSButton, AssistantButton, LeafletMap, StickyLeadButton
  layout/                        # Header, Footer

lib/
  agents/                        # AI Agent Framework
    agencies/                    # 17 agency-классов (10 директоров + 7 рабочих)
    tools/agent-toolkits.ts      # Инструменты для всех директоров
    evolution/                   # Knowledge base, context builder
    learning/                    # Feedback loop, A/B experiments
    execution/                   # Initiative executor
    scheduler.ts                 # Автономное расписание агентов
    platform-agent.ts            # Intent dispatcher
  ai/
    providers.ts                 # AI waterfall (8 провайдеров)
    provider-config.ts           # Ключи и конфигурация
    embeddings.ts                # Smart search
  services/                      # Доменные сервисы
    travelpayouts.ts             # Affiliate links (8 партнёров, 6h cache)
    intelligence-monitor.ts      # Мониторинг AI/Travel/конкурентов (RSS + Tavily)
    insurance.service.ts         # Подбор страховки по типу активности
    flights.service.ts           # Рейсы из MOW/LED/VVO/OVB
    hotels.service.ts            # Отели Петропавловска
    transfers.service.ts         # Трансферы аэропорт → город → тур
  bookings/booking.service.ts    # Бронирования
  auth/                          # JWT middleware
  db-pool.ts                     # PostgreSQL pool ({ pool })
  types/db-rows.ts               # Интерфейсы строк БД

scripts/
  migrate.js                     # Накатить SQL-миграции (Node.js pg)
  seed-prod.js                   # Сид-данные для продакшена
  outreach-operator.js           # Telegram outreach для операторов
```

---

## AI-архитектура

### Waterfall провайдеров

```
OpenRouter (OR_API_KEY, primary) → DeepSeek → MiniMax 2.5
    → YandexGPT → MiMo → Gemini → Anthropic → xAI
```

Каждый провайдер пробуется по очереди. Первый успешный ответ возвращается.
Файл: `lib/ai/providers.ts`

### AI Composition (planner)

```
Турист описывает мечту → /api/planner/compose
    → парсинг интента
    → поиск Reference Tours в БД (activity_type, zone, price)
    → AI генерирует день-за-днём план
    → бронирование из чата
```

### 10 AI-директоров (Board of Directors)

| Агент | Роль | Частота |
|-------|------|---------|
| Admin | Операционный директор | 4ч |
| Legal | Юрисконсульт | 24ч |
| Security | Безопасность | 2ч |
| Hacker | Директор по росту | 6ч |
| Rescue | SAR / Спасатель | 30 мин |
| Eco | Эколог | 1ч |
| Content | Контент-аудитор | 8ч |
| Quality | Качество сервиса | 12ч |
| Planning | Стратег/прогнозы | 12ч |
| Evo | Архитектор/эволюция | 24ч |

Совещание: `/hub/admin/board-meeting` (4 раунда: отчёты → реакции → голосование → инициативы).
Подробности: `AGENTS.md`

### Intelligence Monitor (Evo)

Агент `evo` каждые 6 часов мониторит:
- **AI & Tech** — Habr, Google AI Blog, HuggingFace, OpenAI, Anthropic RSS
- **Travel Industry** — rata-news, tourprom, ator, atorus
- **Конкуренты** — kamgov RSS + Tavily/Brave поиск

Результат сохраняется в `agent_memory` (TTL 7 дней). Критические находки → Telegram.

---

## Homepage

Четыре секции:

1. **Hero** — полноэкранный фон (light/dark), заголовок "Камчатка ждёт тебя", AI-поиск, quick chips
2. **AI Section** — "Расскажите, о чём мечтаете" + 6 suggestion cards → `/ai-assistant`
3. **Featured Directions** — 6 карточек: Вулканы, Медведи, Рыбалка, Термальные, Океан, Вертолёты
4. **Trust Section** — статистика (1000+ маршрутов, 18 операторов, 24/7 SOS, рейтинг 4.8) + отзывы

---

## Ключевые фичи

### AI Lead Processor (Operator Hub)
- Страница: `/hub/operator/leads` (one-click обработка лида)
- API: `POST /api/leads/process` — AI-квалификация + матчинг туров + персональное предложение
- API: `GET /api/leads/[id]/proposal` — готовое предложение
- API: `GET /api/leads/[id]/proposal/pdf` — PDF предложения (PDFKit)
- Telegram-нотификация оператора после обработки
- Цель: до 80% заявок без ручной обработки оператором

**Пайплайн:**
```
Новая заявка (lead)
  -> AI квалификация (callAIFast / DeepSeek)
  -> Подбор 1-3 туров
  -> Генерация headline + summary + highlights
  -> Сохранение в lead_proposals
  -> PDF за ~1-2 сек
  -> Telegram оператору + ссылка на one-click подтверждение
```

### AI-помощник Кузьмич
- Чат на `/ai-assistant` + виджет на каждой странице
- Голос местного жителя, знает Камчатку
- Подбор маршрутов, ответы на вопросы, бронирование

### Каталог маршрутов
- 1189 маршрутов, 16 типов локаций, 15 типов активностей
- AI-отзывы Кузьмича (101+ маршрутов)
- Фильтрация, поиск, пагинация

### Route Enrichment (страница тура)

Каждая страница тура обогащена блоками для полной туристической подготовки:

| Блок | Сервис | Описание |
|------|--------|----------|
| InsuranceBlock | Cherehapa | Подбор страховки по типу активности (Basic/Silver/Gold) |
| FlightsBlock | Aviasales | Рейсы из MOW/LED/VVO/OVB в PKC с примерными ценами |
| HotelsBlock | Hotellook | Топ-4 отеля Петропавловска с ценами и рейтингом |
| TransfersBlock | Kiwitaxi | Трансферы аэропорт → город → тур |

### Channel Manager (Tour Export Feed)

Операторы регистрируются один раз на TourHub → туры автоматически попадают в другие системы.

```
GET /api/tours-feed              # JSON, все туры
GET /api/tours-feed?format=xml   # XML для Sputnik8/GetYourGuide
GET /api/tours-feed?operator=fishingkam  # Фильтр по оператору
```

### Аффилиат монетизация

- **8 партнёрских сервисов:** Aviasales, Ostrovok, Sutochno, Kiwitaxi, Tripster, Sputnik8, Cherehapa, WeGoTrip
- **Server-side генерация ссылок** — API-ключ TravelPayouts никогда не попадает на клиент
- **In-memory кэш** — 6ч TTL, не более 100 req/min к TravelPayouts API
- **`affiliate_clicks`** — трекинг кликов с attribution (partner, source, tour_id, referrer)
- **`affiliate_payouts`** — reconciliation выплат от партнёров (по `tp_click_id`)
- **Webhook:** `POST /api/webhooks/travelpayouts` — payout-уведомления
- **Operator Dashboard:** карточка "Доходы за 30 дней" — бронирования + аффилиат
- **API:** `GET /api/hub/operator/earnings` — доходная статистика оператора

### Бронирования
- Стейт-машина (10 статусов)
- Защита от double-booking (`FOR UPDATE` lock)
- Гости могут оставить лид-заявку без регистрации (TourPaymentModal)
- Правила возврата: оператор 100%, турист >48ч 100%, 24-48ч 50%, <24ч 0%

**Booking статусы:**
`pending`, `awaiting_payment`, `deposit_paid`, `confirmed`, `in_progress`, `completed`, `cancelled`, `cancelled_by_tourist`, `cancelled_by_operator`, `refunded`

**Lead статусы:**
`new`, `ai_processing`, `ai_qualified`, `proposal_sent`, `awaiting_confirm`, `contacted`, `qualified`, `converted`, `lost`

### Карта
- Yandex Maps, 900+ маркеров с попапами
- Фильтр по типу локации и активности

### AI Спасатель (`/hub/safety` → вкладка "AI Спасатель")
- Публичный чат без авторизации — работает когда человеку плохо и не до логина
- SSE-стриминг: первые слова за ~1 сек даже при слабом сигнале
- Офлайн-режим: 7 локальных протоколов по ключевым словам (медведь, заблудился, переохлаждение…)
- Системный промпт по стандартам МЧС России, ГОСТ Р 22.3.02, WFA / WFR
- 8 детальных протоколов: медведь, потерялся, переохлаждение, травма, землетрясение, вулкан, непогода, нет связи
- API: `POST /api/safety/rescue-chat` (rate-limit 20 req/min, stream: true|false)

### SOS-кнопка
- Поля "Имя" и "Телефон" в модале — спасатели знают чью жизнь спасают
- Координаты GPS автоматически
- Telegram-уведомление включает имя + телефон туриста
- Migration 050: `sos_events` получила `tourist_name`, `tourist_phone`, `message`, `emergency_type`

### Telegram-бот
- @KuzmichKam_bot: AI-диалог, маршруты, погода, операторы
- Admin-бот: понимает свободный текст → роутит в PlatformAgent (10 директоров)
- Admin-команды: `/agents` — список всех агентов с примерами, `/health`, `/stats`, `/leads`
- setup-webhook поддерживает оба бота: `{ bot: 'main' | 'admin' }`

---

## Переменные окружения

```bash
# === Обязательные ===
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=...

# === AI (waterfall, хотя бы один) ===
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
OR_API_KEY=...               # OpenRouter (primary key)
OPENROUTER_API_KEY=...       # OpenRouter (fallback key)

# === S3 Storage (Timeweb) ===
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=kamhub-uploads

# === Telegram ===
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_BOT_TOKEN=...   # Admin-бот (free text → PlatformAgent)
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_CHAT_ID=...
TELEGRAM_CHANNEL_ID=...
TELEGRAM_LEADS_CHAT_ID=...
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=...

# === Analytics ===
NEXT_PUBLIC_YANDEX_METRIKA_ID=...

# === Email (SMTP Yandex) ===
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...

# === Аффилиат ===
TRAVELPAYOUTS_MARKER=402896
TRAVELPAYOUTS_TRS=513488
TRAVELPAYOUTS_API_TOKEN=...      # Генерация affiliate ссылок
TRAVELPAYOUTS_WEBHOOK_TOKEN=...  # Верификация payout webhook

# === Платежи (опционально) ===
CLOUDPAYMENTS_API_SECRET=...
NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID=...
YANDEX_PAYMENT_SHOP_ID=...       # YooKassa
YANDEX_PAYMENT_SECRET_KEY=...    # YooKassa
```

---

## База данных

### Ключевые таблицы

```sql
-- AI-first
reference_tours          -- Базовые туры (1 активность = 1 тур) для AI composition
composite_bookings       -- Составные бронирования от AI planner

-- Knowledge base
agent_route_knowledge    -- 1189 маршрутов, kuzmich_review, location/activity types
agent_memory             -- Память агентов (intel_*, TTL 7 дней)

-- Marketplace
v_route_marketplace      -- VIEW: маршрут + тур + оператор + цена + дата

-- Операторы и туры
partners                 -- Операторы (slug, профиль, контакты)
tours                    -- Туры операторов
tour_departures          -- Выезды (дата, слоты, цена)
bookings                 -- Бронирования (10 статусов)
booking_logs             -- Лог смен статуса

-- Пользователи
users                    -- 6 ролей: tourist, operator, guide, transfer_operator, agent, admin
leads                    -- Заявки без регистрации
lead_proposals           -- AI-предложения по лидам
lead_activity_log        -- Журнал действий по лидам

-- Аналитика
page_views               -- Собственная аналитика

-- Аффилиат монетизация
affiliate_clicks         -- Клики по партнёрским ссылкам (084)
affiliate_payouts        -- Выплаты от партнёров (TravelPayouts и др.) (085)
```

### Миграции

Миграции: `lib/database/migrations/` + `migrations/`.
Последняя: **`085_affiliate_payouts.sql`**

```bash
node scripts/migrate.js   # Накатить все новые миграции
```

---

## Дизайн-система

### CSS-переменные

| Токен | Light | Dark |
|-------|-------|------|
| `--bg-primary` | `#F5F0EB` | `#0D1117` |
| `--bg-card` | `#FFFFFF` | `#21262D` |
| `--accent` | `#D44A0C` | `#E8734A` |
| `--ocean` | `#2568B0` | `#00A8CC` |
| `--success` | `#3FB950` | `#3FB950` |
| `--border` | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.08)` |

### Утилиты
`ds-page` `ds-card` `ds-input` `ds-btn` `ds-btn-primary` `ds-btn-secondary` `ds-h1` `ds-h2` `ds-label` `ds-skeleton`

### Типографика
- Заголовки: **Playfair Display** (`--font-playfair`)
- Текст: **Outfit** (`--font-outfit`)

---

## Деплой

```
git push origin main → Timeweb Cloud (App 159529) → tourhab.ru
```

**Проверки перед пушем:**
```bash
npx tsc --noEmit      # 0 ошибок
npx vitest run        # Тесты зелёные
```

---

## Текущее состояние (апрель 2026)

```
Страниц:              94+
API endpoints:        400+
Компонентов:          120+
Миграций:             085
Маршрутов в БД:     1 189
AI-провайдеров:         8  (waterfall)
AI-директоров:         10  (Board of Directors)
TS-ошибок:              0
```

**Последние изменения:**
- **Route Enrichment** — каждый тур обогащён блоками Insurance / Flights / Hotels / Transfers (фазы 1+2)
- **Channel Manager** — `/api/tours-feed` (JSON+XML) для синдикации туров на Tripster/Sputnik8
- **Intelligence Monitor** — агент `evo` мониторит AI-тренды, travel-индустрию, конкурентов каждые 6ч
- **Аффилиат монетизация** — 8 партнёров, click tracking, payout reconciliation, operator earnings
- **Operator Outreach** — `scripts/outreach-operator.js` для Telegram-приглашений операторов
- **Fix конверсии** — `TourPaymentModal` показывает лид-форму для гостей (было: auth-стена → 0 лидов)
- **Модель "Лид-консьерж"** — AI квалифицирует → менеджер подбирает тур → PDF предложение

### Юр. лицо
ООО "ПОС-СЕРВИС", ИНН 4101147649, ОГРН 1114101005952

---

## Правила разработки

Полные правила: `CLAUDE.md` | Copilot: `.github/copilot-instructions.md` | Агенты: `AGENTS.md`

- TypeScript strict, `any` запрещён
- SQL только параметризованный (`$1, $2`)
- Pool: `import { pool } from '@/lib/db-pool'` (named export)
- Стили: только CSS-переменные, glassmorphism запрещён
- Маршруты: только через `v_kamchatka_routes_api`, не `SELECT * FROM kamchatka_routes`
- Миграции: не менять существующие, добавлять новые (текущая последняя: `085_`)

---

## Лицензия

© 2026 ООО "ПОС-СЕРВИС" — Все права защищены.
Использование, копирование или распространение без письменного разрешения запрещено.
Подробнее: [LICENSE](./LICENSE)
