# KamchatourHub

Туристическая платформа Камчатки — единая экосистема для туристов, операторов, гидов, агентов и администраторов.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%2C%200%20errors-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Production](https://img.shields.io/badge/prod-Timeweb%20Cloud-orange)](https://pospkam-pospktry-c1f3.twc1.net)

**Продакшен:** https://pospkam-pospktry-c1f3.twc1.net

---

## Ключевые понятия: Маршрут vs Тур

| | **Маршрут (Route)** | **Тур (Tour)** |
|---|---|---|
| Таблица | `agent_route_knowledge`, `kamchatka_routes` | `tours` |
| Источник | Скрапинг 3 сайтов (автоматически) | Оператор через CRM |
| Назначение | База знаний для AI + каталог | Продаваемый продукт с ценой |
| Цена | Нет | Есть (обязательное поле) |
| Оператор | Нет | Есть (FK -> `partners`) |
| Бронирование | Нет | Да (через `tour_departures` -> `bookings`) |
| Количество | **260** (14 категорий, 3 источника) | **11** (fishingkam.ru) |
| API | `GET /api/kamchatka-routes` | `GET /api/tours`, `POST /api/tours` |

**Правило:** `kamchatka_routes` читать только через `v_kamchatka_routes_api`. Прямой SELECT запрещен.

---

## О проекте

### Хабы пользователей

| Хаб | Маршрут | Возможности |
|-----|---------|-------------|
| **Турист** | /hub/tourist | Каталог, бронирование, отзывы, eco-points, история |
| **Туроператор** | /hub/operator | CRM: туры, выезды, календарь, аналитика, финансы |
| **Гид** | /hub/guide | Расписание, карта, заработок, репутация |
| **Трансфер-оператор** | /hub/transfer-operator | Автопарк, водители, маршруты |
| **Агент** | /hub/agent | Клиенты, ваучеры, комиссионные |
| **Администратор** | /hub/admin | Модерация, пользователи, финансы платформы |
| **Провайдер проживания** | /hub/stay-provider | Управление размещениями |
| **Провайдер снаряжения** | /hub/gear-provider | Управление снаряжением |

Дополнительные разделы: /hub/cars, /hub/gear, /hub/souvenirs, /hub/stay, /hub/tours, /hub/transfer, /hub/safety

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5 strict, Tailwind CSS |
| Стили | CSS-переменные (ds-классы), Playfair Display + Outfit |
| Backend | Next.js API Routes (256 endpoints), PostgreSQL — прямой SQL |
| Auth | JWT (jose) + bcrypt, 8 ролей |
| AI | Timeweb Agent -> OpenRouter -> DeepSeek -> Minimax -> xAI -> Anthropic (6 провайдеров) |
| MCP | `/api/mcp` — JSON-RPC 2.0, 4 инструмента, 260 маршрутов |
| Платежи | CloudPayments |
| Карты | Яндекс.Карты |
| Погода | Yandex Weather + OpenWeatherMap + WeatherAPI (proxy, кэш 6ч) |
| Telegram | @KuzmichKam_bot — уведомления о бронированиях |
| Деплой | Timeweb Cloud (4cpu/8GB), GitHub -> автодеплой |
| Knowledge base | `agent_route_knowledge` — 260 маршрутов, 14 категорий |

---

## Быстрый старт

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.local.example .env.local
# Заполни DATABASE_URL, JWT_SECRET и AI-ключи
npm run dev
```

Открой http://localhost:3000

### Команды

```bash
# Разработка
npm run dev               # Dev-сервер (порт 3000)
npm run build             # Production-сборка
npm run lint              # ESLint (0 errors)
npx tsc --noEmit          # TypeScript (0 errors)

# База данных
npm run db:migrate                        # SQL-миграции (идемпотентно)
npm run db:import:kamchatka-routes        # Импорт маршрутов
npm run db:sync:agent-routes              # Синхронизация agent_route_knowledge

# Скрапинг маршрутов (3 источника, без AI)
npm run ai:scrape-unique:direct           # mestechkokam + zimaletokamchatka + kamchatintour
npm run ai:scrape-unique:direct:dry       # Dry-run
npm run ai:scrape-unique:stats            # Статистика

# Knowledge base для AI-агентов
npm run ai:setup-agent-rag                # Пересобрать crew/knowledge-base.json
# python3 crew/agent-trainer.py           # Пересобрать crew/agents.json
```

### Docker

```bash
docker run -d --name kamhub-postgres \
  -e POSTGRES_DB=kamhub -e POSTGRES_USER=kamuser \
  -e POSTGRES_PASSWORD=kampass2024_local -p 5432:5432 \
  postgis/postgis:15-3.3-alpine
npm run db:migrate
```

---

## Архитектура проекта

```
PosPkTry/
├── app/
│   ├── page.tsx                    # Главная (Hero + BentoGrid + LiveFeed)
│   ├── globals.css                 # CSS-переменные, ds-классы
│   ├── home-variables.css          # Homepage токены (--kh-*)
│   ├── tours/                      # Каталог маршрутов
│   │   ├── [id]/                   # Детальная страница тура
│   │   └── fishing/                # Рыбалка
│   ├── hub/                        # Личные кабинеты (8 ролей + 7 сервисов)
│   │   ├── tourist/                operator/   guide/
│   │   ├── transfer-operator/      agent/      admin/
│   │   ├── stay-provider/          gear-provider/
│   │   ├── cars/  gear/  souvenirs/  stay/  tours/  transfer/  safety/
│   │   └── layout.tsx              # Общий HubLayout
│   ├── ai-assistant/               # AI-чат (публичный)
│   ├── safety/                     # SOS
│   └── api/                        # 256 API Routes
│       ├── auth/                   # login, register, me
│       ├── tours/[id]/departures/  # CRUD выездов
│       ├── bookings/               # Бронирования
│       ├── operator/               # CRM (25+ endpoints)
│       ├── ai/                     # Chat (waterfall 6 провайдеров)
│       ├── mcp/                    # MCP Server (JSON-RPC 2.0)
│       ├── telegram/               # Bot webhook + setup
│       ├── weather/                # Multi-provider proxy
│       ├── payments/               # CloudPayments webhook
│       └── safety/sos/             # SOS (rate-limit 10 мин)
│
├── components/
│   ├── homepage/                   # Hero, BentoGrid, ActivityCircles, LiveFeed, Reveal
│   ├── tours/                      # TourCard
│   ├── booking/                    # TourBookingForm, TourDeparturesCalendar
│   ├── ai/                         # AIChatWidget, FloatingAIButton
│   ├── shared/                     # PageShell, PublicNav, YandexMap, AccommodationCard
│   ├── admin/                      # AdminNav, shared/ (DataTable, Pagination, MetricCard)
│   ├── operator/                   # OperatorNav, Dashboard/, TourForm
│   ├── agent/                      # AgentNav, Dashboard/, Clients/
│   ├── transfer-operator/          # TransferOperatorNav, Dashboard/
│   ├── tourist/                    # TouristNav, RecommendationCard
│   ├── cars/ gear/ souvenirs/      # Карточки, фильтры, формы
│   └── payments/                   # CloudPaymentsWidget
│
├── lib/
│   ├── database.ts                 # query<T>() — типизированный PostgreSQL-клиент
│   ├── db-pool.ts                  # Pool singleton ({ pool } — named export)
│   ├── types/db-rows.ts            # 50+ интерфейсов DB rows
│   ├── auth/                       # JWT middleware, helpers
│   ├── ai/providers.ts             # callAIWaterfall (6 провайдеров)
│   ├── notifications/telegram.ts   # telegramService (@KuzmichKam_bot)
│   ├── services/                   # tour, booking, payment, rag, messaging, analytics
│   ├── rate-limit.ts               # createRateLimiter
│   └── error-handler.ts            # apiError, apiSuccess
│
├── lib/database/migrations/        # 31 SQL-миграций (001-027)
├── migrations/                     # 10 infra-миграций
├── crew/                           # AI agent configs, knowledge-base.json
├── middleware.ts                   # Edge: JWT + Upstash rate-limit
└── docs/PLATFORM_MAP.md           # Полная карта платформы
```

---

## База данных

### Основные таблицы

```sql
-- Пользователи и роли
users                     -- id UUID, email, role, bcrypt_hash, created_at
partners                  -- Профили операторов/агентов, is_verified

-- Маршруты (справочник, читать через view)
kamchatka_routes          -- 260 спарсенных маршрутов
v_kamchatka_routes_api    -- VIEW: использовать вместо прямого SELECT
agent_route_knowledge     -- RAG-индекс: 260 маршрутов + embeddings

-- Туры и бронирования (3 уровня)
tours                     -- Туры операторов: title, price, operator_id, route_id
tour_departures           -- Конкретные выезды: start_date, available_slots, booked_slots, price_override
bookings                  -- Бронирования: user_id, tour_id, departure_id (FK, nullable), status

-- Отзывы
reviews                   -- rating, text, photos JSONB

-- Трансферы
transfers                 -- Маршруты трансферов
transfer_schedules        -- Расписание
vehicles                  -- Автопарк
drivers                   -- Водители

-- AI и коммуникации
chat_sessions             -- AI-чат: session_id, messages JSONB
notifications             -- Уведомления
sos_events                -- SOS-сигналы: lat, lng, status

-- Дополнительно
eco_points                -- Eco-баллы
souvenirs                 -- Сувениры
gear_rentals              -- Аренда снаряжения
accommodations            -- Размещение
```

### Категории маршрутов (260 маршрутов, 3 источника)

| Категория | Кол-во | Описание |
|-----------|--------|----------|
| `eco` | 62 | Экотуризм |
| `vulkani` | 49 | Вулканы |
| `termalnye_istochniki` | 26 | Термальные источники |
| `morskie_progulki` | 16 | Морские прогулки |
| `lakes` | 16 | Озера |
| `mountains` | 15 | Горы |
| `geyzery` | 14 | Гейзеры |
| `rybalka` | 14 | Рыбалка |
| `trekking` | 10 | Треккинг |
| `dzhip` | 10 | Джип-туры |
| `rivers` | 8 | Реки |
| `snegohod` | 8 | Снегоход |
| `vertoletnye_tury` | 6 | Вертолетные туры |
| `medvedi` | 5 | Медведи |

**Источники:** mestechkokam.ru (JSDOM), zimaletokamchatka.ru (GraphQL/Strapi), kamchatintour.ru (Bitrix SSR)

### Миграции

```bash
npm run db:migrate
# 41 файл: lib/database/migrations/ (001-027) + migrations/ (10 infra)
# Идемпотентны — безопасно применять повторно
# Следующая: 028_...sql
```

---

## Дизайн-система

### CSS-переменные (glassmorphism полностью заменен)

**Light** (default, `data-theme="light"`):
```css
--bg-primary: #F5F0EB;     --bg-card: #FFFFFF;      --bg-hover: #F0ECE7;
--text-primary: #1A1714;    --text-secondary: #6B6560; --text-muted: #9A9590;
--accent: #D44A0C;          --ocean: #2568B0;
--success: #3FB950;         --warning: #D29922;       --danger: #DC2626;
--border: rgba(0,0,0,0.07);
```

**Dark** (`data-theme="dark"`):
```css
--bg-primary: #0D1117;     --bg-card: #21262D;      --bg-hover: #30363D;
--text-primary: #F0F6FC;    --text-secondary: #8B949E; --text-muted: #484F58;
--accent: #E8734A;          --ocean: #00A8CC;
--danger: #F85149;
--border: rgba(255,255,255,0.08);
```

### Утилитарные ds-классы
`ds-page`, `ds-card`, `ds-input`, `ds-btn`, `ds-btn-primary`, `ds-btn-secondary`, `ds-btn-danger`, `ds-section`, `ds-badge`, `ds-h1`, `ds-h2`, `ds-label`, `ds-skeleton`

### Типографика
- Заголовки: **Playfair Display** (latin + cyrillic)
- Основной текст: **Outfit** (latin, 300-700)

### UI-паттерны

```tsx
// Карточка
<div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">

// Кнопка CTA
<button className="bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg px-4 py-2">

// Текст
<p className="text-[var(--text-primary)]">
<span className="text-[var(--text-muted)]">
```

### Навигация

| Контекст | Компонент |
|----------|-----------|
| Публичные страницы | Header `KH + тема + ЛК` + `<BottomNav />` (mobile pill) |
| Hub (дашборды) | `<HubLayout>` sidebar (desktop) + mobile nav |
| Server-компоненты | `<PageShell>` — client-обертка |

---

## AI-система

### Waterfall (6 провайдеров)

| # | Провайдер | Модель | Env |
|---|-----------|--------|-----|
| 1 | Timeweb Cloud Agent | deepseek-chat | `TIMEWEB_TOKEN` + `TIMEWEB_AI_AGENT_ID` |
| 2 | OpenRouter | claude-3.5-sonnet | `OPENROUTER_API_KEY` |
| 3 | DeepSeek | deepseek-chat | `DEEPSEEK_API_KEY` |
| 4 | Minimax | MiniMax-Text-01 | `MINIMAX_API_KEY` |
| 5 | xAI | grok-4 | `XAI_API_KEY` |
| 6 | Anthropic | claude-opus-4-6 | `ANTHROPIC_API_KEY` |

Все: temperature 0.4, max_tokens 800. Если все 6 недоступны — fallback текст.

### MCP Server (`/api/mcp`)

JSON-RPC 2.0, публичный endpoint:
- `search_routes` — поиск маршрутов по категории/ключам
- `get_route_details` — детали маршрута по UUID
- `list_categories` — 14 категорий с количеством
- `get_tours` — коммерческие туры с выездами

### Telegram Bot (@KuzmichKam_bot)

- Webhook: `POST /api/telegram/webhook`
- Уведомления операторов о бронированиях
- Inline-кнопки для подтверждения/отмены
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_FISHING_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`

---

## API — ключевые endpoints

| Группа | Метод | Endpoint | Описание |
|--------|-------|----------|----------|
| Auth | POST | `/api/auth/signin` | Авторизация (5/мин) |
| Auth | POST | `/api/auth/register` | Регистрация |
| Profile | GET/PUT | `/api/profile` | Профиль (JWT) |
| Маршруты | GET | `/api/kamchatka-routes` | 260 маршрутов |
| Туры | GET | `/api/tours` | Каталог туров |
| Туры | GET | `/api/tours/[id]` | Детали тура |
| Выезды | GET | `/api/tours/[id]/departures` | Расписание выездов |
| Выезды | POST | `/api/tours/[id]/departures` | Создать выезд (operator) |
| Bookings | POST | `/api/bookings` | Бронирование |
| AI | POST | `/api/ai/chat` | AI-чат (20/мин) |
| MCP | GET/POST | `/api/mcp` | MCP Server (JSON-RPC) |
| Telegram | POST | `/api/telegram/webhook` | Bot webhook |
| Weather | GET | `/api/weather` | Погода (proxy, кэш 6ч) |
| Safety | POST | `/api/safety/sos` | SOS (1/10мин) |

---

## TypeScript: статус качества кода

| Проверка | Статус |
|----------|--------|
| `tsc --noEmit` | 0 ошибок |
| `npm run lint` | 0 ошибок |
| `next build` | Компилируется |
| API routes | 256 endpoints, полностью типизированы |
| `lib/types/db-rows.ts` | 50+ интерфейсов |

**История:** 847 TS-ошибок устранены за 8 итераций (март 2026).

---

## Правила разработки

- TypeScript strict — `any` запрещен, использовать `unknown` + type guard
- SQL — только параметризованный: `$1, $2` (без конкатенации)
- `kamchatka_routes` — только через `v_kamchatka_routes_api`
- Роль пользователя — только из JWT (не из тела запроса)
- Секреты — только через `.env.local`
- Стили — только CSS-переменные (никакого glassmorphism/hardcoded hex)
- Новая таблица/колонка — новая миграция `028_...sql`
- Pool import: `import { pool } from '@/lib/db-pool'` (named, не default)
- Никаких эмодзи в UI/коде — только Lucide React иконки

---

## Переменные окружения

```bash
# Обязательные
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=...
NEXT_PUBLIC_APP_URL=https://pospkam-pospktry-c1f3.twc1.net

# AI (waterfall — хотя бы один)
TIMEWEB_TOKEN=...
TIMEWEB_AI_AGENT_ID=...
OPENROUTER_API_KEY=...
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_FISHING_CHAT_ID=...
TELEGRAM_WEBHOOK_SECRET=...

# Карты и погода
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...
YANDEX_WEATHER_API_KEY=...

# Платежи
CLOUDPAYMENTS_PUBLIC_ID=...
CLOUDPAYMENTS_API_SECRET=...

# S3 (опционально)
S3_ENDPOINT=...
S3_BUCKET=...
S3_REGION=...
```

---

## Деплой

```
git push origin main
  -> GitHub Actions
    -> Timeweb Cloud (автодеплой)
      -> https://pospkam-pospktry-c1f3.twc1.net
```

Timeweb MCP Server: токен `TIMEWEB_TOKEN` только в `.vscode/mcp.json`.

---

## Текущее состояние (март 2026)

```
Страниц:              94
API endpoints:        256  (все типизированы)
Компонентов:          119
SQL-миграций:         41   (31 app + 10 infra)
Маршрутов в БД:       260  (14 категорий, 3 источника)
Туров в БД:           11   (fishingkam.ru)
AI-провайдеров:       6    (waterfall)
MCP инструментов:     4    (search, details, categories, tours)
TS-ошибок:            0    (было 847)
ESLint-ошибок:        0
Build:                passing
```

---

## Changelog

### Март 2026 — спринт 3 (текущий)

- **CSS-переменные**: полная миграция всех компонентов с glassmorphism на CSS vars (63+ файлов)
- **Дизайн-система**: ds-классы, light/dark темы через `data-theme`
- **Типографика**: Playfair Display (заголовки) + Outfit (текст)
- **7 фич**: аудит-логи, программа лояльности, промокоды, FAQ, сертификаты гидов, логи бронирований, настройки уведомлений
- **Tourist dashboard**: редизайн в бизнес-стиле CSS vars
- **Документация**: обновлены CLAUDE.md, AGENTS.md, copilot-instructions.md, README.md

### Март 2026 — спринт 2

- **Каталог маршрутов**: фикс 404 — fallback к `agent_route_knowledge`
- **Изображения**: 14 категорий -> локальные фото из `/public/images/`
- **Tour departures**: 3-уровневая архитектура (tours -> departures -> bookings)
- **Telegram bot**: @KuzmichKam_bot с inline-кнопками
- **MCP Server**: `/api/mcp` — 4 инструмента, 260 маршрутов

### Март 2026 — спринт 1

- **TypeScript: 847 -> 0 ошибок** (8 итераций, 90+ файлов)
- **Скрапер маршрутов `--direct`**: 149 -> 260 маршрутов
- **Rate limiting**: AI (20/мин), auth (5/мин), SOS (10 мин)
- **AI waterfall**: 6 провайдеров (Timeweb -> OpenRouter -> DeepSeek -> Minimax -> xAI -> Anthropic)
- **CSP**: убран `unsafe-eval`

### Февраль--март 2026

- JWT авторизация + 8 ролей + все dashboards
- AI-чат: sessionId, история в JSONB
- Главная страница v3: Hero + ActivityCircles + BentoGrid + LiveFeed
- 16 SVG-иконок категорий
- CloudPayments: accountId/email из JWT

---

## Roadmap

### В работе
- [ ] Полировка UI/UX всех хабов
- [ ] Подключение реальных данных операторов
- [ ] Фикс критичных API-багов (availability counting, departure ownership)

### Phase 2
- [ ] CloudPayments sandbox -> тестовая оплата
- [ ] E2E-тесты (Playwright)
- [ ] Push-уведомления (Firebase FCM)
- [ ] Redis-кэш
- [ ] Real-time tracking (WebSockets)
- [ ] Международная версия (EN, ZH)
