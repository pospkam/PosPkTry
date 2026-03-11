# KamchatourHub

Туристическая платформа Камчатки — единая экосистема для туристов, операторов, гидов, агентов и администраторов.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%2C%200%20errors-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Production](https://img.shields.io/badge/prod-Timeweb%20Cloud-orange)](https://pospkam-pospktry-c1f3.twc1.net)

**Продакшен:** https://pospkam-pospktry-c1f3.twc1.net

---

## Ключевые понятия: Маршрут vs Тур

> ⚠️ Это разные сущности — не путать.

| | **Маршрут (Route)** | **Тур (Tour)** |
|---|---|---|
| Таблица | `agent_route_knowledge`, `kamchatka_routes` | `tours` |
| Источник | Скрапинг 3 сайтов (автоматически) | Создаёт оператор вручную |
| Назначение | База знаний для AI-агентов, каталог маршрутов | Продаваемый продукт с ценой и бронью |
| Цена | Нет (scraped metadata) | Есть (обязательное поле) |
| Оператор | Нет | Есть (FK → `partners`) |
| Бронирование | Нет | Да (`bookings` table) |
| Количество | **259** (14 категорий, 3 источника) | **11** (fishingkam.ru) + операторы добавляют |
| API | `GET /api/kamchatka-routes` | `GET /api/tours`, `POST /api/tours` |

**Правило:** `kamchatka_routes` и `agent_route_knowledge` — читать только через `v_kamchatka_routes_api`. Прямой SELECT из `kamchatka_routes` запрещён.

---

## О проекте

| Роль | Возможности |
|------|-------------|
| **Турист** | Каталог маршрутов и туров, бронирование, отзывы, eco-points, история поездок |
| **Туроператор** | CRM: управление турами, календарь, аналитика выручки, бронирования |
| **Гид** | Расписание, карта активностей, история заработка, репутация |
| **Трансфер-оператор** | Автопарк, водители, маршруты трансферов, расписание |
| **Агент** | Клиенты, ваучеры, комиссионные, воронка |
| **Администратор** | Модерация пользователей, финансы платформы, SOS-сводка |

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 15 (App Router), React 18, TypeScript 5 strict, Tailwind CSS |
| Backend | Next.js API Routes, PostgreSQL — прямой SQL через `lib/database.ts` |
| Auth | JWT (jose) + bcrypt, 6 ролей |
| AI | DeepSeek → Minimax → xAI Grok → OpenRouter (fallback chain) |
| Платежи | CloudPayments |
| Карты | Яндекс.Карты |
| Погода | OpenWeatherMap + WeatherAPI + Яндекс (proxy, кэш) |
| Деплой | Timeweb Cloud, GitHub Actions CI/CD |
| Knowledge base | `agent_route_knowledge` — 259 маршрутов, MiniLM-L12 384-dim embeddings |

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
npm run db:migrate                        # Применить все SQL-миграции (идемпотентно)
npm run db:import:kamchatka-routes        # Импорт маршрутов из партнёров
npm run db:sync:agent-routes              # Синхронизация agent_route_knowledge

# Скрапинг маршрутов (3 источника, без AI)
npm run ai:scrape-unique:direct           # mestechkokam + zimaletokamchatka + kamchatintour
npm run ai:scrape-unique:direct:dry       # Dry-run (в БД не пишет)
npm run ai:scrape-unique:stats            # Статистика по категориям

# Knowledge base для AI-агентов
npm run ai:setup-agent-rag                # Пересобрать crew/knowledge-base.json
# python3 crew/agent-trainer.py           # Пересобрать crew/agents.json (5 агентов)
```

### Docker

```bash
docker-compose up    # Next.js + PostgreSQL
npm run db:migrate   # SQL-миграции
```

---

## Архитектура проекта

```
PosPkTry/
├── app/
│   ├── page.tsx                    # Главная (Hero + BentoGrid + LiveFeed)
│   ├── tours/                      # Каталог маршрутов (agent_route_knowledge)
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx           # Детальная страница маршрута/тура
│   │   └── fishing/                # Подраздел: рыбалка
│   ├── hub/                        # Личные кабинеты по ролям
│   │   ├── tourist/
│   │   ├── operator/
│   │   ├── guide/
│   │   ├── transfer-operator/
│   │   ├── agent/
│   │   └── admin/
│   ├── ai-assistant/               # AI-чат (публичный)
│   ├── safety/                     # SOS, МЧС-контакты
│   └── api/                        # API Routes (все полностью типизированы)
│       ├── auth/                   # login, register, me, save-token
│       ├── tours/                  # Каталог туров + CRUD (operator)
│       ├── bookings/               # Создание и просмотр броней
│       ├── payments/               # CloudPayments webhook
│       ├── operator/               # CRM оператора (25+ endpoints)
│       ├── guide/                  # Dashboard гида
│       ├── tourist/                # Достижения, история
│       ├── transfer/               # Трансферы (оператор)
│       ├── transfers/              # Трансферы (клиент/поиск)
│       ├── agent/                  # Агентские операции
│       ├── admin/                  # Платформа
│       ├── ai/                     # DeepSeek→Minimax→xAI→OpenRouter
│       │   ├── chat/               # AI-чат с историей (JSONB)
│       │   ├── knowledge-base/     # S3-хранилище knowledge base
│       │   └── booking-intake/     # AI-обработка запроса на тур
│       ├── kamchatka-routes/       # Маршруты из v_kamchatka_routes_api
│       ├── weather/                # Погода (proxy + кэш)
│       ├── safety/sos/             # SOS → sos_events (rate-limit 10 мин)
│       └── webhooks/payments/      # CloudPayments callback
│
├── components/
│   ├── homepage/                   # Hero, BentoGrid, ActivityCircles, LiveFeed, CTA
│   ├── tours/                      # TourCard, TourFilters
│   ├── booking/                    # TourBookingForm, StayBookingForm
│   ├── ai/                         # AIChatWidget
│   ├── safety/                     # SOSButton, EmergencyModal
│   ├── eco/                        # EcoPointsDashboard
│   ├── weather/                    # WeatherWidget
│   ├── icons/                      # 16 SVG-иконок категорий (single-stroke)
│   └── shared/                     # Header, BottomNav, Logo, LoadingSpinner
│
├── lib/
│   ├── database.ts                 # query<T>() — типизированный PostgreSQL-клиент
│   ├── db-pool.ts                  # Pool singleton (named export { pool })
│   ├── types/db-rows.ts            # 50+ TypeScript-интерфейсов для DB rows
│   ├── auth/                       # JWT: middleware, helpers по ролям
│   ├── services/                   # Бизнес-логика (tour, booking, payment...)
│   ├── rate-limit.ts               # createRateLimiter({ windowMs, max })
│   └── error-handler.ts            # apiError(), apiSuccess()
│
├── lib/database/migrations/        # 025 SQL-миграций (001–025)
├── crew/
│   ├── knowledge-base.json         # RAG-индекс: 259 маршрутов
│   ├── agents.json                 # Конфиги 5 AI-агентов
│   └── agent-trainer.py            # Регенерация agents.json
├── scripts/
│   ├── apply-new-schemas.sql       # Точка входа npm run db:migrate
│   ├── unique-routes-scraper.js    # Скрапер 3 сайтов
│   ├── sync-agent-route-knowledge.js
│   └── setup-agent-rag.ts
├── types/
│   └── agent.ts                    # Типы для агентского модуля (+130 строк)
├── k8s/                            # Kubernetes конфиги
└── monitoring/                     # Grafana + Prometheus
```

---

## База данных

### Основные таблицы

```sql
-- Пользователи и роли
users                     -- id, email, role, bcrypt_hash, created_at
partners                  -- Профили операторов/агентов, is_verified

-- Маршруты (справочник, только читать через view)
kamchatka_routes          -- Сырые спарсенные маршруты
v_kamchatka_routes_api    -- VIEW: использовать вместо прямого SELECT из kamchatka_routes
agent_route_knowledge     -- RAG-индекс: 259 маршрутов + embeddings (MiniLM-L12)

-- Туры (продаваемые продукты)
tours                     -- Туры операторов: title, price, duration, operator_id, route_id
bookings                  -- Бронирования туров: user_id, tour_id, status, payment_status
reviews                   -- Отзывы: user_id, tour_id, rating, body

-- Трансферы
transfers                 -- Маршруты трансферов
transfer_schedules        -- Расписание
vehicles                  -- Автопарк
drivers                   -- Водители

-- AI и коммуникации
chat_sessions             -- Сессии AI-чата: session_id, messages JSONB
notifications             -- Push/email-уведомления
sos_events                -- SOS-сигналы: координаты, IP, статус

-- Дополнительно
eco_points                -- Eco-баллы пользователей
souvenirs                 -- Магазин сувениров
gear_rentals              -- Аренда снаряжения
accommodations            -- Размещение
```

### Категории маршрутов (259 маршрутов, 3 источника)

| Категория | Маршрутов | Описание |
|-----------|-----------|----------|
| `eco` | 62 | Экотуризм |
| `vulkani` | 49 | Вулканы |
| `termalnye_istochniki` | 26 | Термальные источники |
| `morskie_progulki` | 16 | Морские прогулки |
| `lakes` | 16 | Озёра |
| `mountains` | 15 | Горы |
| `geyzery` | 14 | Гейзеры |
| `rybalka` | 14 | Рыбалка |
| `trekking` | 10 | Треккинг |
| `dzhip` | 10 | Джип-туры |
| `rivers` | 8 | Реки |
| `snegohod` | 8 | Снегоход |
| `vertoletnye_tury` | 6 | Вертолётные туры |
| `medvedi` | 5 | Медведи |

**Источники скрапинга:**
- `mestechkokam.ru` — HTML (JSDOM)
- `zimaletokamchatka.ru` — GraphQL (Strapi CMS)
- `kamchatintour.ru` — HTML (Bitrix SSR)

### Миграции

```bash
npm run db:migrate
# 025 файлов: lib/database/migrations/001_...sql → 025_...sql
# Идемпотентны — безопасно применять повторно
# Следующая: 026_...sql
```

---

## API — ключевые endpoints

| Группа | Метод | Endpoint | Описание |
|--------|-------|----------|----------|
| Auth | POST | `/api/auth/signin` | Авторизация (rate-limit: 5/мин) |
| Auth | POST | `/api/auth/register` | Регистрация |
| Auth | GET | `/api/auth/me` | Текущий пользователь |
| Profile | GET/PUT | `/api/profile` | Профиль (JWT) |
| **Маршруты** | GET | `/api/kamchatka-routes` | 259 маршрутов из `v_kamchatka_routes_api` |
| **Туры** | GET | `/api/tours` | Каталог (agent_route_knowledge + tours) |
| **Туры** | GET | `/api/tours/[id]` | Детали тура/маршрута |
| **Туры** | POST | `/api/tours` | Создать тур (operator only) |
| Bookings | POST | `/api/bookings` | Создать бронирование |
| Bookings | GET | `/api/bookings/my` | Мои брони |
| AI | POST | `/api/ai/chat` | AI-помощник (rate-limit: 20/мин) |
| AI | GET | `/api/ai/chat?sessionId=` | История сессии |
| Weather | GET | `/api/weather` | Погода (proxy) |
| Safety | POST | `/api/safety/sos` | SOS → sos_events (rate-limit: 1/10мин) |

---

## TypeScript: статус качества кода

| Проверка | Статус |
|----------|--------|
| `tsc --noEmit` | ✅ 0 ошибок |
| `npm run lint` | ✅ 0 ошибок (5 warnings react-hooks) |
| `next build` | ✅ Компилируется |
| `ignoreBuildErrors` | `false` — билд упадёт при TS-ошибках |
| `ignoreDuringBuilds` | `false` — ESLint блокирует билд |
| API routes типизированы | ✅ Все 90+ endpoints полностью |
| `lib/types/db-rows.ts` | ✅ 50+ интерфейсов для всех DB-запросов |

**История:** ~847 TS-ошибок устранены за 8 итераций (март 2026).

Итерации: auth+admin (128) → bookings+payments (9) → tours (24) → operator (231) → guide+tourist (45) → light groups (23) → transfers+agent+weather+остальные (372) → **итого 847 → 0**.

---

## Дизайн-система

**Темы:** светлая (default mobile) + тёмная, переключатель в хедере.

**Цветовые токены (tailwind.config.ts):**

| Токен | Hex | Назначение |
|-------|-----|-----------|
| `cyber-cyan` | `#00D4FF` | Focus rings, активные состояния, neon glow |
| `premium-gold` | `#d4af37` | Цены, CTA-кнопки, primary actions |
| `premium-black` | `#0a0a0a` | Текст на gold/cyan кнопках |

**UI-паттерны:**

```css
/* Карточки */
bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl

/* Инпуты */
bg-white/10 border border-white/20 text-white
placeholder:text-white/40 focus:ring-cyber-cyan/60

/* Primary кнопка */
bg-premium-gold text-premium-black hover:bg-premium-gold/80

/* CTA-градиент */
bg-gradient-to-r from-cyber-cyan/80 to-premium-gold text-premium-black
```

**Навигация:**

| Контекст | Компонент |
|----------|-----------|
| Публичные страницы | Glassmorphism header `KH + тема + ЛК` + `<BottomNav />` (mobile pill) |
| Hub (ролевые дашборды) | `<HubLayout>` sidebar (desktop) + mobile nav |
| Server-компоненты | `<PageShell>` — client-обёртка с header + BottomNav |

---

## Правила разработки

```
✅ TypeScript strict — any запрещён, используй unknown + type guard
✅ SQL — только параметризованный: $1, $2 (без конкатенации)
✅ kamchatka_routes — только через v_kamchatka_routes_api
✅ Роль пользователя — только из JWT (не из тела запроса)
✅ Секреты — только через .env.local (не хардкод)
✅ console.log — запрещён в production (только console.error)
✅ Новая таблица/колонка — новая миграция 026_...sql
✅ JWT защита — на каждом protected endpoint
```

---

## Переменные окружения

```bash
# База данных
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=...                       # min 32 символа, обязательно
NEXTAUTH_SECRET=...

# AI — хотя бы один обязателен (fallback chain: DeepSeek→Minimax→xAI→OpenRouter)
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
OPENROUTER_API_KEY=...

# Карты и погода
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...
YANDEX_WEATHER_API_KEY=...

# Платежи
CLOUDPAYMENTS_PUBLIC_ID=...
CLOUDPAYMENTS_API_SECRET=...

# S3 (для knowledge base, опционально)
S3_ENDPOINT=...
S3_BUCKET=...
S3_REGION=...
```

---

## Деплой

```
git push origin main
  → GitHub Actions
    → Timeweb Cloud (автодеплой)
      → https://pospkam-pospktry-c1f3.twc1.net
```

Timeweb MCP Server (управление деплоем через AI):
- Токен `TIMEWEB_TOKEN` — только в `.vscode/mcp.json`, не в `.env.local`
- Команды: `create_timeweb_app`, `get_deploy_settings`, `add_vcs_provider`

---

## Текущее состояние (март 2026)

```
Страниц:              91
API endpoints:        90+  (все полностью типизированы)
SQL-миграций:         025
Маршрутов в БД:       259  (agent_route_knowledge, 14 категорий)
Туров в БД:           11   (fishingkam.ru — требуют операторов для роста)
Crew-агентов:         5
TS-ошибок:            0    (было 847)
ESLint-ошибок:        0
Build:                passing
console.log в коде:   0
```

---

## Changelog

### Март 2026 — спринт 2 (текущий)

- **Каталог маршрутов**: фикс 404 на страницах маршрутов — `/api/tours/[id]` теперь делает fallback к `agent_route_knowledge` когда ID не найден в `tours`
- **Изображения-заглушки**: 14 категорий → локальные фото из `/public/images/activities/`, `/bento/`, `/gallery/`

### Март 2026 — спринт 1

- **TypeScript: 847 → 0 ошибок** (8 итераций, 90+ файлов):
  - Создан `lib/types/db-rows.ts` — 50+ типизированных интерфейсов DB rows
  - Все API-routes полностью type-checked, `tsconfig.json` без API-исключений
  - Исправлена SQL-инъекция в `admin/finance/route.ts`
- **Скрапер маршрутов `--direct`**: 3 источника без AI (JSDOM + GraphQL + Bitrix), 149 → 259 маршрутов
- **Дедупликация** маршрутов: 2 уровня — `route_dedupe_key` + нормализованный title (ё→е)
- **Crew-агенты**: knowledge-base.json (259 маршрутов), 5 агентов обучены
- **Rate limiting**: `/api/ai/chat` (20/мин), `/api/auth/signin` (5/мин), SOS (10 мин/IP)
- **CSP**: убран `unsafe-eval`
- **Timeweb MCP Server**: задокументирован в CLAUDE.md + AGENTS.md

### Февраль–март 2026

- JWT авторизация + 6 ролей + все dashboards
- AI fallback chain: DeepSeek → Minimax → xAI → OpenRouter
- AI-чат: sessionId в localStorage, история в `chat_sessions` (JSONB)
- Profile API: `GET/PUT /api/profile`
- SOS API: `POST /api/safety/sos` → `sos_events`
- Глвная страница v3: Hero + ActivityCircles + BentoGrid + LiveFeed
- 16 SVG-иконок категорий (single-stroke)
- Дизайн-аудит: 91 страница + 100+ компонентов — единые токены
- CloudPayments: accountId/email из JWT (не хардкод)

---

## Roadmap

### Сейчас в работе
- [ ] Полный цикл бронирования тура (форма → БД → email-подтверждение)
- [ ] AI-подбор маршрута (чат на главной → список из knowledge base)

### Phase 2
- [ ] CloudPayments sandbox → тестовая оплата
- [ ] E2E-тесты (Playwright) на ключевые flow
- [ ] Push-уведомления (Firebase FCM)
- [ ] Redis-кэш для сессий и погоды
- [ ] Real-time tracking групп (WebSockets)
- [ ] CrewAI multi-agent (FastAPI) — `/api/agent` endpoint
- [ ] Международная версия (EN, ZH)
