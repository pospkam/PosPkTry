# TourHab — AI-система для туристического бизнеса Камчатки

Платформа, которая одновременно решает задачу туриста (маршрут + бронь) и автоматизирует работу оператора (туры, брони, прогноз погоды, финансы). Внутри — самоэволюционирующий агентский слой: система анализирует свои решения, учится на обратной связи и оптимизирует себя без ручного вмешательства.

**Текущий статус:** MVP завершён, строим Agent Framework поверх готовой инфраструктуры. Полный план: `.claude/plan.md`

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%2C%200%20errors-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

**Продакшен:** [tourhab.ru](https://tourhab.ru)

---

## Архитектура

### AI-слой (строится сейчас)

```
Admin / Operator / Tourist / Guide
          │ intent
   PlatformAgent (lib/agents/)
          │
   Context Hub  ──── user/task/platform/execution contexts
          │
   Agency Layer ──── AdminAgency / OperatorAgency / TouristAgency
          │
   Learning Layer ── Feedback loop → Pattern recognition → Prompt tuning
          │
   Execution Layer ─ (API routes, DB, Telegram, Payments — всё ниже)
```

### Data Flow (существующий)

```
Маршрут (agent_route_knowledge)     Тур (operator_tours)
  1189 маршрутов, 16 типов локаций    Операторы: слоты, цены, сезон
  Источник: скрапинг 12 сайтов        Бронирование → CloudPayments
  kuzmich_review AI-отзыв
         │                                    │
         +──── v_route_marketplace ───────────+
                   │
            Карточка маршрута
         (цена + оператор + дата + бронирование)
```

### Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS |
| Backend | Next.js API Routes, PostgreSQL (pg pool, прямой SQL) |
| Auth | JWT (jose) + bcrypt, 6 ролей |
| Storage | Timeweb S3 (`s3.twcstorage.ru`) + fallback на `/tmp` |
| AI | OpenRouter / xAI / Anthropic (waterfall) + 5 AI подсистем |
| Agent Layer | `lib/agents/` — PlatformAgent, Context Hub, Learning Loop (строится) |
| Maps | Yandex Maps API 2.1 (маркеры с попапами и ссылками) |
| Telegram | @KuzmichKam_bot (tourist) + admin bot (owner) |
| Analytics | page_views (собственная) + Яндекс Метрика |
| Deploy | Timeweb Cloud, GitHub Actions CI/CD |

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

# Генерация AI-отзывов Кузьмича для маршрутов
node scripts/generate-kuzmich-reviews.js --limit 100
node scripts/generate-kuzmich-reviews.js --dry-run --limit 5
```

---

## Структура проекта

```
app/
  page.tsx                       # Главная (Hero + CategoryCards + TripPlanner)
  routes/                        # Каталог маршрутов (1189 шт.)
    [id]/                        # Детальная: описание + Кузьмич-отзыв + офферы операторов
  operators/                     # Каталог операторов (5 шт.)
    [slug]/                      # Профиль оператора + его маршруты
  map/                           # Интерактивная карта (Leaflet, 900+ маркеров)
  hub/                           # Личные кабинеты (6 ролей)
    tourist/ operator/ guide/ admin/ agent/ transfer-operator/
  api/                           # 256+ API endpoints
    routes/ leads/ operators/ assistant/ public/ tours/ bookings/
    analytics/ telegram/

components/
  homepage/                      # Hero, CategoryCards, TripPlanner
  routes/                        # RouteCard, LeadModal, BookingModal
  shared/                        # LeafletMap, AssistantButton, SOSButton, PageViewTracker
  layout/                        # Header, Footer

lib/
  agents/                        # AI Agent Framework (строится — .claude/plan.md)
    platform-agent.ts            # Intent dispatcher, единая точка входа
    context-hub.ts               # Персистентный контекст (user/task/platform)
    agencies/                    # AdminAgency, OperatorAgency, TouristAgency
    learning/                    # Feedback loop, prompt tuning, A/B tests
  storage/s3.ts                  # S3 клиент (Timeweb Object Storage)
  ai/providers.ts                # AI waterfall (4 провайдера)
  ai/embeddings.ts               # Smart search (embedding-based)
  services/trip-recommender.ts   # Tourist recommendations
  ai/crew-agents.ts              # Multi-agent patterns
  auth/                          # JWT middleware
  db-pool.ts                     # PostgreSQL pool (named export: { pool })
  bookings/booking.service.ts    # Полная логика бронирований
  notifications/telegram-channel.ts  # Постинг в TG-канал

hooks/
  useSourceTracker.ts            # UTM/referrer first-touch attribution
  useInterestTracker.ts          # Профиль интересов (localStorage)

scripts/
  generate-kuzmich-reviews.js    # AI-генерация отзывов для маршрутов (Anthropic Haiku)
```

---

## Ключевые фичи

### AI Agent Layer (строится: .claude/plan.md)
- **PlatformAgent** — единая точка входа для любого интента (Admin/Operator/Tourist)
- **Context Hub** — персистентный контекст: кто пользователь, что делал, что может
- **AdminAgency** — `/digest`: ежедневный AI-анализ метрик + 3 приоритета на день
- **OperatorAgency** — управление турами/бронями через Natural Language в TG
- **TouristAgency** — smart TripBuilder v2 (AI-aware, DnD, marketplace)
- **Learning Loop** — система анализирует успех/fail → оптимизирует промпты автоматически

### AI подсистемы (готовы)
- AI waterfall: OpenRouter → xAI → Anthropic (4 провайдера)
- Smart search (embedding-based, `lib/ai/embeddings.ts`)
- Trip recommender (`lib/services/trip-recommender.ts`)
- RAG / Knowledge Base (`lib/services/rag.service.ts`)
- Tour auto-fill AI (`app/api/.../auto-fill-ai/`)

### Каталог маршрутов
- **1189 маршрутов**, 16 типов локаций, 15 типов активностей
- Фильтрация по `location_type` (volcano, geyser, hot_spring...) и `activity_type`
- **kuzmich_review** — AI-отзыв в голосе местного жителя (101+ маршрутов заполнены)
- Поиск, сортировка, пагинация

### Marketplace
- **v_route_marketplace** — VIEW: маршрут + тур + оператор + следующая дата
- На детальной странице: предложения операторов с ценами, датами, рейтингами
- Бейджи: сезонность, сложность, "Бронирование"

### Карта
- Yandex Maps API 2.1, цвета по типу локации
- 900+ маркеров, кликабельные попапы → детальная страница
- Фильтр по location_type и activity_type

### Бронирования
- `lib/bookings/booking.service.ts` — полная реализация:
  - Стейт-машина (`ALLOWED_TRANSITIONS`)
  - Защита от double-booking (`FOR UPDATE` lock)
  - Атомарные транзакции (BEGIN/COMMIT/ROLLBACK)
  - Правила возврата: оператор = 100%; турист >48ч = 100%, 24-48ч = 50%, <24ч = 0%
  - BookingLog на каждую смену статуса
- 330 выездов (tour_departures), BookingModal на сайте

### Операторы
- 5 операторов: Камчатинтур, TopKam, Камчатская Рыбалка, Вулкан Гид, Камчатка Дикая
- Профили с услугами, галереей, отзывами, FAQ, сезонным календарём

### Telegram-бот (@KuzmichKam_bot)
- Публичные команды: `/start` `/help` `/route` `/weather` `/tip` `/operators` `/sezon`
- Admin-команды: `/stats` `/leads` `/post operator|route|sezon` `/diag`
- AI диалог в голосе Кузьмича с историей чата
- Постинг в TG-канал с фото

### Analytics
- Собственная: `page_views` таблица, `POST /api/analytics/hit`
- Яндекс Метрика: `NEXT_PUBLIC_YANDEX_METRIKA_ID`
- UTM/referrer трекинг first-touch → в leads.source_data

### Lead Capture
- Форма заявки без регистрации (LeadModal)
- UTM/referrer трекинг (first-touch attribution)
- Уведомления в Telegram с source_data

---

## Переменные окружения

```bash
# === Обязательные ===
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=...

# === S3 Storage (Timeweb) ===
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET=kamhub-uploads
S3_REGION=ru-1

# === AI (хотя бы один) ===
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...        # sk-ant-api03-...

# === Telegram ===
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=kh-webhook-2026
TELEGRAM_CHAT_ID=...         # ID админа (для admin-команд бота)
TELEGRAM_CHANNEL_ID=...      # ID канала (для постинга, со знаком минус)
TELEGRAM_LEADS_CHAT_ID=...   # Чат для входящих лидов

# === Analytics ===
NEXT_PUBLIC_YANDEX_METRIKA_ID=...

# === Email (SMTP Yandex) ===
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...

# === Платежи (опционально) ===
CLOUDPAYMENTS_API_SECRET=...
NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID=...

# === Rate Limiting (опционально) ===
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## База данных

### Ключевые таблицы

```sql
-- Маршруты (knowledge base)
agent_route_knowledge    -- 1189 маршрутов, kuzmich_review TEXT, location_type, activity_type

-- Marketplace
v_route_marketplace      -- VIEW: маршрут + тур + оператор + цена + следующая дата

-- Операторы
partners                 -- 5 операторов, slug, профиль, контакты

-- Туры и бронирования
tours                    -- 66 туров (operator_id → partners)
tour_departures          -- 330 выездов (start_date, slots, price)
bookings                 -- бронирования (7 статусов: pending/confirmed/cancelled_by_tourist/...)
booking_logs             -- лог каждой смены статуса

-- Лиды
leads                    -- заявки без регистрации, source_data JSONB

-- Аналитика
page_views               -- path, referrer, created_at

-- Пользователи
users                    -- 6 ролей: tourist, operator, guide, transfer_operator, agent, admin
```

### Миграции

58 файлов в `lib/database/migrations/` (001–058). Следующая: **`059_`**.

```bash
# Применить миграцию напрямую (без psql):
node -e "require('dotenv').config({path:'.env.local',override:true}); \
  const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); \
  p.query(require('fs').readFileSync('lib/database/migrations/040_xxx.sql','utf8')).then(()=>p.end())"
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
git push origin main
  → GitHub Actions (tsc)
    → Timeweb Cloud (автодеплой, App ID: 159529)
      → tourhab.ru
```

**Домен:** tourhab.ru (DNS: ns1/ns2.reg.ru, A → 51.250.0.136)
**Build time:** ~5-7 минут после push

---

## Текущее состояние (март 2026)

```
Страниц:              94
API endpoints:       256+
Компонентов:         119
SQL-миграций:         58  (lib/database/migrations/ 001–058)
Маршрутов в БД:    1 189  (16 типов локаций, 15 типов активностей)
Кузьмич-отзывов:     101+
Операторов:            5
TS-ошибок:             0

Следующий этап: Agent Framework (lib/agents/) — 7 недель
Полный план:     .claude/plan.md
```

### Юр. лицо
ООО "Трей", ИНН 4100053571, ОГРН 1254100000175

---

## Правила разработки

Полные правила: `CLAUDE.md`

- TypeScript strict, `any` запрещён
- SQL только параметризованный (`$1, $2`)
- Pool: `import { pool } from '@/lib/db-pool'` (named export)
- Стили: только CSS-переменные, glassmorphism запрещён
- Миграции: без изменения существующих (001–058), следующая `059_`
- Бронирования: использовать `lib/bookings/booking.service.ts`, не `lib/services/booking.service.ts`
- Server components не делают self-fetch через URL — только `import { query } from '@/lib/database'`
