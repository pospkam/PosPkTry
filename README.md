# TourHab — AI-first туристическая платформа Камчатки

AI-помощник Кузьмич подбирает маршрут за минуту. Турист описывает мечту — система комбинирует базовые туры в персональный план. Каталог работает как страховка для тех, кто предпочитает выбирать руками.

Внутри — 13 AI-директоров (Board of Directors), которые управляют платформой: от безопасности и экологии до роста и финансов. Каждый директор работает по редактируемой .md-программе (Karpathy autoresearch pattern). Собственник имеет финальное слово через систему одобрений.

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
| AI Providers | DeepSeek (Tier 1) → Gemini → MiMo → GLM-Z1 → GLM-5.1 → OpenRouter → YandexGPT → MiniMax → Anthropic |
| Agent Layer | 13 AI-директоров + 7 рабочих агентов (`lib/agents/`) |
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
  shared/                        # SOSButton, AssistantButton, LeafletMap, StickyLeadButton, MicrosoftClarity
  layout/                        # Header, Footer

lib/
  agents/                        # AI Agent Framework
    agencies/                    # 20 agency-классов (13 директоров + 7 рабочих)
    programs/                    # 13 .md-программ директоров + TypeScript лоадер
    mesh/                        # AgentMesh: anonymous cross-review, SCORE:1-5
    tools/agent-toolkits.ts      # Инструменты для всех директоров
    evolution/                   # Knowledge base, context builder
    learning/                    # Feedback loop, A/B experiments
    execution/                   # Initiative executor
    scheduler.ts                 # Автономное расписание агентов
    platform-agent.ts            # Intent dispatcher
  ai/
    providers.ts                 # AI waterfall (8 провайдеров, prompt caching)
    provider-config.ts           # Ключи и конфигурация
    embeddings.ts                # Semantic search (MiniLM cosine)
    rag-context.ts               # Hybrid RAG: fulltext + semantic + RRF reranking
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
Tier 1 (race): DeepSeek → Gemini → MiMo → GLM-Z1 (OR) → GLM-5.1 (direct)
Tier 2 (race): OpenRouter → YandexGPT → MiniMax
Tier 3 (sequential): Anthropic
```

Tier 1 гонка — первый ответ побеждает. xAI исключён (гео-блок RU).
GLM-Z1 доступен через OpenRouter (`thudm/glm-z1-32b`), GLM-5.1 — прямой API ZhipuAI (`GLM_API_KEY`).
Anthropic: prompt caching (`cache_control: ephemeral`) — экономия ~90% токенов на повторных system prompts.
Файл: `lib/ai/providers.ts`

### AI Composition (planner)

```
Турист описывает мечту → /api/planner/compose
    → парсинг интента
    → поиск Reference Tours в БД (activity_type, zone, price)
    → AI генерирует день-за-днём план
    → бронирование из чата
```

### 13 AI-директоров (Board of Directors)

| Агент | Роль | Модель |
|-------|------|--------|
| Admin | Операционный директор | claude-sonnet-4-6 |
| Legal | Юрисконсульт | gpt-4o-mini |
| Security | Безопасность | mistral-large |
| Hacker | Директор по росту | deepseek-chat-v3 |
| Rescue | SAR / Спасатель | llama-4-maverick |
| Eco | Эколог | gemini-2.0-flash |
| Content | Контент-аудитор | qwen-2.5-72b |
| Quality | Качество сервиса | gpt-4o |
| Planning | Стратег/прогнозы | claude-haiku-4-5 |
| Evo | Архитектор/эволюция | mistral-medium-3 |
| Finance | CFO | deepseek-chat-v3 |
| Infra | DevOps / SRE | llama-4-scout |
| Vibe Coder | Разработчик | qwen-2.5-coder-32b |

Все модели через OpenRouter (единый `OR_API_KEY`).

Совещание: `/hub/admin/board-meeting` — **5 раундов:**
1. Отчёты агентов (параллельно) + institutional memory pre-read
2. External Observers (DeepSeek + Gemini + Scout-Innovator) + AgentMesh (анонимный cross-review с числовым скором SCORE:1-5)
3. Консенсус фасилитатора (claude-sonnet-4-6)
4. Инициативы → `agent_approvals` (персона обогащена .md-программами)
5. Adversarial debate (PRO vs CON по каждой инициативе)

**Agent Programs:** 13 редактируемых .md-файлов в `lib/agents/programs/` — роль, зона компетенции, правила, cross-review интересы. Загрузчик: `lib/agents/programs/index.ts`.

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
NEXT_PUBLIC_CLARITY_ID=...       # Microsoft Clarity (heatmaps, session recordings)

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
Последняя: **`136_chat_sessions_utm.sql`**

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
Миграций:             123
Маршрутов в БД:     1 189
AI-провайдеров:         8  (waterfall, включая GLM-5.1 + GLM-Z1)
AI-директоров:         13  (Board of Directors)
TS-ошибок:              0
```

**Последние изменения:**
- **Правовые документы** — полная переработка (ООО «ПОС-СЕРВИС», комиссия 15%+3%=18%, нормативная база ФЗ)
- **GLM 5.1** — direct API ZhipuAI (`GLM_API_KEY`) + GLM-Z1 через OpenRouter добавлены в Tier 1 waterfall
- **PDF-импорт туров** — оператор загружает PDF, Gemini Flash извлекает поля тура (`/api/hub/operator/tours/import-pdf`)
- **Agent .md Programs** — 13 экстернализированных программ директоров (`lib/agents/programs/*.md`), редактируемые без пересборки
- **Anonymous Cross-Review** — AgentMesh: анонимные метки ("Подразделение A/B/C"), числовой скор SCORE:1-5
- **Hybrid RAG + RRF** — fulltext (tsvector) + semantic (MiniLM cosine) объединяются Reciprocal Rank Fusion
- **Anthropic Prompt Caching** — `cache_control: ephemeral` на system prompts, экономия ~90% повторных токенов
- **Microsoft Clarity** — heatmaps + session recordings (`NEXT_PUBLIC_CLARITY_ID`)
- **DNS Prefetch** — preconnect для mc.yandex.ru, clarity.ms, emrldco.com (50-150ms быстрее)
- **LocalBusiness Schema** — schema.org LocalBusiness с geo, телефоном, часами работы
- **Institutional Memory** — агенты читают свои прошлые observations перед совещанием, пишут новые после
- **GPT-4.1** — Quality агент обновлён с gpt-4o на gpt-4.1
- **Board of Directors** — 13 директоров (добавлены Finance, Infra, Vibe Coder), 5 раундов совещания с adversarial debate
- **Lead Follow-up** — автоматические Telegram follow-up Day+1/2/5 после заявки
- **Route Enrichment** — каждый тур обогащён блоками Insurance / Flights / Hotels / Transfers
- **Intelligence Monitor** — агент `evo` мониторит AI-тренды, travel-индустрию, конкурентов каждые 6ч
- **Аффилиат монетизация** — 8 партнёров, click tracking, payout reconciliation, operator earnings

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
- Миграции: не менять существующие, добавлять новые (текущая последняя: `123_`)

---

## Лицензия

© 2026 ООО "ПОС-СЕРВИС" — Все права защищены.
Использование, копирование или распространение без письменного разрешения запрещено.
Подробнее: [LICENSE](./LICENSE)
