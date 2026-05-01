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

Главная цель платформы — **безопасность туристов**. Ниже — единственный источник правды о таблицах с локациями.

### Иерархия сущностей

| Сущность | Таблица | Записей | Назначение |
|----------|---------|---------|------------|
| **Места** (master) | `agent_route_knowledge` | ~1400 | Единый реестр всех локаций Камчатки. Видимость (`is_visible`), координаты, описания, зоны, типы. **Это главная таблица.** |
| Профиль безопасности | `location_safety_profile` | ~1241 | Привязана к `agent_route_knowledge.id`. Capacity, hazards, difficulty, расстояние до медпомощи, связь. |
| Реалтайм-статус | `location_real_time_status` | ~1241 | Привязана к `agent_route_knowledge.id`. Открыто/закрыто, crowds, погода, алерты. |
| Маршруты (legacy) | `kamchatka_routes` | ~290 | Парсинг из источников. 162 привязаны к `agent_route_knowledge` через `route_id`. |
| Места (legacy) | `places` | ~88 | Старая таблица. Только 20 с координатами. **Не использовать для новых фичей.** |
| Туры операторов | `operator_tours` | ~20 | Продукты с ценой, слотами, бронированием. Привязаны к `partners.id`. |
| Доступность туров | `tour_availability` | ~42 | Слоты/даты для `operator_tours`. |
| AI-фото маршрутов | `ai_route_images` | ~225 | Сгенерированные/найденные фото для мест. |

### Правила работы с данными

- **Читать места** → `agent_route_knowledge` (с `is_visible = true` для публичного отображения)
- **Безопасность локации** → JOIN `location_safety_profile` ON `agent_route_id`
- **Реалтайм** → JOIN `location_real_time_status` ON `agent_route_id`
- **Туры для бронирования** → `operator_tours` + `tour_availability`
- **НЕ ИСПОЛЬЗОВАТЬ** `places` и `kamchatka_routes` напрямую для новых фичей — это legacy-источники, данные из которых уже перенесены в `agent_route_knowledge`
- **SELECT * FROM kamchatka_routes** — запрещён (см. секцию 4). Для публичного API → `v_kamchatka_routes_api`

### Статистика (актуально апрель-май 2026)

- 1043 видимых мест, 380 скрытых (дубли/без описания/без координат)
- Все видимые — с координатами и описаниями ≥300 символов
- 1241 место с профилем безопасности и реалтайм-статусом
- 20 туров от операторов (бронируемые)

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

> Статус: MVP завершён. Фаза: эволюция через агентов.
> Обновлено: Апрель 2026 | Агенты: `AGENTS.md`
