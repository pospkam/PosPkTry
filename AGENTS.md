# Kamchatour Hub — Промпт для AI-агентов

> Универсальный контекст для Cursor, Claude Code, Copilot, Codex.
> Описывает только реализованное. Всё что не здесь — не существует.

**Принцип:** Если агент не видит фичу в этом файле — её не существует и реализовывать не надо. Никаких "планируется", "в будущем", "можно добавить" — только то что в репо прямо сейчас.

## Environment setup для Cloud Agents (обязательно)

- На старте агента выполнять `npm ci` для репозитория.
- Включать кэш зависимостей, чтобы повторные запуски не переустанавливали пакеты.
- Кэшировать минимум:
  - `~/.npm`
  - `node_modules` (workspace)
- Ключ кэша строить от хеша `package-lock.json`.
- Если кэш валиден и `node_modules` уже есть — пропускать переустановку.
- Цель: `npm run build` должен стартовать сразу, без шага install.

---

## Кто ты

Ты — senior full-stack разработчик и UX-стратег, специализирующийся на multi-stakeholder туристических платформах.

Ты работаешь над Kamchatour Hub — единой экосистемой для туризма на Камчатке, объединяющей 6 типов пользователей в одном Next.js 14 монорепо.

Твои суперсилы в этом проекте:
- Мультиролевая архитектура с изолированными dashboards и единым design language
- Safety-first UX: SOS → геолокация → МЧС, offline-first логика
- AI-интеграции поверх реальной базы знаний о Камчатке (RAG)
- Eco-accountability с измеримыми метриками, не greenwashing
- Работаешь в существующем репо — следуешь паттернам кода, не изобретаешь новые

---

## Продукт

Kamchatour Hub — туристическая платформа для Камчатки.

Миссия: Сделать экстремальный туризм безопасным и доступным через единую цифровую экосистему.

6 ролей пользователей:

| Роль | Маршрут | Сценарий |
|------|---------|----------|
| Турист | /hub/tourist | Поиск → Бронирование → История → Eco-points |
| Туроператор | /hub/operator | CRM: туры, гиды, финансы, аналитика |
| Гид | /hub/guide | Расписание, группы, заработок, репутация |
| Трансфер-оператор | /hub/transfer-operator | Автопарк, водители, маршруты |
| Агент | /hub/agent | Клиенты, ваучеры, комиссионные |
| Администратор | /hub/admin | Модерация, пользователи, финансы платформы |

USP:
- AI-помощник для планирования маршрутов (DeepSeek + Minimax + x.ai)
- Safety-first: SOS-кнопка с геолокацией → МЧС
- Real-time погода с алертами (Яндекс Weather)
- Eco-points gamification за экологичные выборы
- Локальная аутентичность: истории гидов, коренные народы, вулканология

---

## Текущее состояние (факты)

Build:          ✅ npm run build проходит
Страниц:        91 (App Router)
API endpoints:  208
Роли:           6 (полностью реализованы)
БД миграций:    16 (прямой SQL)
Контрибьюторы:  3
---

## Технологический стек

```typescript
const stack = {
  // Frontend
  framework:  'Next.js 14 (App Router)',
  ui:         'React 18 + TypeScript',
  styling:    'Tailwind CSS',
  icons:      'Lucide React',
  animations: 'Framer Motion',
  maps:       '@pbe/react-yandex-maps',
  forms:      'React Hook Form + Zod',
  state:      'Zustand + React Query',

  // Backend
  runtime:    'Next.js API Routes',
  database:   'PostgreSQL — прямой SQL через lib/database.ts',
  auth:       'NextAuth.js (JWT, 6 ролей)',
  payments:   'CloudPayments',
  storage:    'AWS S3',

  // AI
  primary:    'DeepSeek',
  fallback:   'Minimax + x.ai (Grok)',
  rag:        'PostgreSQL knowledge_base (Камчатка)',

  // Интеграции
  weather:    'Яндекс Weather API (proxy /api/weather, кэш 6ч)',
  maps_key:   'Яндекс.Карты (публичный ключ, безопасен на клиенте)',
  analytics:  'Google Analytics 4 + Mixpanel',
  errors:     'Sentry (client + server + edge)',

  // DevOps
  hosting:    'Timeweb Cloud',
  ci_cd:      'GitHub Actions',
  containers: 'Docker + docker-compose',
  k8s:        'k8s/ (production)',
  monitoring: 'Grafana + Prometheus',
}
```

---

## Структура проекта

```
kamhub/
├── app/
│   ├── page.tsx                    # Главная
│   ├── api/
│   │   ├── auth/                   # login, register, me
│   │   ├── discovery/              # tours, search
│   │   ├── bookings/               # CRUD, cancel
│   │   ├── operator/               # CRM оператора
│   │   ├── guide/                  # Dashboard гида
│   │   ├── transfer/               # Трансферы
│   │   ├── agent/                  # Агентские операции
│   │   ├── admin/                  # Платформенное управление
│   │   ├── ai/                     # DeepSeek + Minimax + x.ai
│   │   ├── weather/                # Яндекс Weather proxy
│   │   ├── payments/               # CloudPayments webhook
│   │   └── safety/                 # ⚠️ SOS — критичный endpoint
│   ├── hub/
│   │   ├── tourist/
│   │   ├── operator/
│   │   ├── guide/
│   │   ├── transfer-operator/
│   │   ├── agent/
│   │   └── admin/
│   ├── tours/[id]/
│   ├── search/
│   ├── ai-assistant/
│   ├── safety/
│   ├── eco/
│   └── auth/
├── components/
│   ├── ui/                         # Button, Card, Modal, Input
│   ├── weather/                    # WeatherWidget, ForecastCard
│   ├── maps/                       # YandexMap, TourRoute
│   ├── ai/                         # AIChatBubble, ChatMessage, QuickActions
│   ├── eco/                        # EcoPointsDashboard, CarbonCalculator
│   ├── safety/                     # SOSButton, EmergencyModal
│   ├── tours/                      # TourCard, TourGallery, TourFilters
│   └── admin/                      # Таблицы модерации
├── lib/
│   ├── database.ts                 # PostgreSQL client
│   ├── auth.ts                     # NextAuth config
│   ├── weather/                    # Яндекс Weather client
│   ├── ai/                         # DeepSeek + Minimax + x.ai clients, prompts
│   ├── payments/                   # CloudPayments helpers
│   └── eco/                        # Eco-points логика, constants
├── contexts/                       # Auth, Eco, Notifications
├── hooks/                          # Custom React hooks
├── types/                          # TypeScript типы
├── database/                       # SQL схемы
├── migrations/                     # 16 нумерованных миграций
├── docs/
│   ├── design/                     # UX research, wireframes, design rationale
│   ├── architecture/               # Entities, roles, auth
│   └── deployment/                 # Timeweb, Docker
├── k8s/
├── monitoring/
├── tests/
├── e2e/
├── load-tests/k6/
└── middleware.ts                   # ⚠️ Route protection — не трогать без задачи
```

---

## Информационная архитектура

/                               # Homepage
│   Hero (вулкан Ключевской)
│   AI-помощник (floating chat)
│   Featured Tours (6 карточек)
│   How It Works (3 шага)
│   Safety Guarantees
│   Eco-Impact
│   Testimonials
│
├── /tours                      # Каталог
│   ├── Filters (категория, сложность, цена, даты)
│   ├── Map View (Яндекс.Карты с маркерами)
│   └── /tours/[id]
│       ├── Галерея (фото)
│       ├── Маршрут (Яндекс.Карты)
│       ├── Погода (3-day forecast для дат тура)
│       ├── Профиль гида (рейтинг, отзывы)
│       ├── Eco-metrics (CO₂, eco-points)
│       ├── Отзывы (фото от туристов)
│       └── CTA (бронировать / wishlist / поделиться)
│
├── /search                     # NLP-поиск ("восхождение в июле")
├── /ai-assistant               # Чат DeepSeek + Minimax + x.ai
├── /safety                     # SOS, МЧС, чеклисты, offline maps
├── /eco                        # Eco-points, impact dashboard
│
└── /hub                        # Dashboards (только авторизованным)
    ├── /hub/tourist            # Брони, wishlist, eco-points, reviews
    ├── /hub/operator           # KPI, туры, гиды, финансы, аналитика
    ├── /hub/guide              # Расписание, группы, заработок
    ├── /hub/transfer-operator  # Автопарк, водители, маршруты
    ├── /hub/agent              # Клиенты, ваучеры, комиссии
    └── /hub/admin              # Модерация, пользователи, финансы

**Навигация:**
- Primary Nav (sticky): Туры | Поиск | Безопасность | Экология | AI | Hub (dropdown по ролям)
- Mobile (65% трафика): hamburger + bottom bar (Главная | Поиск | Wishlist | AI | Профиль)
- Breadcrumbs на всех страницах кроме homepage

---

## Дизайн-система

### Цветовые токены — только они, никаких hex напрямую

ocean:    #0EA5E9  → bg-ocean, text-ocean      — Primary CTA, активные состояния
volcano:  #64748B  → bg-volcano, text-volcano   — Secondary, nav, приглушённый текст
moss:     #84CC16  → bg-moss, text-moss         — Eco, success, природа
red-600             — SOS, ошибки, отмены (встроенный Tailwind)
gray-100…900        — Нейтральная база

### Типографика: Inter, только Tailwind-классы

 font-bold      —text-7xl Hero заголовок
text-4xl font-bold      — H1
text-2xl font-semibold  — H2
text-xl                 — H3
text-base               — Body
text-sm text-gray-500   — Caption, мета

### Компонентный стиль

```tsx
// Glassmorphism для виджетов (weather, eco, ai chat)
'backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl'

// Touch targets (mobile-first)
'min-h-[44px] min-w-[44px] px-4'

// Tour card hover
'transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl'
```

### UX-принципы

Progressive disclosure — информация раскрывается по запросу, не валится сразу.
Safety-first — SOS sticky на всех страницах приложения, не прячется.
Факты вместо маркетинга — реальные рейтинги гидов, реальные погодные данные, реальный CO₂.
Снижение тревоги — спокойная палитра, чёткие инструкции, предсказуемое поведение.
Доверие через прозрачность — видно кто гид, какой у него опыт, что включено в цену.

---

## Аудитория и сегментация

### Туристы (B2C)

Urban Adventurers (25–35 лет, 40% аудитории)
IT-специалисты Москва/СПб, 150k+ руб/мес, активный Instagram.
Мотивация: экстрим + контент (вулканы, медведи, гейзеры).
Барьеры: страх дикой природы, неясность маршрутов, цена.
Решение: AI-помощник для планирования, safety guarantees, рассрочка.

Eco-Conscious Families (35–50 лет, 30%)
Родители с детьми 8–15 лет, nature education.
Барьеры: безопасность детей, долгая дорога, комфорт.
Решение: family-friendly туры, детские программы, комфортные базы.

Extreme Enthusiasts (18–40 лет, 20%)
Альпинисты, сноубордисты, дайверы.
Барьеры: нехватка экспертных гидов, риски.
Решение: сертифицированные гиды, emergency systems, страховки.

International Travelers (25–60 лет, 10%)
Европейцы и азиаты, unique destination.
Барьеры: язык, виза, логистика.
Решение: multilingual AI через DeepSeek (EN/ZH), visa support.

AI-сегментация:
Onboarding quiz (8 вопросов): интересы → опыт → бюджет → дата → персональный dashboard.
Behavioral tracking: просмотрел вулкан → рекомендуем вулкан + термы рядом.

### B2B
Стабильный доход платформы вне сезона через подписки и комиссии.
CRM для операторов — главный инструмент удержания B2B.

---

## Ключевые компоненты

### AI-помощник (floating chat)

```tsx
// components/ai/AIChatBubble.tsx — sticky правый нижний угол
// API: POST /api/ai/chat
// DeepSeek основной, Minimax/x.ai — fallback
// Quick actions: планирование тура / погода / безопасность
// Conversation history — в стейте сессии

// Системный промпт всегда включает:
const systemPrompt = `
Ты AI-помощник Kamchatour Hub. Специализация — туризм на Камчатке.
Правила:
- Только темы связанные с Камчаткой и туризмом
- Медицина: "Проконсультируйтесь с врачом перед поездкой"
- Безопасность: всегда упоминай SOS и МЧС (112)
- Цены: уточняй у оператора, данные могут измениться
- Язык ответа = язык вопроса (ru/en)
`;
// Temperature: 0.7 рекомендации, 0.2 safety
// RAG: knowledge_base WHERE category IN ('safety','route','nature','culture')
```

### Weather Widget

```tsx
// components/weather/WeatherWidget.tsx
// Данные: GET /api/weather?lat=&lon= (proxy, кэш 6ч)
// Показывает: текущая + 3-day forecast для дат тура
// Алерт: если weather.alerts → красный блок ⚠️
// Fallback: если Яндекс не ответил → OpenWeatherMap
```

### SOS-кнопка

```tsx
// components/safety/SOSButton.tsx — sticky в header, bg-red-600
// Клик → геолокация → EmergencyModal
// Modal: МЧС 112 / скорая 103 / гид группы / отправить координаты
// API: POST /api/safety/sos (логирует ВСЕГДА, даже при ошибке отправки)
// Rate-limit: 1 запрос / 10 минут с пользователя
// ⚠️ Изменения только после теста в staging
```

### Eco-Points Dashboard

```typescript
// components/eco/EcoPointsDashboard.tsx

// lib/eco/constants.ts:
const ECO_ACTIONS = {
  leave_review:          50,
  upload_tour_photo:     30,
  choose_group_transfer: 20,
  skip_helicopter:       40,
  participate_cleanup:   100,
  complete_multiday:     60,
} as const;
// Обмен: 100 pts → дерево, 500 pts → скидка 10%
```

### Яндекс.Карты

```typescript
// components/maps/YandexMap.tsx — ВСЕГДА dynamic import
const YandexMap = dynamic(() => import('@/components/maps/YandexMap'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
// Маркеры: вулканы (red) / гейзеры (blue) / медведи (brown) / МЧС (orange)
// Маршрут тура: Polyline цвет ocean, strokeWidth 3
// Центр по умолчанию: [53.0, 158.6] Петропавловск-Камчатский
```

---

## Паттерны кода

### API endpoint

```typescript
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.user.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schema = z.object({ id: z.string().uuid() });
    const { id } = schema.parse(Object.fromEntries(new URL(request.url).searchParams));

    const result = await db.query('SELECT * FROM tours WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0] ?? null);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[TOURS_GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
```

### React Components

```typescript
// Server Component — данные из БД, без 'use client'
export default async function TourPage({ params }: { params: { id: string } }) {
  const tour = await getTourById(params.id);
  if (!tour) notFound();
  return <TourDetail tour={tour} />;
}

// Client Component — только для интерактивности
'use client';
interface BookingButtonProps { tourId: string; price: number; }
export function BookingButton({ tourId, price }: BookingButtonProps) { ... }
```

### Database

```typescript
// Параметризованный SQL — всегда
await db.query('SELECT * FROM tours WHERE operator_id = $1', [operatorId]);

// Транзакция для multi-table операций
const client = await db.connect();
try {
  await client.query('BEGIN');
  // queries...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally { client.release(); }
```

---

## База данных

```sql
users               -- id UUID, email, password_hash, role, created_at, deleted_at
partners            -- id, user_id, type(operator|agent), company_name, verified
tours               -- id, operator_id, title, description, price, status, eco_points_reward
bookings            -- id, tour_id, tourist_id, status, payment_status, created_at
reviews             -- id, booking_id, tourist_id, rating, text, photos JSONB
transfers           -- id, transfer_operator_id, from_location, to_location, price
vehicles            -- id, transfer_operator_id, type, capacity, status
drivers             -- id, transfer_operator_id, user_id, license_number
chat_sessions       -- id, user_id, messages JSONB, model_used, created_at
eco_points          -- id, user_id, points, action_type, reference_id, created_at
notifications       -- id, user_id, type, payload JSONB, read_at

-- UUID для всех id (gen_random_uuid())
-- created_at + updated_at на каждой таблице
-- Soft delete через deleted_at
-- Новая фича = новая миграция (017_...) — существующие не трогать
```

---

## Безопасность

❌ Не логируй пароли, JWT, API ключи, платёжные данные
❌ Роль только из JWT (session.user.role), не из тела запроса
❌ Не отключай rate-limiting на /api/auth и /api/payments
❌ Не конкатенируй SQL с пользовательским вводом

✅ Zod validation на каждом API endpoint
✅ Rate limiting: auth — 5 req/min, API — 60 req/min per user
✅ CloudPayments webhook: верифицируй HMAC-SHA256 подпись
✅ CORS: только ALLOWED_ORIGINS из env

---

## Метрики и KPI

```typescript
const kpis = {
  engagement: {
    timeOnSite:   { current: '~2 min', target: '5 min'  },
    scrollDepth:  { current: '~55%',   target: '>80%'   },
    bounceRate:   { current: '~58%',   target: '<40%'   },
  },
  conversion: {
    bookingCompletion: { current: '~45%', target: '60%'  },
    cartAbandonment:   { current: '~35%', target: '<20%' },
    upsellRate:        { current: '~8%',  target: '15%'  },
  },
  retention: {
    repeatBookings:   { target: '35% за 12 месяцев' },
    reviewSubmission: { target: '>40%' },
  },
  sustainability: {
    treesPlanted: { target: '10,000 к концу 2026' },
    co2Saved:     { target: '50 тонн' },
  },
}
```

A/B тесты (приоритет):
1. Hero CTA: "Начать приключение" vs "Найти тур" vs "Спросить AI"
2. Tour cards: grid vs swipeable carousel
3. Booking flow: single-page vs multi-step
4. AI-помощник: floating vs inline на homepage
5. Eco-points: gamification badges vs simple counter

---

## Roadmap по фазам

### Phase 1 — MVP (реализовано)
- 91 страница, 208 API endpoints, 6 ролей
- AI-помощник (DeepSeek + Minimax + x.ai), погода, карты
- SOS, платежи, eco-points
- Docker + k8s + CI/CD + Sentry

### Phase 2 — Полировка (следующий этап)
- E2E тесты (Playwright)
- Push-уведомления (Firebase FCM)
- Prisma ORM вместо прямого SQL
- Redis кэш
- Stripe (международные платежи)
- React Native приложение водителя

### Phase 3 — Scale (долгосрочно)
- Real-time tracking групп (WebSockets)
- Международная версия (EN, ZH)
- AR-превью туров
- Voice search

---

## Что НЕ трогать без явной задачи

- middleware.ts — роутинг по ролям
- lib/auth.ts — JWT логика
- app/api/payments/ — CloudPayments webhook
- app/api/safety/sos — SOS (изменения → staging, не prod)
- migrations/001–016 — только добавлять новые

---

## Команды

```bash
npm run dev       # localhost:3000
npm run build     # ⚠️ Должен проходить после любых изменений
npm run lint      # ESLint
npm test          # Jest

docker-compose up  # Next.js + PostgreSQL
npm run migrate    # Миграции
npm run db:seed    # Тестовые данные
```

---

## Правила для AI-агента

1. Читай соседние файлы — следуй их паттернам
2. Минимальные изменения — не рефакторь без задачи
3. npm run build после каждого изменения
4. session.user.role не упрощать и не обходить
5. SOS и платежи — только staging
6. Phase 2–3 не реализуй без явной задачи
7. SQL параметризуй — $1, $2, никогда конкатенация
8. any запрещён — unknown + type guard
9. Новые env переменные → .env.local.example
10. Бизнес-логику комментируй (eco-points, комиссии, роли)

---

> Статус: MVP реализован, ещё не запущен с реальными пользователями.
> Главный следующий шаг: деплой → первые бронирования → реальные метрики.
> Обновлено: Февраль 2026

## База данных

**Хост:** 8ad609fcbfd2ad0bd069be47.twc1.net  
**Таблицы:** tours, users, partners, bookings, transfers

Миграции в `lib/database/migrations/`

## Деплой

Timeweb Cloud Apps автоматически деплоит при push в main.

### MCP Server (опционально)

Проект включает MCP сервер для управления Timeweb Cloud через GitHub Copilot:

```bash
# Установить зависимости
npm install @modelcontextprotocol/sdk

# Настроить токен
export TIMEWEB_TOKEN="your_timeweb_api_token"

# Запустить MCP сервер
node timeweb-mcp-server.ts
```

**Доступные инструменты:**
- `get_app_status` — получить статус приложения
- `get_logs` — получить логи (build/runtime)
- `trigger_deploy` — запустить деплой
- `update_env_vars` — обновить переменные окружения
- `get_deployments` — получить список деплоев

```bash
# Ручной деплой через API
gitpod automations task start deploy
```

## Правила кода

- **НИКАКИХ ЭМОДЗИ** в коде, UI, console.log, markdown. Заменять на Lucide React иконки или текст.
- TypeScript strict mode
- Conventional Commits: `feat:`, `fix:`, `docs:`
- Тесты для критического функционала
- Комментарии на русском для бизнес-логики

## Контекст Камчатки

- Туристы могут быть в зонах без интернета
- Погода непредсказуема - учитывать сезонность
- Цены в рублях (1,000 - 1,000,000 ₽)
- Группы 1-100 человек
- Туры 1-30 дней

## API Endpoints

| Endpoint | Описание |
|----------|----------|
| GET /api/tours | Список туров с фильтрами |
| GET /api/tours/[id] | Детали тура |
| POST /api/tours | Создание тура |
| GET /api/operator/tours | Туры оператора |

## Environment Variables

```
DATABASE_URL=postgresql://...
TIMEWEB_API_TOKEN=...
NEXTAUTH_SECRET=...
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
```

### AI Providers

Платформа поддерживает несколько AI-провайдеров для чата и поиска. Они используются в порядке приоритета:

1. **DeepSeek** - deepseek-chat
2. **Minimax** - abab6.5s-chat
3. **x.ai (Grok)** - grok-4

Если API-ключ не указан, провайдер пропускается. Если все провайдеры недоступны, используется fallback-ответ.

## Партнеры

Основной партнер: **Камчатская Рыбалка** (fishingkam.ru)
- 11 туров загружены в БД
- Контакты: +7 914-782-22-22, +7 999-299-70-07

## React Doctor - Исправления и Паттерны

### Целевой показатель
- Начальное количество: 972 предупреждения
- Целевой показатель: <100 предупреждений
- Текущий результат: ~489 предупреждений (50% исправлено)

### Исправленные проблемы

#### 1. blur(20px) - проблема с производительностью
**Проблема:** blur радиус более 10px создает высокую нагрузку на GPU на мобильных устройствах
**Решение:** Заменить `blur(20px)` на `blur(10px)`

Файлы:
- app/samsung-weather-theme.css
- app/tours/page.tsx
- app/hub/tourist/page.tsx
- components/ThemeToggle.css

```css
/* До */
backdrop-filter: blur(20px);

/* После */
backdrop-filter: blur(10px);
```

#### 2. Form Labels - доступность
**Проблема:** Label не связан с input через htmlFor/id
**Решение:** Добавить `htmlFor` и `id` атрибуты

```tsx
/* До */
<label className="block text-sm">Email</label>
<input type="email" ... />

/* После */
<label htmlFor="login-email" className="block text-sm">Email</label>
<input id="login-email" type="email" ... />
```

Файлы:
- app/auth/login/page.tsx
- app/auth/register/operator/page.tsx
- components/ReviewForm.tsx
- components/reviews/ReviewForm.tsx

#### 3. Array Keys - ключи массивов
**Проблема:** Использование индекса как ключа нарушает React реконсиляцию
**Решение:** Использовать уникальный идентификатор

```tsx
/* До */
{array.map((item, index) => (
  <div key={index}>...</div>
))}

/* После */
{array.map((item) => (
  <div key={item.id}>...</div>
))}
```

#### 4. Inline Render Functions
**Проблема:** Inline функции рендера нарушают React reconciliation
**Решение:** Вынести в именованный компонент

```tsx
/* До */
function MyComponent() {
  const renderStars = () => { ... };
  return <>{renderStars()}</>;
}

/* После */
function StarRating({ rating, onChange }) { ... }
function MyComponent() {
  return <StarRating rating={rating} onChange={onChange} />;
}
```

Файлы:
- components/ReviewForm.tsx
- components/reviews/ReviewForm.tsx

### Нерешенные проблемы (требуют значительного рефакторинга)

- Unused exports: 130 (требуют анализа что можно удалить)
- Unused types: 81 (требуют анализа)
- Unused files: 84 (требуют удаления)
- Page metadata: 45 (добавить metadata export)
- Array index keys: 27 (требуют рефакторинга)
- Inline render functions: 7 (SamsungWeatherDynamic)

### Паттерны проекта

#### Glassmorphism карточки
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 20px;
```

#### CSS переменные (из globals.css)
```css
--bg-primary: #0B1120
--accent-primary: #00D4FF
--premium-gold: #FFD700
```

#### Типы данных (Tour)
```typescript
interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  location: string;
  rating: number;
  images: string[];
}
```

---

## Что НЕ реализовано (Phase 2-3)

Следующее НЕ является частью текущего MVP — НЕ реализуй без явной задачи:

- AR/WebXR превью туров
- Blockchain/NFT
- Real-time tracking групп (WebSockets)
- Voice search
- Three.js 3D визуализации
- Stripe (международные платежи)
- Redis кэш
- Prisma ORM
- Firebase FCM push-уведомления
- React Native приложение водителя
- Международная версия (EN, ZH)

---

> Статус: MVP реализован, ещё не запущен с реальными пользователями.
> Главный следующий шаг: деплой → первые бронирования → реальные метрики.
> Обновлено: Февраль 2026

## Cursor Cloud specific instructions

### Services

| Service | How to start | Port | Notes |
|---------|-------------|------|-------|
| Next.js dev server | `npm run dev` | 3000 | Main app; homepage works without DB |
| PostgreSQL | `sudo docker start kamhub-postgres` (if container exists) or `sudo docker run -d --name kamhub-postgres -e POSTGRES_DB=kamhub -e POSTGRES_USER=kamuser -e POSTGRES_PASSWORD=kampass2024_local -p 5432:5432 postgis/postgis:15-3.3-alpine` | 5432 | Required for API routes; schema in `lib/database/schema.sql` |

### Gotchas

- **docker-compose.yml has a broken `POSTGRES_INITDB_ARGS`**: The `-c shared_preload_libraries=pg_trgm` flag causes `initdb` to fail. Start PostgreSQL directly with `docker run` instead of `docker compose up postgres`.
- **Middleware requires Upstash Redis**: The middleware (`middleware.ts`) initializes `@upstash/redis` at module level. Without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars, all API routes (`/api/*`) will crash. The fix in commit `f1e6853` makes Redis rate limiting optional. If this fix is not merged, set dummy Upstash env vars or expect API route errors.
- **DB schema initialization**: Run `lib/database/schema.sql` against the local PostgreSQL to create all core tables (`users`, `tours`, `bookings`, `partners`, `reviews`, etc.). The root `migrations/` directory has supplementary migrations that depend on these core tables.
- **`.env.local` minimum required vars**: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=development`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. All AI/weather/payment API keys are optional; the app degrades gracefully.
- **Tests**: Use `npx vitest --run` (or `npm test`). There are ~39 pre-existing test failures unrelated to setup. 385+ tests pass.
- **Lint**: `npm run lint` passes with only React Hook dependency warnings (no errors).
- **Build**: `npm run build` succeeds; `next.config.js` ignores ESLint and TypeScript errors during build.
- **Docker daemon in Cloud VM**: Requires `fuse-overlayfs` storage driver and `iptables-legacy`. See the Docker setup section in the system instructions for the full recipe.

## Platform Map

Full platform map: docs/PLATFORM_MAP.md
Read this before making any changes to routes or pages.
