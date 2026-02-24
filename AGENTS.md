# Kamhub - Туристическая платформа Камчатки

## Обзор проекта

Kamhub - платформа для бронирования туров на Камчатке. Рыбалка, вулканы, термальные источники.

**Стек:** Next.js 15, TypeScript, Tailwind CSS, PostgreSQL (Timeweb Cloud)

**Продакшен:** https://pospkam-pospktry-c1f3.twc1.net

## Команды

```bash
npm run dev          # Запуск dev сервера (порт 3000)
npm run build        # Сборка проекта
npm test             # Запуск тестов (vitest)
npm run lint         # Проверка кода
npm run type-check   # Проверка типов
```

## Структура проекта

```
app/                 # Next.js App Router (ОСНОВНАЯ)
├── api/             # API endpoints
│   ├── tours/       # CRUD туров
│   ├── operator/    # Кабинет оператора
│   └── transfers/   # Трансферы
├── tours/           # Страницы туров
└── partner/         # Кабинет партнера

components/          # React компоненты (ОСНОВНАЯ)
lib/                 # Утилиты и конфигурация (ОСНОВНАЯ)
pillars/             # ⚠️ LEGACY - не используется, подлежит удалению
```

## ⚠️ Legacy: Pillars

**Статус:** Не используется в коде - подлежит удалению.

Директория `pillars/` содержит альтернативную архитектуру, которая **не импортируется** в основном коде. Дублирование:
- `analytics/` и `analytics-pillar/`
- `booking/` и `booking-pillar/`
- `discovery/` и `discovery-pillar/`
- `engagement/` и `engagement-pillar/`
- `partner/` и `partner-pillar/`
- `support/` и `support-pillar/`

**Рекомендация:** Удалить всю папку `pillars/` после проверки что она не используется.

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
GROQ_API_KEY=...
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
```

### AI Providers

Платформа поддерживает несколько AI-провайдеров для чата и поиска. Они используются в порядке приоритета:

1. **GROQ** - llama-3.1-70b-versatile
2. **DeepSeek** - deepseek-chat  
3. **Minimax** - abab6.5s-chat
4. **x.ai (Grok)** - grok-4

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
