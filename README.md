# Kamchatour Hub

Единая платформа для управления туризмом на Камчатке.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-blue)](https://nextjs.org/)
[![Production](https://img.shields.io/badge/prod-Timeweb%20Cloud-orange)](https://pospkam-pospktry-c1f3.twc1.net)

---

## О проекте

**Kamchatour Hub** — туристическая платформа Камчатки, объединяющая 6 типов пользователей в единой экосистеме.

| Роль | Функционал |
|------|------------|
| **Турист** | Поиск туров, бронирование, отзывы, eco-points, история |
| **Туроператор** | CRM, управление турами, календарь, аналитика |
| **Гид** | Расписание, группы, заработок, профиль, репутация |
| **Трансфер-оператор** | Автопарк, водители, маршруты, расписание |
| **Агент** | Клиенты, ваучеры, комиссионные, статистика |
| **Администратор** | Модерация, пользователи, финансы платформы |

**Продакшен:** https://pospkam-pospktry-c1f3.twc1.net

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 15 (App Router), React 18, TypeScript 5.4, Tailwind CSS |
| Backend | Next.js API Routes, PostgreSQL (прямой SQL) |
| Auth | JWT (jose) + bcrypt, 6 ролей |
| AI | DeepSeek (primary) → Minimax → xAI Grok → OpenRouter (fallback chain) |
| Платежи | CloudPayments |
| Карты | Яндекс.Карты |
| Погода | Яндекс Weather API (proxy, кэш 6ч) |
| Деплой | Timeweb Cloud, Docker, Kubernetes |

---

## Быстрый старт

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.local.example .env.local
# Заполните DATABASE_URL, JWT_SECRET и AI ключи
npm run dev
```

Откройте http://localhost:3000

### Команды

```bash
npm run dev               # Dev сервер (порт 3000)
npm run build             # Production сборка
npm run lint              # ESLint
npm test                  # Vitest

npm run db:migrate                     # Применить все SQL миграции
npm run db:import:kamchatka-routes     # Импорт маршрутов из партнёров
npm run db:import:kamchatka-routes:reset  # Сброс + повторный импорт
npm run db:sync:agent-routes           # Синхронизация agent_route_knowledge
npm run ai:setup-agent-rag             # Инициализация RAG-индекса
```

### Docker

```bash
docker-compose up     # Next.js + PostgreSQL
npm run db:migrate    # SQL миграции
npm run db:seed       # Тестовые данные
```

---

## Структура проекта

```
PosPkTry/
├── app/
│   ├── page.tsx               # Главная страница (14 категорий активностей)
│   ├── api/                   # API endpoints
│   │   ├── auth/              # login, register, me
│   │   ├── tours/             # Каталог туров
│   │   ├── bookings/          # Бронирования
│   │   ├── profile/           # GET + PUT профиля пользователя
│   │   ├── operator/          # CRM оператора
│   │   ├── guide/             # Dashboard гида
│   │   ├── transfer/          # Трансферы (оператор)
│   │   ├── transfers/         # Трансферы (клиент)
│   │   ├── agent/             # Агентские операции
│   │   ├── admin/             # Платформенное управление
│   │   ├── ai/                # DeepSeek→Minimax→xAI→OpenRouter
│   │   │   └── chat/          # Чат с историей сессии (JSONB)
│   │   ├── weather/           # Яндекс Weather proxy
│   │   ├── payments/          # CloudPayments webhook
│   │   └── safety/sos/        # SOS endpoint → sos_events таблица
│   ├── hub/                   # Dashboards
│   │   ├── tourist/
│   │   ├── operator/
│   │   ├── guide/
│   │   ├── transfer-operator/
│   │   ├── agent/
│   │   └── admin/
│   ├── tours/[id]/            # Детальная страница тура
│   ├── search/                # NLP-поиск
│   ├── ai-assistant/          # AI чат
│   ├── safety/                # SOS, МЧС
│   └── eco/                   # Eco-points dashboard
│
├── components/
│   ├── home/                  # Компоненты главной
│   ├── ui/                    # Button, Card, Modal, Input
│   ├── layout/                # HubLayout, HubSidebar
│   ├── ai/                    # AIChatWidget (подключён к /api/ai/chat)
│   ├── booking/               # TourBookingForm, StayBookingForm
│   ├── icons/                 # 16 SVG-иконок категорий (все single-stroke)
│   ├── eco/                   # EcoPointsDashboard
│   ├── safety/                # SOSButton, EmergencyModal
│   ├── tours/                 # TourCard, TourFilters
│   └── weather/               # WeatherWidget
│
├── lib/
│   ├── database.ts            # PostgreSQL клиент + re-exports
│   ├── db-pool.ts             # Pool singleton
│   ├── services.ts            # Service layer
│   ├── auth/                  # JWT логика
│   ├── ai/                    # prompts.ts (роло-ориентированные системные промпты)
│   ├── payments/              # CloudPayments helpers
│   └── notifications/         # Email, SMS, Telegram
│
├── lib/database/migrations/   # 22 SQL миграции (001–022)
├── scripts/
│   ├── apply-new-schemas.sql          # Точка входа для npm run db:migrate
│   ├── import-kamchatka-routes.js     # Импорт 129+ маршрутов из партнёров
│   ├── sync-agent-route-knowledge.js  # Наполнение agent_route_knowledge
│   └── setup-agent-rag.ts             # RAG-индекс для crew-агентов
├── k8s/                       # Kubernetes конфиги
└── monitoring/                # Grafana + Prometheus
```

---

## API

### Swagger

```
GET /api-docs
```

### Ключевые endpoints

| Группа | Endpoint | Описание |
|--------|----------|----------|
| Auth | `POST /api/auth/login` | Авторизация |
| Auth | `POST /api/auth/register` | Регистрация |
| Auth | `GET /api/auth/me` | Текущий пользователь |
| Profile | `GET /api/profile` | Профиль (JWT) |
| Profile | `PUT /api/profile` | Обновить имя/телефон/настройки |
| Tours | `GET /api/tours` | Список туров с фильтрами |
| Tours | `GET /api/tours/[id]` | Детали тура |
| Bookings | `POST /api/bookings` | Создать бронирование |
| Bookings | `GET /api/bookings/my` | Мои бронирования |
| AI | `POST /api/ai/chat` | AI-помощник (публичный) |
| AI | `GET /api/ai/chat?sessionId=` | История сессии |
| Weather | `GET /api/weather` | Погода (proxy) |
| Safety | `POST /api/safety/sos` | SOS сигнал → sos_events |

---

## База данных

### Основные таблицы

```sql
users                   -- UUID, email, role, bcrypt hash
partners                -- Операторы/агенты, verified
tours                   -- Туры, цены, eco_points_reward
bookings                -- Бронирования, payment_status
reviews                 -- Отзывы, рейтинги, фото
transfers               -- Трансферные маршруты
vehicles                -- Автопарк
drivers                 -- Водители
chat_sessions           -- AI чат (session_id, role, messages JSONB)
eco_points              -- Eco-points транзакции
notifications           -- Push-уведомления
sos_events              -- SOS сигналы (координаты, статус, ip)
kamchatka_routes        -- 129 спарсенных маршрутов (14 категорий)
agent_route_knowledge   -- RAG-индекс для crew-агентов
```

### Категории маршрутов (kamchatka_routes)

| Категория | Маршрутов |
|-----------|-----------|
| vulkani | 30 |
| termalnye_istochniki | 19 |
| lakes | 15 |
| eco | 14 |
| mountains | 12 |
| geyzery | 10 |
| rivers | 7 |
| trekking | 6 |
| rybalka / fishing | 5 + 10 туров |
| morskie_progulki | 5 |
| medvedi | 3 |
| vertoletnye_tury | 3 |
| snegohod / jeep | — |

### Миграции

```bash
# Применить все 22 миграции (идемпотентно)
npm run db:migrate
# Файл: scripts/apply-new-schemas.sql
# Миграции: lib/database/migrations/001_...sql → 022_...sql
```

---

## Статус

**Актуально на 8 марта 2026:**

```
Миграции:       22 (001–022)
Маршруты в БД:  129 (14 категорий)
Туры в БД:      11 (fishingkam.ru)
Иконки:         16 SVG-категорий
Build:          passing
console.log:    0 (запрещены в prod)
```

### Реализовано

- [x] JWT авторизация + 6 ролей
- [x] Dashboards всех ролей
- [x] Каталог туров с фильтрами
- [x] Бронирование + CloudPayments (accountId/email из JWT)
- [x] AI-помощник подключён: DeepSeek → Minimax → xAI → OpenRouter
- [x] AI чат: sessionId в localStorage, история в chat_sessions (JSONB)
- [x] Быстрые кнопки чата: Планировать тур / Погода / Безопасность
- [x] Profile API (`GET /api/profile`, `PUT /api/profile`)
- [x] SOS API (`POST /api/safety/sos` → sos_events, геолокация, лимит 10 мин)
- [x] Погода Яндекс API
- [x] Яндекс.Карты с маршрутами
- [x] Eco-points геймификация
- [x] База знаний поддержки
- [x] 129 маршрутов: 14 категорий (kamchatka_routes + categoryAliases)
- [x] agent_route_knowledge таблица + sync-скрипт для RAG
- [x] Главная: 14 активностей с реальными категориями из БД, ordered by count
- [x] 16 SVG-иконок категорий (Volcano, Thermal, Lake, Eco, Mountain, Geyser, River, SeaWalk, ...)
- [x] TourForm: 13 категорий приведены к реальной таксономии БД
- [x] Мониторинг: Grafana + Prometheus (docker-compose)

### Phase 2 (не реализовано)

- [ ] E2E тестирование (Playwright)
- [ ] Push-уведомления (Firebase FCM)
- [ ] Redis кэш для сессий и погоды
- [ ] Международная версия (EN, ZH)
- [ ] Real-time tracking групп (WebSockets)
- [ ] CrewAI multi-agent: FastAPI сервис, `/api/agent` endpoint

---

## Деплой

Push в `main` → GitHub Actions → автодеплой на Timeweb Cloud.

### Переменные окружения

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...                      # обязательно, min 32 символа
NEXTAUTH_SECRET=...

# AI — хотя бы один ключ обязателен (fallback chain)
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
OPENROUTER_API_KEY=...              # последний fallback (claude-3.5-sonnet)

YANDEX_WEATHER_API_KEY=...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...

CLOUDPAYMENTS_PUBLIC_ID=...
CLOUDPAYMENTS_API_SECRET=...
```

---

## Правила разработки

- TypeScript strict, `any` запрещён — использовать `unknown` + type guard
- SQL всегда параметризованный: `$1, $2`, без конкатенации строк
- Роль только из JWT (`session.user.role`), не из тела запроса
- `console.log` запрещён в production коде (использовать `console.error`)
- Новая фича в БД → новая миграция `023_...sql`, существующие не изменять
- `middleware.ts`, `lib/auth.ts`, `app/api/payments/`, `app/api/safety/sos` — не трогать без явной задачи
- Компоненты без `'use client'` — server по умолчанию; client только для интерактивности

---

## Партнёры

**Камчатская Рыбалка** (fishingkam.ru)
Контакты: +7 914-782-22-22, +7 999-299-70-07
11 туров загружены в БД.

---

## Changelog

### Март 2026 (текущий спринт)

- **AIChatWidget**: подключён к реальному `/api/ai/chat`, sessionId в localStorage, история сессии сохраняется в БД; быстрые кнопки (Планировать тур / Погода / Безопасность) отправляют пресет-запросы
- **AI fallback chain**: DeepSeek → Minimax → xAI Grok → OpenRouter (claude-3.5-sonnet)
- **Profile API**: реализован `GET /api/profile` + `PUT /api/profile`; страница профиля использует реальные данные
- **SOS API**: `POST /api/safety/sos` → таблица `sos_events` (координаты, IP, rate-limit 10 мин); SOSButton вызывает реальный API
- **Бронирование**: `accountId` и `email` в платёжных формах берутся из JWT (`useAuth`), не хардкод
- **Главная страница**: 14 категорий активностей с реальными данными из БД, упорядочены по количеству маршрутов
- **6 новых SVG-иконок**: LakeIcon, EcoIcon, MountainIcon, GeyserIcon, RiverIcon, SeaWalkIcon
- **TourForm**: 13 категорий приведены к реальной таксономии (`fishing`, `vulkani`, `thermal`, `trekking`, `snowmobile`, `jeep`, `helicopter`, `bears`, `lakes`, `mountains`, `rivers`, `eco`, `combo`)
- **categoryAliases**: добавлены `snegohod`, `dzhip`, `lakes`, `eco`, `mountains`, `rivers`, `combo`; все 129 маршрутов теперь распределены по категориям
- **agent_route_knowledge**: миграция 018 применена в prod; таблица готова для RAG
- **Миграции**: добавлены 020 (sos_events), 021 (chat_sessions), 022 (ALTER chat_sessions добавлены колонки session_id/role/messages); `scripts/apply-new-schemas.sql` обновлён до 022

### Февраль–март 2026

- Массовый merge веток claude/* и copilot/*: полная синхронизация кода
- Главная страница: новый дизайн, glassmorphism, авто-карусель активностей, ripple-эффекты, тёмная/светлая тема
- Полная замена emoji на Lucide React иконки во всех компонентах
- Улучшена архитектура server/client split (metadata только в server-компонентах)
- Улучшена мобильная версия: iOS glassmorphism, адаптивные фоны, bottom nav pill
- Улучшена безопасность: rate limiting, строгие RBAC и IDOR-гварды
- Добавлены страницы: eco-points, AI-чат, safety/SOS, offline, dashboards всех ролей
- Внедрён Timeweb MCP сервер для управления деплоем

---

## План внедрения CrewAI-агента (Phase 2)

### Архитектура

```
Next.js API (/api/agent)
    ↓
FastAPI сервис (docker-compose.crewai.yml)
    ↓
CrewAI: 5 агентов sequential
  ├── Intent Parser    — разбор запроса туриста
  ├── Researcher       — RAG по agent_route_knowledge
  ├── Planner          — 2–3 маршрута с ценами
  ├── Checker          — инструменты: погода, доступность
  └── Output Formatter — ответ со ссылкой на бронирование
```

### Этапы

| Этап | Задачи | Результат |
|------|--------|-----------|
| 1. Подготовка | CrewAI container, DeepSeek integration, RAG-индекс из 129 маршрутов | crew запущен локально |
| 2. MVP агента | 5 агентов, 5–7 шагов, тест 30–50 запросов | агент отвечает в консоли |
| 3. Интеграция | `/api/agent` endpoint, streaming в чате, Redis кэш, LangSmith | агент интегрирован в dev |
| 4. Production | Deploy на Timeweb, A/B-тест, 2–3 tool (цены, партнёрские API) | агент в production |

**Целевые метрики:** accuracy 70–80%, latency <5 сек, конверсия +20–30%
