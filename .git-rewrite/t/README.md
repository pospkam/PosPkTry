# TourHab — Туристический агрегатор Камчатки

Единая платформа для поиска маршрутов, бронирования туров и взаимодействия с операторами Камчатки. Модель: **Aviasales для Камчатки** — турист видит точку на карте, описание, список операторов с ценами, датами и отзывами.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pospkam/PosPkTry)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%2C%200%20errors-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

**Продакшен:** [tourhab.ru](https://tourhab.ru)

---

## Архитектура

```
Маршрут (agent_route_knowledge)     Тур (tours)
  1158 маршрутов, 14 категорий        66 туров от 5 операторов
  Источник: скрапинг 12 сайтов        Источник: операторы через CRM
  Координаты: 100% покрытие           Цена, выезды, бронирование
         |                                    |
         +---- v_route_marketplace -----------+
                   |
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
| AI | DeepSeek / Timeweb Agent / OpenRouter / Anthropic (waterfall) |
| Maps | Leaflet + OpenStreetMap (маркеры с попапами и ссылками) |
| Telegram | @KuzmichKam_bot — уведомления, TG-канал, чат-бот |
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
npm run db:migrate       # SQL-миграции (идемпотентно)
```

---

## Структура проекта

```
app/
  page.tsx                       # Главная (Hero + CategoryCards + NowOnKamchatka + Reviews)
  routes/                        # Каталог маршрутов (1158 шт.)
    [id]/                        # Детальная страница + похожие маршруты
  operators/                     # Каталог операторов (5 шт.)
    [slug]/                      # Профиль оператора + его маршруты
  map/                           # Интерактивная карта (Leaflet, 900+ маркеров)
  hub/                           # Личные кабинеты (6 ролей)
    tourist/ operator/ guide/ admin/ agent/ transfer-operator/
  api/                           # 254 API endpoints
    routes/ leads/ operators/ assistant/ public/ tours/ bookings/

components/
  homepage/                      # Hero, CategoryCards, NowOnKamchatka, ReviewsSection
  routes/                        # RouteCard, LeadModal, BookingModal, CategoryPage
  shared/                        # LeafletMap, AssistantButton, SOSButton, BottomNav
  layout/                        # Header, Footer

lib/
  storage/s3.ts                  # S3 клиент (Timeweb Object Storage)
  ai/providers.ts                # AI waterfall (4 провайдера)
  auth/                          # JWT middleware
  db-pool.ts                     # PostgreSQL pool (named export: { pool })
  services/                      # 25 доменных сервисов

hooks/
  useSourceTracker.ts            # UTM/referrer first-touch attribution
  useInterestTracker.ts          # Профиль интересов (localStorage)
```

---

## Ключевые фичи

### Каталог маршрутов
- **1158 маршрутов**, 14 категорий, 100% с координатами
- Источники: 12 сайтов (mestechkokam, kamchatintour, sputnik8, russiadiscovery и др.)
- Фильтрация по категориям, поиск, сортировка
- 14 SEO-страниц по категориям (`/routes/vulkani`, `/routes/rybalka` и т.д.)

### Marketplace
- **v_route_marketplace** — view связывающий маршруты с турами операторов
- На карточке: цена, оператор, "Можно забронировать", сезонный бейдж
- На детальной: предложения операторов с ценами, датами, ссылками

### Карта
- Leaflet + OpenStreetMap, 14 цветовых фильтров
- Кликабельные маркеры с попапами и ссылками на маршруты
- Подсчёт точек по фильтру

### Операторы
- 5 операторов: Камчатинтур, TopKam, Камчатская Рыбалка, Вулкан Гид, Камчатка Дикая
- Профили с услугами, галереей, отзывами, FAQ, сезонным календарём
- Секция "Маршруты на TourHab" с карточками из marketplace

### AI-помощник ("Кузьмич")
- Floating чат на каждой странице (AssistantButton)
- Контекстные приветствия и чипсы в зависимости от страницы
- Персонализация по интересам пользователя (localStorage)
- AI waterfall: DeepSeek → Timeweb Agent → OpenRouter → Anthropic

### Lead Capture
- Форма заявки без регистрации (LeadModal)
- UTM/referrer трекинг (first-touch attribution)
- Уведомления в Telegram с source_data

### TG-канал
- Автогенерация постов (`scripts/generate-tg-post.js`)
- Прямые ссылки на маршруты (`/routes/{id}`)
- Персонаж Кузьмич + знание платформы

### Бронирование
- 330 выездов (tour_departures), BookingModal
- Уведомления операторам в Telegram
- CloudPayments (интеграция)

---

## Storage (S3)

Архитектура хранения файлов:

```
S3 (production)                    Local (development)
  s3.twcstorage.ru/{bucket}/         public/images/
    images/hero/                     public/uploads/
    images/activities/
    images/bento/
    images/gallery/
    uploads/
```

| Endpoint | Storage | Назначение |
|----------|---------|------------|
| `POST /api/admin/photos/upload` | S3 → local fallback | Admin: загрузка + Vision AI + resize |
| `POST /api/upload` | S3 → local fallback | User: загрузка изображений |
| `GET /api/photos/[...path]` | `/tmp` fallback | Раздача при отсутствии S3 |

**Библиотека:** `lib/storage/s3.ts` — `uploadToS3()`, `deleteFromS3()`, `getS3PublicUrl()`, `isS3Configured`

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
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...
ANTHROPIC_API_KEY=...
TIMEWEB_TOKEN=...
TIMEWEB_AI_AGENT_ID=...

# === Telegram ===
TELEGRAM_BOT_TOKEN=...
TELEGRAM_FISHING_CHAT_ID=...
TELEGRAM_LEADS_CHAT_ID=...
TELEGRAM_CHANNEL_ID=...
TELEGRAM_WEBHOOK_SECRET=...

# === Email (SMTP Yandex) ===
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...

# === Analytics ===
NEXT_PUBLIC_YANDEX_METRIKA_ID=...
GOOGLE_SITE_VERIFICATION=...
YANDEX_VERIFICATION=...

# === Платежи (опционально) ===
CLOUDPAYMENTS_API_SECRET=...
NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID=...
PLATFORM_COMMISSION_RATE=0.15

# === Карты ===
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...

# === Rate Limiting (опционально) ===
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## База данных

### Ключевые таблицы

```sql
-- Маршруты (knowledge base)
agent_route_knowledge    -- 1158 маршрутов, 14 категорий, kuzmich_review
-- Visibility: is_visible (admin toggle, /hub/admin/content/routes)

-- Marketplace
v_route_marketplace      -- VIEW: маршрут + тур + оператор + цена + дата

-- Операторы
partners                 -- 5 операторов, slug, профиль, контакты

-- Туры и бронирования
tours                    -- 66 туров (operator_id → partners)
tour_departures          -- 330 выездов (start_date, slots, price)
bookings                 -- бронирования (user_id, departure_id, status)

-- Лиды
leads                    -- заявки без регистрации, source_data JSONB

-- Пользователи
users                    -- 6 ролей: tourist, operator, guide, transfer_operator, agent, admin
```

### Миграции

39 файлов в `lib/database/migrations/` (001-036). Следующая: `037_`.

```bash
npm run db:migrate    # Идемпотентно, безопасно повторять
```

---

## Деплой

```
git push origin main
  → GitHub Actions (tsc + vitest + build)
    → Timeweb Cloud (автодеплой, App ID: 159529)
      → tourhab.ru
```

**Домен:** tourhab.ru (DNS: ns1/ns2.reg.ru, A → 51.250.0.136)

---

## Текущее состояние (март 2026)

```
Страниц:              89
API endpoints:       254
Компонентов:         102
SQL-миграций:         39
Маршрутов в БД:    1 158 (14 категорий, 12 источников)
Операторов:            5
Туров:                66 (330 выездов)
Хуков:                 5
Сервисов:             25
TS-ошибок:             0
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
- Миграции: без изменения существующих (001-036)
- Middleware (`middleware.ts`): не трогать без необходимости
