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

`agent_route_knowledge` — теперь **VIEW** (UNION ALL `places` + `kamchatka_routes`). UPDATE/INSERT через INSTEAD OF триггеры (Migration 663). `_agent_route_knowledge_legacy` — старая таблица, не использовать.

**Запрещено для нового кода:** `INSERT INTO agent_route_knowledge` напрямую — писать в `places` или `kamchatka_routes`.

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

- 778 точек (places): все с координатами, все с описаниями ≥300 символов
- 763 точки с профилем безопасности и реалтайм-статусом
- 354 точки с фото
- 294 маршрута (kamchatka_routes)
  - **~150 маршрутов** с waypoints (migrations 653-657: 238 связей)
  - Для маршрутов с 1+ waypoints: синтетический LineString (migration 168)
  - GPS-треки из OSM: **не импортированы** (нужен `POST /api/admin/import/osm-geometry`)
  - Описания из visitkamchatka.ru: **статус неизвестен** (endpoint есть, вызывался ли — неизвестно)
- 20 туров от операторов
- 112 аттестованных гидов

**ВАЖНО:** перед любым импортом проверять реальное состояние через `/hub/admin/content/routes` или `/api/admin/audit-knowledge`, не полагаться на цифры выше — они могут устареть.

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
- **Авто-миграции при деплое:** `start.js` запускает `scripts/migrate-standalone.js` перед стартом сервера

---

## 6.1 DOCKER / TIMEWEB ОГРАНИЧЕНИЯ

**КРИТИЧНО — читать перед любыми изменениями Dockerfile:**

| Ограничение | Значение |
|-------------|---------|
| Лимит размера standalone | **50 МБ** — превышение = деплой падает |
| `images.unoptimized: true` | Убирает sharp (~33 МБ) — **не убирать!** |
| `node_modules` в runner stage | **НЕ копировать вручную** — всё уже в `.next/standalone/node_modules` |
| `tsx` в runner | Недоступен — только CJS (`require`) |

**Запрещено в Dockerfile runner stage:**
- `COPY --from=builder /app/node_modules ./node_modules` — раздует образ
- `COPY node_modules/anything` по отдельности — это уже есть в standalone bundle
- Установка npm пакетов через `RUN npm install` в runner

**Разрешённые COPY в runner:**
```
COPY --from=builder /app/.next/standalone ./        ← весь standalone (включает node_modules)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts/migrate-standalone.js ./scripts/migrate-standalone.js
COPY --from=builder /app/start.js ./start.js
```

---

---

## 9. КАРТОЧКА ТОЧКИ/ЛОКАЦИИ (место на карте)

Точка — это не тур. Точка — это географический факт. Вулкан, озеро, источник. Карточка точки должна отвечать на вопросы туриста с рюкзаком, а не продавать.

### Принцип

Точка = место. Тур = коммерция. Не смешивать. Все партнёрские сервисы (авиабилеты, отели, трансферы, страховка, Яндекс.Путешествия) — только на странице тура (`operator_tours`), не на странице точки.

### Блоки карточки (сверху вниз)

**1. Hero-фото (галерея, свайп):**
- Реальные фото из `ai_route_images` (JOIN `route_id = places.ark_id`)
- Если нет фото — `RouteGradientPlaceholder` по `location_type`

**2. Заголовок:**
- Тип (ВУЛКАН / ОЗЕРО / ...) + высота если есть
- Название (font-playfair, крупно)
- Координаты (кликабельно, копируются)

**3. Статус-строка (одна строка):**
- Открыто/закрыто (из `location_real_time_status.is_open`)
- Загрузка (из `current_crowds`)
- Сложность (из `location_safety_profile.difficulty_level`)

**4. Описание:**
- Текст из `places.description` (≥300 символов у всех)
- Кнопка "Читать полностью" если длинный

**5. Характеристики (сетка фактов):**
- Тип (volcano/lake/... + действующий/потухший если вулкан)
- Высота (`location_safety_profile.altitude_m`)
- Рельеф (`terrain_type`)
- Сезон (лучшие месяцы)
- Вместимость (`capacity_per_day`)

**6. Что знать (безопасность как свойство места):**
- Опасности (`hazard_types`) — бейджи: лавины, камнепад, термальные, высота
- До медпомощи (`nearest_medical_km`)
- Спутниковая связь (`sat_communicator_required`)
- Экстренные телефоны (112, МЧС Камчатка)
- НЕ инструкция как идти — это свойство места

**7. Маршруты (ссылки-кнопки):**
- Маршруты проходящие через эту точку (через `route_waypoints`)
- Каждый — ссылка на `/routes/[id]`
- На странице маршрута — трек, снаряжение, регистрация МЧС, дорога

**8. Карта:**
- Leaflet с точкой + ближайшие точки в радиусе 10 км
- Кнопки: "Organic Maps" (deep link) + "Скачать для офлайн"

**9. Кузьмич:**
- Блок "Кузьмич о месте" (из `kuzmich_review` если есть)
- Кнопка "Спросить Кузьмича про это место" → контекст точки + safety

**10. Отзывы о месте:**
- Рейтинг (звёзды), имя, дата, текст
- Отзывы привязаны к МЕСТУ (place_id), не к туру
- Кнопки "Все отзывы" + "Оставить отзыв"
- Таблица: `reviews` с `place_id` (добавить колонку)

**11. Туры сюда (компактные ссылки):**
- `operator_tours` связанные через `route_waypoints` → `kamchatka_routes` → `places`
- Формат: название, оператор, цена → ссылка на `/marketplace/tours/[id]`

**12. Рядом:**
- Ближайшие точки по координатам с расстоянием
- Формат: [Корякский 4км] [Козельский 7км]

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

### Навигация между сущностями

- Точка → "Маршруты" → страница маршрута (трек, снаряжение, инструкция, регистрация МЧС)
- Точка → "Туры сюда" → страница тура (цена, оператор, бронирование, авиабилеты, отели)
- Маршрут → точки на маршруте → карточки точек
- Тур → маршрут → точки

### Источники данных для карточки

| Блок | Таблица | JOIN |
|------|---------|------|
| Фото | `ai_route_images` | `route_id = places.ark_id` |
| Основное | `places` | — |
| Безопасность | `location_safety_profile` | `agent_route_id = places.ark_id` |
| Реалтайм | `location_real_time_status` | `agent_route_id = places.ark_id` |
| Кузьмич | `places.kuzmich_review` или `_agent_route_knowledge_legacy` | — |
| Туры к месту | `operator_tours` → `route_waypoints` → `places` | через route_waypoints |

### Файлы

- `app/places/[id]/` — карточка точки (новый, отделён от туров)
- `app/api/places/[id]/route.ts` — API для карточки точки

---

## 10. КАРТОЧКА МАРШРУТА

Маршрут — это инструкция. Точка — факт. Тур — коммерция. Маршрут отвечает: куда идти, как, сколько, что опасно, что взять.

### Блоки карточки маршрута (сверху вниз)

**1. Hero:** карта с треком (geometry) + точки на нём. Без geometry — фото первой точки.

**2. Заголовок:** МАРШРУТ · название · район · зона

**3. Статы (одна строка):** дистанция км, перепад высот м, длительность, сложность, сезон, тип (радиальный/линейный/кольцевой)

**4. Описание:** текст маршрута, "Читать полностью"

**5. Точки маршрута (через `route_waypoints`):**
- Последовательность точек с расстояниями и описанием каждой
- Каждая точка — ссылка на `/places/[id]`
- Формат: 1. Парковка · 795м → 2. Площадка «Медвежья» · +700м → ...

**6. Опасности (конкретные, не общие):**
- Иконки + текст: "Горячие источники до 900°C", "Камнепад", "Хищные животные"
- Из `kamchatka_routes.hazards` + safety_profile точек маршрута

**7. Подготовка:**
- Регистрация МЧС: `mchs_registration_required`, `mchs_phone`, ссылка forms.mchs.gov.ru
- Согласование парка: `park_name`, `park_approval_url`
- Снаряжение: `equipment[]` — бейджи
- Рекомендации: гид нужен/рекомендуется

**8. Карта с треком:**
- Leaflet: линия geometry + точки маршрута + nearby
- Кнопки: GPX скачать, Organic Maps, Скачать для офлайн

**9. Кузьмич:** "Спросить про маршрут" с контекстом

**10. Туры по маршруту:** компактные ссылки на operator_tours (через `operator_tours.route_id`)

**11. Отзывы о маршруте**

**12. Похожие маршруты:** по зоне и activity_type

### Регистрация в МЧС (заготовка)

На маршрутах с `mchs_registration_required = true` — блок:
- Телефон МЧС для консультации (`mchs_phone`)
- Ссылка на онлайн-регистрацию: `forms.mchs.gov.ru/registration_tourist_groups/form`
- Предзаполненные данные: название маршрута, даты, регион "Камчатский край"
- Существующий API: `POST /api/operator/mchs/register` (для операторов)
- TODO: Форма самостоятельной регистрации туриста через наш интерфейс

### Колонки `kamchatka_routes` (расширенные)

| Колонка | Тип | Назначение |
|---------|-----|------------|
| `pdf_url` | TEXT | Ссылка на PDF паспорт маршрута (visitkamchatka.ru) |
| `season` | VARCHAR | Сезон: summer/winter/all |
| `route_type` | VARCHAR | Радиальный, линейный, кольцевой |
| `hazards` | TEXT[] | Опасности: ручьи, термальные, камнепад, животные |
| `equipment` | TEXT[] | Снаряжение: ботинки, палки, антизверь, аптечка |
| `registration_required` | BOOLEAN | Требуется ли регистрация МЧС |
| `mchs_registration_required` | BOOLEAN | МЧС обязательно |
| `mchs_phone` | VARCHAR | Телефон МЧС для консультации |
| `park_name` | VARCHAR | Природный парк (Налычево, Ключевской...) |
| `park_approval_url` | TEXT | Ссылка на согласование с дирекцией парка |
| `distance_km` | DECIMAL | Дистанция маршрута |
| `elevation_gain_m` | INT | Набор высоты |
| `duration_hours` | DECIMAL | Длительность |
| `flora_fauna` | TEXT | Флора и фауна на маршруте |
| `accessibility` | TEXT | Доступность (ОВЗ, транспорт) |
| `geometry` | JSONB | GeoJSON LineString трека |

### Данные (май 2026)

- 294 маршрута, 105 с богатыми данными из visitkamchatka.ru
- 100 с PDF паспортами
- 154 с обязательной регистрацией МЧС
- 0 с GPS-треками (geometry)
- 0 связей route_waypoints

> Статус: MVP завершён. Фаза: эволюция через агентов.
> Обновлено: Май 2026 | Агенты: `AGENTS.md`
