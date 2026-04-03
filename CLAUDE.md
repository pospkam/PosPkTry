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
| Deploy | Timeweb Cloud → `tourhab.ru` (App ID: 175269) |
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

## 8. ПРАВЛЕНИЕ ПЛАТФОРМЫ

**Структура:**
- **Собственник (Owner):** Единоличный владелец проекта. Имеет абсолютное право на **final override** любого решения агентов. Все инициативы проходят через админ-одобрение.
- **Board of Directors (10 AI агентов):** Совет директоров, заседает каждую сессию (Round 1-4 на `/hub/admin/board-meeting`)

| Агент | Роль | Ответственность |
|-------|------|-----------------|
| Admin | Администратор | Операционный директор, лидер совета, final enforcer |
| Legal | Юрист | Compliance, договоры, юридические риски |
| Security | Безопасность | Access audit, аномалии, cyberattacks |
| Hacker | Рост | Growth стратегия, конверсия, воронка |
| Rescue | SAR | SOS-мониторинг, погодные риски, экстренные протоколы |
| Eco | Экология | Нагрузка на природу, quiz-зоны, eco-score |
| Content | Аудит | Качество контента туров (описания, фото) |
| Quality | Качество | Отзывы, рейтинги, health операторов |
| Planning | Стратег | Прогнозы бронирований, сезонность, дефицит туров |
| Evo | Архитектор | Самоанализ системы, A/B-тесты, адаптация |

**Механика одобрений:**
- Агенты выдвигают **инициативы** на Round 4 (Proposals)
- Собственник (admin) **одобряет/отклоняет** в `/hub/admin/agents?tab=approvals`
- После одобрения можно **назначить исполнителя** (любого из 10 агентов) и отслеживать `execution_status` (assigned → in_progress → done/failed)

**Принцип:**
Агенты работают как **советники**, но **собственник всегда имеет финальное слово**. Это не демократия — это управляемая меритократия с единоличным лидером.

### Правила совета (обязательны для всех агентов)

1. **Только факты из БД** — не придумывать метрики. Нет данных → писать "нет данных".
2. **Своя зона** — каждый агент предлагает только из своей компетенции (Legal не делает growth, Hacker не пишет compliance).
3. **Одно предложение** — не предлагать 5 вещей сразу. Одно конкретное действие с данными.
4. **Без лести** — не хвалить собственника и коллег. Прямо и по делу.
5. **Исполнитель по матрице** — `code_change` → VibeCoder, `price_change` → Hacker, `sql_query_fix` → Evo и т.д.

### 5 раундов совещания (`/hub/admin/board-meeting`)

```
Round 1 — Отчёты 13 директоров (параллельно, только факты из БД)
Round 2 — 3 внешних наблюдателя (DeepSeek + Gemini + Scout-Innovator) + AgentMesh реакции
Round 3 — Консенсус (Claude Sonnet синтезирует всё)
Round 4 — Инициативы → agent_approvals (ждут одобрения собственника)
Round 5 — Дебаты: сторонники vs скептики по каждой инициативе
```

### Цикл эволюции (Scout → Prod)

```
intelligence-monitor (6ч) → agent_memory
Scout-Innovator (ежедневно 06:00 UTC) → синтез → agent_approvals
Совет → обсуждает, VibeCoder предлагает code_change
Собственник одобряет → cron/initiatives-execute (1ч)
VibeCoder → GitHub PR (AI пишет код) → Telegram уведомление
Собственник → review diff → Merge → автодеплой tourhab.ru
```

### Внешние агенты (не директора, не голосуют)

| Агент | Цвет | Роль |
|-------|------|------|
| DeepSeek Observer | #5B6EE1 | Социальные тренды, настроения вокруг Камчатки |
| Gemini Observer | #4285F4 | Рыночные тренды, конкуренты, спрос |
| Scout-Innovator | #7C3AED | AI-эволюция + travel-инновации → предложения для платформы |
| OperatorVerdict | — | 5 сторонников vs 5 скептиков → promote/hold/warn/suspend |

**Полный реестр агентов:** `AGENTS.md`

---

> Статус: MVP завершён. Фаза: эволюция через агентов.
> Обновлено: Апрель 2026 | Агенты: `AGENTS.md`
