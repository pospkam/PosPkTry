# Kamhub — Туристическая платформа Камчатки 🏔️

> Платформа для бронирования туров, трансферов и жилья на Камчатке

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-semantic%20search-orange)](#)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![React Doctor](https://img.shields.io/badge/React%20Doctor-99%2F100-brightgreen)](https://react.doctor)

**Production:** https://pospk-kamhub-c8e0.twc1.net

---

## 📋 Описание

**Kamhub** — туристическая платформа Камчатки для бронирования:

- 🎣 Рыбалка на лосося (чавыча, кижуч, нерка)
- 🌋 Восхождения на вулканы
- ♨️ Горячие источники
- 🚗 Трансферы и аренда авто
- 🏠 Жильё (гостиницы, апартаменты, коттеджи)
- 🛒 Магазин снаряжения и сувениров

### Ключевые фичи
- 🤖 Роле-ориентированный AI-ассистент с памятью переписки (DeepSeek, Minimax, x.ai)
- 🔍 Семантический поиск туров на основе pgvector (RAG)
- 🖼️ Автотеггинг фото туров через Claude Vision
- 🎯 Система персональных рекомендаций (3 стратегии, кэш 24ч)
- Личные кабинеты: турист, гид, агент, оператор, партнёр, admin
- Бронирование туров, трансферов, жилья в реальном времени
- Погодный виджет (Яндекс.Погода)
- Glassmorphism UI с поддержкой тёмной/светлой темы
- Деплой через Timeweb Cloud MCP прямо из GitHub Copilot

---

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm ci

# Dev сервер (порт 3000)
npm run dev

# Сборка
npm run build

# Тесты
npm test

# Линтинг
npm run lint

# Проверка типов
npm run type-check
```

Для Cloud Agents рекомендуется выполнять `npm ci` на старте и использовать кэш `~/.npm` + `node_modules` по хешу `package-lock.json`.

### Переменные окружения

Создайте `.env.local`:

WLEDGE_BASE_SOURCE_URLS=https://fishingkam.ru,https://example.com/news
```

---

## Изменения (обновлено 25.02.2026)

### Безопасность API (AUTH/RBAC)
- Реализована полноценная JWT-авторизация в `lib/auth.ts`:
  - `authenticateUser` проверяет токен и возвращает валидный `userId`
  - `authorizeRole` выполняет реальную проверку ролей
  - `verifyAuth` не доверяет кастомным user headers, работает через JWT
- Усилен `middleware.ts`:
  - method-aware публичные API (`GET /api/tours`, `GET /api/partners`, `GET /api/eco-points`, публичные `/api/auth`, `/api/weather`)
  - role-based доступ к namespace:
    - `/api/operator/*` — `operator`
    - `/api/admin/*` — `admin`
    - `/api/guide/*` — `guide`
    - `/api/transfer-operator/*` — `transfer_operator`
    - `/api/agent/*` — `agent`
  - security headers применяются во всех ветках ответов
  - middleware проставляет `X-Auth-Verified` после успешной проверки JWT

### IDOR hardening
- Добавлены ownership-проверки и устранено доверие к клиентским `operatorId/userId` в ключевых GET/PUT/DELETE/POST-эндпоинтах:
  - `operator/*` (tours, bookings, finance, schedules, publish/deactivate и др.)
  - `bookings/[id]/cancel`
  - `payments/[id]/status`
  - `eco-points/user`
  - `loyalty/stats`
  - `chat`
  - `reviews` (создание только от текущего пользователя)
  - `support/tickets/[id]`
  - `engagement/notifications/[id]`
  - `engagement/messages/[id]`

### МЧС: автоматическая регистрация групп
- Добавлен модуль регистрации в МЧС:
  - API: `GET/POST /api/operator/mchs-registrations`
  - клиент интеграции: `lib/safety/mchs-client.ts`
  - форма и статус в dashboard оператора: `MchsRegistrationPanel`
- Поля регистрации:
  - состав группы
  - маршрут
  - даты
  - контакты гида
  - экстренные контакты

### Переброс туристов между операторами
- Добавлен API `app/api/operator/transfer-booking/route.ts`:
  - `POST` — создать предложение переброса
  - `PATCH` — принять/отклонить/отменить
  - `GET` — входящие/исходящие запросы
- При принятии:
  - бронирование переводится на тур принимающего оператора
  - фиксируется комиссия первого оператора (`commission_percent`, `commission_amount`)

### markdown.new в RAG pipeline
- Добавлена утилита `lib/ai/markdown-new.ts` для конвертации URL в Markdown.
- Интегрировано в:
  - `app/api/ai/knowledge-base/route.ts` (режим `type=url` + автообход URL из env)
  - `scripts/update-knowledge-base.js` (`url <https://...>` и авто-режим)

## 🏗️ Архитектура

```
kamhub/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints (tours, operator, transfers)
│   ├── tours/            # Каталог и детали туров
│   ├── hub/              # Личные кабинеты
│   │   ├── tourist/     # Турист
│   │   ├── guide/       # Гид
│   │   ├── agent/       # Агент
│   │   ├── operator/    # Оператор
│   │   └── transfer-operator/
│   ├── auth/            # Авторизация
│   ├── accommodations/  # Жильё
│   ├── cars/            # Аренда авто
│   ├── gear/            # Снаряжение
│   └── shop/            # Магазин
│
├── components/           # React компоненты
│   ├── admin/           # Admin панель (DataTable, MetricCard, StatusBadge...)
│   ├── booking/         # Формы и календари бронирования
│   ├── home/            # Главная страница
│   ├── weather/         # Погодные виджеты
│   └── transfer-operator/
│
├── lib/                 # Утилиты и сервисы
│   ├── ai/              # AI модули
│   │   ├── prompts.ts       # Роле-ориентированные промпты + anti-hallucination
│   │   ├── embeddings.ts    # Генерация эмбеддингов, семантический поиск
│   │   └── image-tagger.ts  # Автотеггинг фото (Claude Vision)
│   ├── recommendations/ # Движок рекомендаций
│   │   └── engine.ts        # 3 стратегии: SimilarUsers, Content, EcoOptimized
│   ├── auth/            # JWT, helpers
│   ├── database/        # PostgreSQL подключение
│   └── services.ts      # Сервисный слой
│
├── types/               # TypeScript типы
├── contexts/            # React Context (Auth, Theme, Role, Orders)
├── hooks/               # Custom React хуки
├── AGENTS.md            # OpenClaw: инструкции для AI агента
└── TOOLS.md             # OpenClaw: команды и конвенции
```

> **Паттерн страниц:** `page.tsx` (server + metadata) + `_*Client.tsx` (`'use client'` + вся логика). Никогда не смешивать `'use client'` и `export const metadata` в одном файле.

---

## 🤖 AI Интеграция

### AI-ассистент (`POST /api/ai/chat`)

Роле-ориентированный чат с памятью последних 10 сообщений. Системные промпты адаптированы под каждую роль с правилами anti-hallucination.

```json
{
  "message": "Какой тур выбрать для начинающих?",
  "sessionId": "uuid",
  "role": "tourist",
  "userId": "123"
}
```

### Семантический поиск (`GET /api/discovery/semantic-search`)

Поиск по естественному языку через pgvector. Fallback → SQL LIKE.

```bash
GET /api/discovery/semantic-search?q=тур+к+вулканам+для+семьи+с+детьми
```

Перед использованием нужно проиндексировать туры:
```bash
npx ts-node scripts/index-tours.ts
```

### Автотеггинг фото (`POST /api/operator/tours/[id]/generate-tags`)

Анализирует фотографии тура через Claude Vision и сохраняет теги в `ai_tags` JSONB. Доступно только для операторов. Кнопка «Генерировать теги» добавлена в страницу редактирования тура.

Теги: `landscape`, `activity`, `difficulty`, `season`, `features`

Фильтрация туров по тегам:
```bash
GET /api/discovery/search?landscape=volcano&activity=hiking
```

### Рекомендации (`GET /api/tourist/recommendations`)

| Стратегия | Логика |
|-----------|--------|
| `SIMILAR_USERS` | Пользователи с похожей историей бронируют... |
| `TOUR_CONTENT` | Похожая категория / цена ±30% / сложность |
| `ECO_OPTIMIZED` | Туры с максимальным eco_points_reward |

Кэш 24ч в PostgreSQL. Принудительное обновление: `?refresh=1`

### AI провайдеры (приоритет)

| Провайдер | Модель | Использование |
|-----------|--------|---------------|
| DeepSeek | deepseek-chat | Чат (основной) |
| OpenAI | text-embedding-3-small | Эмбеддинги |
| Anthropic | claude-sonnet-4-6 | Автотеггинг фото (приоритет) |
| Minimax | abab6.5s-chat | Fallback |
| x.ai | grok-4 | Fallback |

---

## 🗄️ База данных

**Хостинг:** Timeweb Cloud  
**Адрес:** `8ad609fcbfd2ad0bd069be47.twc1.net`

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи (+ `recommendations`, `recommended_at`) |
| `tours` | Туры (+ `embedding vector(1536)`, `ai_tags JSONB`) |
| `partners` | Партнёры |
| `bookings` | Бронирования |
| `transfers` | Трансферы |
| `chat_sessions` | История AI-переписки по сессиям |

Миграции в `migrations/`:

| Файл | Описание |
|------|----------|
| `01_initial_extensions.sql` | Базовые расширения |
| `02_support_tables.sql` | Вспомогательные таблицы |
| `03_vector_search.sql` | pgvector + chat_sessions |
| `04_tour_tags.sql` | ai_tags JSONB + GIN индекс |
| `05_recommendations_cache.sql` | Кэш рекомендаций в users |
| `017_create_mchs_and_transfer_booking.sql` | МЧС регистрации + переброс бронирований между операторами |

---

## 🌍 Роли пользователей

| Роль | Описание |
|------|----------|
| `tourist` | Бронирование, просмотр |
| `operator` | Управление турами, бронированиями, финансами, МЧС, transfer-booking |
| `guide` | Расписание, группы, репутация |
| `transfer_operator` | Трансферы, автопарк, водители |
| `agent` | Клиенты, комиссии, ваучеры |
| `admin` | Администрирование платформы |

---

## Новые API эндпоинты

| Endpoint | Метод | Назначение |
|----------|-------|------------|
| `/api/operator/mchs-registrations` | `GET` | Список и статусы регистраций в МЧС |
| `/api/operator/mchs-registrations` | `POST` | Создание и автоматическая отправка регистрации в МЧС |
| `/api/operator/transfer-booking` | `GET` | Входящие/исходящие перебросы бронирований |
| `/api/operator/transfer-booking` | `POST` | Создать предложение переброса |
| `/api/operator/transfer-booking` | `PATCH` | Принять/отклонить/отменить предложение |

## 📱 Основные маршруты

| Маршрут | Описание |
|---------|----------|
| `/` | Главная (поиск туров) |
| `/tours` | Каталог туров |
| `/tours/[id]` | Детали тура |
| `/tours/fishing` | Рыбалка |
| `/accommodations` | Жильё |
| `/cars` | Аренда авто |
| `/gear` | Снаряжение |
| `/shop` | Магазин |
| `/hub/*` | Личные кабинеты |
| `/auth/login` | Вход |
| `/auth/register` | Регистрация |
| `/map` | Карта |

---

## ☁️ Деплой

### Timeweb Cloud (основной)

Автодеплой при push в `main`. Управление через GitHub Copilot:

```
«Задеплой проект в Timeweb»
«Покажи логи последнего деплоя»
```

Конфигурация MCP в `.vscode/mcp.json` (не в git).

### Docker

```bash
docker-compose up --build
```

---

## 🧪 Тестирование

```bash
npm test                   # Vitest (unit тесты)
npm run test:coverage      # Покрытие кода
```

---

## 🤖 OpenClaw Agent Workspace

Проект настроен для работы с [OpenClaw](https://openclaw.ai) — AI агентом. Файлы воркспейса:

| Файл | Назначение |
|------|-----------|
| [`AGENTS.md`](AGENTS.md) | Правила, паттерны, контекст проекта |
| [`TOOLS.md`](TOOLS.md) | Команды, конвенции, env vars |

После установки OpenClaw укажите путь к проекту как workspace в `~/.openclaw/openclaw.json`.

---

## 📊 Статус проекта

| Метрика | Значение |
|---------|---------|
| Сборка | ✅ passing |
| TypeScript | ✅ без ошибок (strict mode) |
| React Doctor | ✅ 99/100 |
| Файлов | 580+ |

### Основные исправления
- ✅ `JWT_SECRET` — проверка перенесена в runtime (не блокирует `build`)
- ✅ Server/Client split — паттерн на всех страницах
- ✅ `metadata` + `'use client'` конфликт — устранён
- ✅ Все TypeScript strict-mode ошибки исправлены

### AI фичи (добавлены 23.02.2026)
- ✅ Роле-ориентированный AI-чат с памятью 10 сообщений
- ✅ Anti-hallucination правила в промптах для всех 6 ролей
- ✅ Семантический поиск туров (pgvector + embeddings)
- ✅ SQL fallback при недоступности векторного поиска
- ✅ Автотеггинг фотографий туров (Claude Vision)
- ✅ Движок рекомендаций на чистом SQL (3 стратегии)
- ✅ Кэш рекомендаций 24ч в PostgreSQL
- ✅ Секция «Рекомендуем вам» в личном кабинете туриста

### Партнёры

**Камчатская Рыбалка** (fishingkam.ru) — 11 туров в базе  
Контакты: +7 914-782-22-22, +7 999-299-70-07

---

## 📦 Стек

| Категория | Технология |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.4 (strict) |
| Styling | Tailwind CSS 3.4 |
| Database | PostgreSQL + pgvector |
| Auth | JWT (jose) |
| Validation | Zod |
| Icons | Lucide React |
| Testing | Vitest |
| Monitoring | Sentry |
| Deploy | Timeweb Cloud Apps |
| AI Chat | DeepSeek + Minimax + x.ai |
| AI Vision | Anthropic Claude |
| AI Search | pgvector (IVFFlat, cosine) |

---

## 📝 Лицензия

Private — все права защищены
