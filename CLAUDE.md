# KamchatourHub — Claude Code Rules (CLAUDE.md)

## 1. ЗАДАЧА (Task)

Ты помогаешь разрабатывать **KamchatourHub** — туристическую платформу Камчатки.
Успех = рабочий, задеплоенный код на Timeweb Cloud без регрессий.
Без ролей типа "веди себя как сеньор". Просто делай задачу.

---

## 2. КОНТЕКСТ ПРОЕКТА (Context)

**Стек:**
- Next.js 15 (App Router), TypeScript strict, Tailwind CSS
- PostgreSQL — прямой SQL через `lib/database.ts` + `lib/db-pool.ts` (не Prisma)
- JWT auth в `lib/auth.ts`, middleware в `lib/auth/middleware.ts`
- 8+ хабов: tourist / operator / guide / transfer-operator / agent / admin / stay-provider / gear-provider
- Деплой: Timeweb Cloud → pospkam-pospktry-c1f3.twc1.net (App ID: 159529)
- CI/CD: GitHub → автодеплой при push в main

**Масштаб:**
- 94 страницы, 256 API routes, 119 компонентов
- 41 миграция (lib/database/migrations/ + migrations/), следующая: `028_...sql`
- 260 маршрутов в `agent_route_knowledge`, 14 категорий
- 11 коммерческих туров с системой выездов (tour_departures)

**Прочитай перед стартом:**
- `lib/database.ts` — PostgreSQL клиент (query wrapper)
- `lib/db-pool.ts` — экспортирует `{ pool }` (NAMED export)
- `lib/auth.ts` — verifyAuth, authorizeRole, authenticateUser
- `lib/auth/middleware.ts` — requireAuth, requireAdmin, requireRole, requireOperator
- `lib/types/db-rows.ts` — все интерфейсы строк БД

---

## 3. ДИЗАЙН-СИСТЕМА (Design System)

**Принцип:** Все стили через CSS-переменные. Никаких хардкод hex, никакого glassmorphism.

**Цветовые токены (globals.css):**

| Токен | Light | Dark | Назначение |
|-------|-------|------|------------|
| `--bg-primary` | `#F5F0EB` | `#0D1117` | Фон страницы |
| `--bg-card` | `#FFFFFF` | `#21262D` | Карточки |
| `--bg-hover` | `#F0ECE7` | `#30363D` | Hover-состояния |
| `--text-primary` | `#1A1714` | `#F0F6FC` | Заголовки, основной текст |
| `--text-secondary` | `#6B6560` | `#8B949E` | Подписи |
| `--text-muted` | `#9A9590` | `#484F58` | Плейсхолдеры |
| `--accent` | `#D44A0C` | `#E8734A` | CTA, активные состояния |
| `--ocean` | `#2568B0` | `#00A8CC` | Ссылки, иконки |
| `--success` | `#3FB950` | `#3FB950` | Eco, успех |
| `--warning` | `#D29922` | `#D29922` | Предупреждения |
| `--danger` | `#DC2626` | `#F85149` | SOS, ошибки |
| `--border` | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.08)` | Границы |

**Утилиты дизайн-системы (ds-классы):**
`ds-page`, `ds-card`, `ds-input`, `ds-btn`, `ds-btn-primary`, `ds-btn-secondary`, `ds-btn-danger`, `ds-section`, `ds-badge`, `ds-h1`, `ds-h2`, `ds-label`, `ds-skeleton`

**Типографика:**
- Заголовки: `Playfair Display` (var: `--font-playfair`)
- Основной текст: `Outfit` (var: `--font-outfit`, default sans)

**Темы:**
- Светлая (default): `data-theme="light"`
- Темная: `data-theme="dark"`
- Переключатель в хедере
- Tailwind: `darkMode: 'class'`

**Запрещено в стилях:**
- `bg-white/10`, `text-white`, `backdrop-blur-*` — используй CSS-переменные
- `text-cyber-cyan`, `text-premium-gold`, `bg-premium-*` — устаревшие токены
- `font-black` — используй `font-bold`
- `rounded-2xl` — используй `rounded-lg`
- Хардкод hex (#2C1810, #CD853F, #00D4FF и т.д.) — только CSS vars

**Маппинг замен (при миграции):**
```
bg-white/10 → bg-[var(--bg-card)]
border-white/20 → border-[var(--border)]
text-white → text-[var(--text-primary)]
text-white/70 → text-[var(--text-muted)]
text-premium-gold → text-[var(--accent)]
bg-cyber-cyan → bg-[var(--accent)]
backdrop-blur-* → удалить
```

**Компоненты:**
- Хедер: `KH` логотип + иконка темы + ЛК. БЕЗ поиска.
- Поиск — только через иконку -> модальное окно
- Навбар (mobile, pill): Дом / Карта / Избранное / ЛК / СОС
- Футер — только desktop
- Homepage: `components/homepage/` (Hero, BentoGrid, LiveFeed, ActivityCircles, CTASection, Marquee, Reveal)

---

## 4. ПРАВИЛА КОДА (Rules)

**Обязательно:**
- TypeScript строгий, без `any` — использовать `unknown` + type guards
- Все API routes с валидацией входных данных (Zod)
- JWT проверка на каждом защищенном маршруте
- SQL только параметризованный: `$1, $2` — никогда конкатенация
- Обработка ошибок с понятными сообщениями на русском
- НИКАКИХ ЭМОДЗИ в коде, UI, console.log — только Lucide React иконки или текст

**Запрещено:**
- `console.log` в продакшн-коде
- Хардкод строк подключения и секретов — только через `.env.local`
- Изменение схемы БД без миграции (следующая: `028_...sql`)
- Читать `kamchatka_routes` напрямую — только через `v_kamchatka_routes_api`
- `import pool from` — только `import { pool } from '@/lib/db-pool'` (named export)

**Стиль:**
- Компоненты в `components/`, атомарно
- Хуки в `hooks/`
- Утилиты в `lib/`
- Сервисы в `lib/services/`
- Типы БД в `lib/types/db-rows.ts`
- Именование: `kebab-case` для файлов, `PascalCase` для компонентов
- Server/Client split: `page.tsx` (server, metadata) + `_*Client.tsx` (client, логика)

---

## 5. ПРОЦЕСС (Plan)

**Перед тем как писать код:**
1. Назови 3 правила из этого файла, которые важны для текущей задачи
2. Дай план: что изменяешь, какие файлы затронуты, возможные риски

**Не начинай без плана если задача затрагивает:**
- Схему БД
- Логику авторизации
- API endpoints
- Компоненты с бизнес-логикой бронирований

---

## 6. УТОЧНЕНИЯ (Conversation)

Если задача неоднозначна — **НЕ начинай выполнение**.
Задай уточняющие вопросы:
- Какая роль пользователя затронута?
- Это новый функционал или правка существующего?
- Есть ли пример желаемого поведения?

---

## 7. ВЫРАВНИВАНИЕ (Alignment)

Начинай работу только после того, как план согласован.
Если собираешься нарушить одно из правил выше — **остановись и скажи об этом**.

---

## 8. ДЕПЛОЙ (Deploy)

- Проверь: `npm run build` без ошибок
- TypeScript: `npx tsc --noEmit` — 0 ошибок
- Миграции: через psql или скрипт
- Переменные окружения заданы на Timeweb Cloud
- Push в `main` -> автодеплой через GitHub Actions
- Build config: `ignoreBuildErrors=true` на Timeweb (Docker), локально проверяем `tsc --noEmit`

### Timeweb MCP Server

Для управления деплоем через AI-агентов используется **Timeweb MCP Server**:
- Токен: `TIMEWEB_TOKEN` (в `.cursor/mcp.json` или `.vscode/mcp.json`, **не** в `.env.local`)
- Команды: `create_timeweb_app`, `get_deploy_settings`, `add_vcs_provider`

### MCP Server (API маршрутов)

Платформа предоставляет собственный MCP Server: `app/api/mcp/route.ts` -> `/api/mcp`
- Протокол: JSON-RPC 2.0 (Streamable HTTP)
- 4 инструмента: `search_routes`, `get_route_details`, `list_categories`, `get_tours`
- Данные: 260 маршрутов из `agent_route_knowledge`
- Публичный endpoint (без авторизации)

---

## 9. AI-СИСТЕМА

**Водопад провайдеров** (`lib/ai/providers.ts`):
1. Timeweb Cloud AI Agent (deepseek-chat) — `TIMEWEB_TOKEN` + `TIMEWEB_AI_AGENT_ID`
2. OpenRouter (claude-3.5-sonnet) — `OPENROUTER_API_KEY`
3. DeepSeek (deepseek-chat) — `DEEPSEEK_API_KEY`
4. Minimax (MiniMax-Text-01) — `MINIMAX_API_KEY`
5. xAI Grok (grok-4) — `XAI_API_KEY`
6. Anthropic Claude (claude-opus-4-6) — `ANTHROPIC_API_KEY`

Все провайдеры: temperature 0.4, max_tokens 800. Если все 6 недоступны — fallback текст.

**RAG:** `agent_route_knowledge` (260 маршрутов), fallback `v_kamchatka_routes_api`

---

## 10. TELEGRAM BOT (@KuzmichKam_bot)

- Сервис: `lib/notifications/telegram.ts` -> `telegramService`
- Webhook: `POST /api/telegram/webhook` (валидация через `X-Telegram-Bot-Api-Secret-Token`)
- Регистрация: `POST /api/telegram/setup-webhook` (admin-only)
- Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_FISHING_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
- Функции: уведомления о бронированиях, подтверждение/отмена через inline кнопки

---

## 11. МАРШРУТЫ (Routes Knowledge)

**Текущее состояние БД:**
- `agent_route_knowledge`: **260 маршрутов**, 14 категорий
- Источники: mestechkokam.ru, zimaletokamchatka.ru, kamchatintour.ru

**3-уровневая архитектура бронирований:**
- `kamchatka_routes` -> физические локации (260)
- `tours` -> коммерческие программы (11, route_id FK)
- `tour_departures` -> конкретные даты выездов (migration 026)
- `bookings` -> бронирования (departure_id FK, migration 027)

**Workflow обновления базы знаний:**
```bash
npm run ai:scrape-unique:direct     # скрапинг (без AI)
npm run ai:setup-agent-rag          # -> crew/knowledge-base.json
python3 crew/agent-trainer.py       # -> конфиги агентов
```

**Дедупликация** — два уровня:
1. По `route_dedupe_key` (hostname:slug)
2. По нормализованному заголовку (lowercase + е->е + strip non-alnum)

---

## 12. ЧТО НЕ ТРОГАТЬ

- `middleware.ts` — Edge middleware (JWT + rate-limit)
- `lib/auth.ts` — JWT логика
- `app/api/payments/` — CloudPayments webhook
- `app/api/safety/sos` — SOS (изменения -> staging, не prod)
- Существующие миграции 001-027 — только добавлять новые

---

> Статус: MVP реализован, полировка UI + подключение реальных данных.
> Обновлено: Март 2026
