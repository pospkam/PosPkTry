# KamchatourHub — Claude Code Rules

> Туристическая платформа Камчатки. Цель: рабочий задеплоенный код без регрессий.
> Подробности об архитектуре, сервисах и хитростях — в `.claude/MEMORY.md`.

---

## 1. СТЕК

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15 App Router, TypeScript strict, Tailwind CSS |
| Database | PostgreSQL — прямой SQL (`lib/database.ts`, `lib/db-pool.ts`), без Prisma |
| Auth | JWT — `lib/auth.ts`, middleware — `lib/auth/middleware.ts` |
| Deploy | Timeweb Cloud → `tourhab.ru` (App ID: 175477) |
| CI/CD | GitHub → автодеплой при push в `main` |

**Масштаб:** 94 стр / 256 API routes / 119 компонентов / 8 хабов / 260 маршрутов БД

**Ключевые файлы перед стартом:**
- `lib/db-pool.ts` — `import { pool } from` (named, не default)
- `lib/types/db-rows.ts` — все интерфейсы строк БД
- `lib/auth/middleware.ts` — requireAuth / requireAdmin / requireRole

---

## 2. ДИЗАЙН-СИСТЕМА

### Токены (globals.css)

| Токен | Light | Dark | Назначение |
|-------|-------|------|------------|
| `--bg-primary` | `#F5F0EB` | `#0D1117` | Фон страницы |
| `--bg-card` | `#FFFFFF` | `#21262D` | Карточки |
| `--bg-hover` | `#F0ECE7` | `#30363D` | Hover |
| `--text-primary` | `#1A1714` | `#F0F6FC` | Заголовки |
| `--text-secondary` | `#6B6560` | `#8B949E` | Подписи |
| `--text-muted` | `#9A9590` | `#484F58` | Плейсхолдеры |
| `--accent` | `#D44A0C` | `#E8734A` | CTA, активные состояния |
| `--ocean` | `#2568B0` | `#00A8CC` | Ссылки, иконки |
| `--success` | `#3FB950` | `#3FB950` | Eco, успех |
| `--warning` | `#D29922` | `#D29922` | Предупреждения |
| `--danger` | `#DC2626` | `#F85149` | SOS, ошибки |
| `--border` | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.08)` | Границы |

**DS-утилиты:** `ds-page` `ds-card` `ds-input` `ds-btn` `ds-btn-primary` `ds-btn-secondary` `ds-btn-danger` `ds-section` `ds-badge` `ds-h1` `ds-h2` `ds-label` `ds-skeleton`

**Типографика:** заголовки — `Playfair Display` (`--font-playfair`), текст — `Outfit` (`--font-outfit`)

### Запрещено

```
bg-white/10        → bg-[var(--bg-card)]
text-white         → text-[var(--text-primary)]
text-white/70      → text-[var(--text-muted)]
border-white/20    → border-[var(--border)]
backdrop-blur-*    → удалить
text-cyber-cyan / text-premium-gold / bg-premium-* → устаревшие, не использовать
font-black         → font-bold
rounded-2xl        → rounded-lg
Хардкод hex        → только CSS vars
Glassmorphism      → запрещён
```

### Компоненты платформы

- Хедер: `KH` логотип + иконка темы + ЛК (без поиска в шапке)
- Поиск: только иконка → модальное окно
- Mobile navbar (pill): Дом / Карта / Избранное / ЛК / СОС — **только на главной и хабах**
- Футер: только desktop
- Homepage: `components/homepage/` (Hero, BentoGrid, LiveFeed, ActivityCircles, CTASection, Marquee, Reveal)

---

## 3. FRONTEND-DESIGN (Anthropic Plugin)

Скилл активируется автоматически при создании UI. Работает **внутри нашей дизайн-системы**.

### Что поощряется

- **Bold typography** через `font-playfair` + крупные размеры (`text-4xl`, `text-5xl`) — заголовки секций, hero, CTA
- **Distinctive layouts** — asymmetric grids, offset cards, full-bleed секции с `--bg-primary`
- **High-impact moments** — hero-секции с мощной типографикой и минимальным декором
- **Context-aware visuals** — дикая природа Камчатки: вулканы, медведи, океан. Не generic travel
- **Micro-animations** — `transition-all duration-200`, subtle scale/opacity. Без flashy keyframes
- **Whitespace as design** — отступы говорят «премиум», не «студент-верстальщик»

### Правила применения

1. Любой цвет — только через CSS-токены (`var(--accent)`, `var(--ocean)` и т.д.)
2. Анимации — только через Tailwind transition-классы, без `@keyframes` в компонентах
3. Шрифты — Playfair Display для заголовков, Outfit для остального. Никаких Google Fonts import
4. Изображения — из `public/images/`, не placeholder.com и не unsplash ссылки
5. Иконки — только `lucide-react`. Никаких emoji
6. Glassmorphism — под абсолютным запретом даже для "эффекта"

### Контекст платформы для дизайна

Это премиальная туристическая платформа. Эстетика:
- Тёплая, земная, природная (лаваст, вулканы, тайга)
- Не минималистично-белая, не cyberpunk, не startup-purple
- Суровая красота + доверие + профессионализм

---

## 4. КОД

**Обязательно:**
- TypeScript строгий — `unknown` + type guards, без `any`
- Все API routes — Zod валидация входных данных
- JWT проверка на каждом защищённом маршруте
- SQL — только параметризованный (`$1, $2`), никогда конкатенация
- Ошибки — понятные сообщения на русском
- Никаких эмодзи в коде, UI, логах

**Запрещено:**
- `console.log` в продакшн-коде
- Секреты в коде — только `.env.local`
- Изменение схемы БД без SQL-миграции
- `SELECT * FROM kamchatka_routes` — только через `v_kamchatka_routes_api`
- `import pool from` — только `import { pool } from '@/lib/db-pool'`
- `FROM bookings` — только `FROM operator_bookings` (колонка `booking_status`, не `status`)
- `FROM tours` — только `FROM operator_tours` (или `v_kamchatka_routes_api` для публичных маршрутов)
- `await callDeepSeek()` / `await callMiMo()` / `await callOpenrouter()` напрямую — только через `callAIWaterfall()` или `callAIFast()`; прямые вызовы — только в `lib/ai/providers.ts` и health-probe файлах

**Структура файлов:**
```
components/   — атомарные компоненты (PascalCase)
hooks/        — React hooks
lib/          — утилиты, сервисы, конфиги
lib/services/ — доменные сервисы
lib/types/db-rows.ts — интерфейсы строк БД
page.tsx      — server (metadata)
_*Client.tsx  — client (логика, useState)
lib/services/lead-processor.service.ts — AI Lead Processor (квалификация лидов)
lib/pdf/proposal-generator.ts          — PDF-предложения (PDFKit)
lib/notifications/lead-notify.ts       — Telegram-нотификации о лидах
```

---

## 4.1 СТРУКТУРА ДАННЫХ (ГЕОГРАФИЯ И ТУРЫ)

Главная цель платформы — **безопасность туристов**.

### Три сущности — три таблицы (master)

Точка, маршрут и тур — разные вещи. Точка постоянна. Маршрут может меняться. Тур — коммерческое предложение.

| Сущность | Master-таблица | Записей | Назначение | NOT NULL |
|----------|---------------|---------|------------|----------|
| **Точка/Локация** | `places` | ~779 | Географический факт: вулкан, озеро, источник. Постоянная. | `name`, `lat`, `lng` |
| **Маршрут** | `kamchatka_routes` | ~294 | Путь между точками. Может меняться (сезон, погода). | `title` |
| **Тур** | `operator_tours` | ~20 | Коммерческий продукт оператора. Цена, слоты, бронирование. | `title`, `base_price`, `operator_id` |

### Связи между сущностями

```
places (779)                       ← ГДЕ. Координаты, описание, тип
  ↑ FK: location_safety_profile (763)   ← безопасность точки
  ↑ FK: location_real_time_status (763) ← реалтайм (crowds, alerts)
  ↑ ai_route_images (354)               ← фото точки
  ↑
route_waypoints                    ← СВЯЗЬ. Маршрут проходит через точки
  ↓                                   FK route_id → kamchatka_routes.id
kamchatka_routes (294)             ← КУДА. Путь, geometry, difficulty
  ↑
operator_tours.route_id (20)       ← ЧТО КУПИТЬ. Цена, оператор, бронь
  ↑                                   FK route_id → kamchatka_routes.id
partners (125)                     ← КТО. 13 операторов + 112 гидов
guide_certifications (112)         ← аттестации гидов
```

### Обратная совместимость

`agent_route_knowledge` — теперь **VIEW** (UNION ALL `places` + `kamchatka_routes`). Старый код продолжает работать. `_agent_route_knowledge_legacy` — старая таблица, не использовать.

### Правила для нового кода

- **Читать/писать точки** → `places` (NOT NULL lat, lng, name)
- **Читать/писать маршруты** → `kamchatka_routes`
- **Туры и бронирование** → `operator_tours` + `tour_availability` + `operator_bookings`
- **Безопасность точки** → `location_safety_profile` JOIN ON `agent_route_id = places.ark_id`
- **Реалтайм точки** → `location_real_time_status` JOIN ON `agent_route_id = places.ark_id`
- **Фото точки** → `ai_route_images` JOIN ON `route_id = places.ark_id`
- **Связь маршрут→точки** → `route_waypoints` (route_id, place_id, position)

### Запрещено

- `FROM agent_route_knowledge` в новом коде — использовать `places` / `kamchatka_routes`
- `FROM _agent_route_knowledge_legacy` — deprecated, не трогать
- Прямой INSERT в `agent_route_knowledge` — это VIEW, писать в master-таблицы

### Ключевые колонки

| Таблица | Колонка | Зачем |
|---------|---------|-------|
| `places` | `ark_id` (UUID) | Связь с `location_safety_profile`, `location_real_time_status`, `ai_route_images` |
| `places` | `location_type` | volcano, lake, hot_spring, mountain, geyser, etc. |
| `kamchatka_routes` | `geometry` (JSONB) | GeoJSON LineString трека маршрута |
| `kamchatka_routes` | `ark_id` (UUID) | Связь с legacy данными |
| `operator_tours` | `route_id` (UUID) | FK на `kamchatka_routes.id` |
| `route_waypoints` | `position` (INT) | Порядок точек на маршруте (0 = старт) |

### Статистика (актуально май 2026)

- 779 точек: все с координатами, все с описаниями ≥300 символов
- 763 точки с профилем безопасности и реалтайм-статусом
- 354 точки с фото
- 294 маршрута (1 с GPS-треком geometry)
- 20 туров от операторов
- 112 аттестованных гидов
- 0 связей маршрут→точки (route_waypoints — заполняется)

---

## 5. ПРОЦЕСС

Перед кодом — план: что меняешь, какие файлы затронуты, риски.

**Обязательный план если затрагивает:**
- Схему БД / миграции
- Логику авторизации
- API endpoints
- Компоненты бронирований

Если задача неоднозначна — задай вопросы (роль, новое/правка, пример поведения).

---

## 6. ДЕПЛОЙ

```bash
npx tsc --noEmit      # 0 ошибок
npx vitest run        # 214 тестов зелёные
git push origin main  # → автодеплой Timeweb
```

Переменные окружения — на Timeweb Cloud панели, не в коде.
Build config: `ignoreBuildErrors=true` на Timeweb (Docker), локально — строгая проверка.

---

## 7. НЕ ТРОГАТЬ

- `middleware.ts` — Edge JWT + rate-limit
- `lib/auth.ts` — JWT логика
- `app/api/payments/` — CloudPayments webhook
- `app/api/safety/sos` — SOS (только через staging)
- Миграции 001-049 — только добавлять новые (следующая: `050_`)

---

## 8. AI-АГЕНТЫ

**Собственник (Owner)** — единоличный владелец и финальный decision-maker.

### Рабочие агенты

| Агент | Тип | Что делает |
|-------|-----|------------|
| **Watchdog** | Cron 30 мин | Бронирования без подтверждения >24ч, операторы без ответа >48ч, лиды >2ч. Алерты в Telegram. |
| **Editor** | Cron 02:00 UTC | Туры с описанием <300 символов → AI переписывает → `route_description_cache`. |
| **Scout Digest** | Cron 07:00 UTC | RSS (Habr, RATA, Tourprom, Kamgov) → AI-синтез → дайджест в Telegram. |
| **Kuzmich** | Мультиканальный | Telegram, MAX, Web, Widget. Общий мозг: `lib/kuzmich/core.ts` |

Файлы: `lib/agents/watchdog.ts`, `editor.ts`, `scout-digest.ts`
GitHub Actions: `.github/workflows/cron-watchdog.yml`, `cron-editor.yml`, `cron-scout-digest.yml`

> Совет директоров (13 AI-агентов, board meeting, 5 раундов) — **удалён апрель 2026** как неэффективный. 10,318 строк. Коммиты: `9da9e8d2`, `5d4d83f9`. Подробности: `AGENTS.md`

**Полный реестр агентов:** `AGENTS.md`

---

## Database Migrations

- Миграции лежат в `migrations/`, формат `NNN_name.sql` (128 файлов)
- Tracking: таблица `_migrations` (name UNIQUE, applied_at)
- Применение: `npm run migrate` (запускает `lib/database/migrate.ts`)
  - Локально: `DATABASE_URL=<local> npm run migrate`
  - На проде: SSH в Timeweb, `cd /root/PosPkTry && npm run migrate`
- **НИКОГДА** не применять миграции через HTTP endpoint
- Файлы с `CREATE INDEX CONCURRENTLY` автоматически определяются и применяются вне транзакции (без BEGIN/COMMIT), statement-by-statement
- Все миграции должны быть идемпотентны (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
- Bootstrap tracking на новом инстансе: `DATABASE_URL=<prod> npx tsx scripts/bootstrap-migrations-tracking.ts`

---

---

## 9. КАРТОЧКА ТОЧКИ/ЛОКАЦИИ (место на карте)

Точка — это не тур. Точка — это географический факт. Вулкан, озеро, источник. Карточка точки должна отвечать на вопросы туриста с рюкзаком, а не продавать.

### Принцип

Точка = место. Тур = коммерция. Не смешивать. Все партнёрские сервисы (авиабилеты, отели, трансферы, страховка, Яндекс.Путешествия) — только на странице тура (`operator_tours`), не на странице точки.

### Что ДОЛЖНО быть на карточке точки

**Hero-блок:**
- Галерея реальных фото (из `ai_route_images`, не заглушки)
- Название + тип (Вулкан / Озеро / Термальный источник / ...)
- Координаты (lat, lng) — одной строкой, кликабельно

**Быстрые факты (горизонтальная лента):**
- Сложность (из `places.difficulty` или `location_safety_profile`)
- Высота (из `location_safety_profile.altitude_m`)
- Расстояние до медпомощи (из `location_safety_profile.nearest_medical_km`)
- Сезон / лучшие месяцы
- Тип территории (из `location_safety_profile.terrain_type`)

**Описание:**
- Текст ≥300 символов (уже есть у всех 779 точек)
- Кнопка "Читать полностью"

**Безопасность (из `location_safety_profile`):**
- Уровень опасности + типы hazards
- Правила посещения (`rules_required`)
- Нужна ли спутниковая связь (`sat_communicator_required`)
- Телефон рейнджера/МЧС (`phone_ranger_mches`)
- Экстренный доступ (`emergency_access`)
- Дорога и тип подъезда (`road_type`, `road_accessibility`)

**Реалтайм (из `location_real_time_status`):**
- Открыто/закрыто (`is_open`)
- Текущая загрузка (`current_crowds`)
- Активные алерты (`active_alerts`, `alert_severity`, `alert_message`)
- Погода (`current_weather`)

**Карта:**
- Leaflet с точкой + ближайшие точки в радиусе 10 км
- Кнопка "Открыть в Organic Maps" (deep link)

**Кузьмич:**
- Блок "Кузьмич о месте" (из `kuzmich_review` если есть)
- Кнопка "Спросить Кузьмича про это место" → передаёт контекст точки + safety profile

**Скачивание:**
- Кнопка "Скачать для офлайн" (сохраняет в IndexedDB через `useOfflineRegion`)

### Что НЕ ДОЛЖНО быть на карточке точки

- Цена / "от ... ₽" — это про тур
- Кнопка "Забронировать" — это про тур
- OfferCard с турами операторов — это про тур
- Фильтры цен/сложности/типа туров — это про тур
- Авиабилеты (FlightsBlock) — это про тур
- Отели (HotelsBlock) — это про тур
- Трансферы (TransfersBlock) — это про тур
- Страховка (InsuranceBlock) — это про тур
- Яндекс.Путешествия (YandexTravelBlock) — это про тур
- Mobile sticky bar с ценой и "Забронировать" — это про тур
- LeadModal / TourPaymentModal — это про тур
- Слайдер цен, сортировка по рейтингу/дате/местам — это про тур

### Связь точка → тур

Внизу карточки точки — секция "Туры к этому месту":
- Ссылки на `operator_tours` которые проходят через эту точку (через `route_waypoints`)
- Компактный список, не развёрнутые OfferCard
- Формат: название тура, оператор, цена, ссылка → `/marketplace/tours/[id]`

### Источники данных для карточки

| Блок | Таблица | JOIN |
|------|---------|------|
| Фото | `ai_route_images` | `route_id = places.ark_id` |
| Основное | `places` | — |
| Безопасность | `location_safety_profile` | `agent_route_id = places.ark_id` |
| Реалтайм | `location_real_time_status` | `agent_route_id = places.ark_id` |
| Кузьмич | `places.kuzmich_review` или `_agent_route_knowledge_legacy` | — |
| Туры к месту | `operator_tours` → `route_waypoints` → `places` | через route_waypoints |

### Файлы для рефакторинга

- `app/routes/[id]/_RouteDetailClient.tsx` — текущий компонент (1163 строки, перегружен)
- Нужно разделить на: `_PlaceDetailClient.tsx` (точка) и `_TourDetailClient.tsx` (тур)
- Или: отдельные routes `app/places/[id]/` для точек, `app/tours/[id]/` для туров

> Статус: MVP завершён. Фаза: эволюция через агентов.
> Обновлено: Май 2026 | Агенты: `AGENTS.md`
