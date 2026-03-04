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
| AI | DeepSeek (primary), Minimax, xAI Grok (fallback) |
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
# Заполните DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET
npm run dev
```

Откройте http://localhost:3000

### Команды

```bash
npm run dev      # Dev сервер (порт 3000)
npm run build    # Production сборка
npm run lint     # ESLint
npm test         # Vitest
```

### Docker

```bash
docker-compose up   # Next.js + PostgreSQL
npm run migrate     # SQL миграции
npm run db:seed     # Тестовые данные
```

---

## Структура проекта

```
PosPkTry/
├── app/
│   ├── page.tsx               # Главная страница
│   ├── api/                   # 226 API endpoints
│   │   ├── auth/              # login, register, me
│   │   ├── tours/             # Каталог туров
│   │   ├── bookings/          # Бронирования
│   │   ├── operator/          # CRM оператора
│   │   ├── guide/             # Dashboard гида
│   │   ├── transfer/          # Трансферы (оператор)
│   │   ├── transfers/         # Трансферы (клиент)
│   │   ├── agent/             # Агентские операции
│   │   ├── admin/             # Платформенное управление
│   │   ├── ai/                # DeepSeek + Minimax + xAI
│   │   ├── weather/           # Яндекс Weather proxy
│   │   ├── payments/          # CloudPayments webhook
│   │   └── safety/            # SOS endpoint
│   ├── hub/                   # Dashboards (89 страниц всего)
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
├── components/                # 90 React компонентов
│   ├── home/                  # Компоненты главной
│   ├── ui/                    # Button, Card, Modal, Input
│   ├── layout/                # HubLayout, HubSidebar
│   ├── ai/                    # AIChatBubble, ChatMessage
│   ├── eco/                   # EcoPointsDashboard
│   ├── safety/                # SOSButton, EmergencyModal
│   ├── tours/                 # TourCard, TourFilters
│   └── weather/               # WeatherWidget
│
├── lib/
│   ├── database.ts            # PostgreSQL клиент + re-exports
│   ├── db-pool.ts             # Pool singleton
│   ├── services.ts            # Service layer (18 сервисов)
│   ├── auth/                  # JWT логика
│   ├── payments/              # CloudPayments helpers
│   └── notifications/         # Email, SMS, Telegram
│
├── migrations/                # 8 SQL миграций
├── pillars/                   # Доменные модули
│   ├── booking-pillar/
│   ├── engagement-pillar/
│   └── support-pillar/
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
| Tours | `GET /api/tours` | Список туров с фильтрами |
| Tours | `GET /api/tours/[id]` | Детали тура |
| Bookings | `POST /api/bookings` | Создать бронирование |
| Bookings | `GET /api/bookings/my` | Мои бронирования |
| AI | `POST /api/ai/chat` | AI-помощник |
| Weather | `GET /api/weather` | Погода (proxy) |
| Safety | `POST /api/safety/sos` | SOS сигнал → МЧС |
| Payments | `POST /api/payments/webhook` | CloudPayments webhook |

---

## База данных

### Основные таблицы

```sql
users               -- UUID, email, role, bcrypt hash
partners            -- Операторы/агенты, verified
tours               -- Туры, цены, eco_points_reward
bookings            -- Бронирования, payment_status
reviews             -- Отзывы, рейтинги, фото
transfers           -- Трансферные маршруты
vehicles            -- Автопарк
drivers             -- Водители
chat_sessions       -- AI чат (messages JSONB)
eco_points          -- Eco-points транзакции
notifications       -- Push-уведомления
```

### Правила миграций

```bash
# Только добавлять новые (020_...), существующие не трогать
npm run migrate
```

---

## Статус

**Актуально на 4 марта 2026:**

```
Pages:          89
API endpoints:  226
Сервисы:        18 (все реализованы, stub-заглушки удалены)
Роли:           6
Миграции:       8
Build:          passing (0 ошибок)
console.log:    0 (удалены из всех production файлов)
```

### Реализовано

- [x] JWT авторизация + 6 ролей
- [x] Dashboards всех ролей
- [x] Каталог туров с фильтрами
- [x] Бронирование + CloudPayments
- [x] AI-помощник (DeepSeek / Minimax / xAI)
- [x] Погода Яндекс API
- [x] Яндекс.Карты с маршрутами
- [x] SOS кнопка → МЧС 112
- [x] Eco-points геймификация
- [x] База знаний поддержки
- [x] Партнёр: fishingkam.ru (11 туров в БД)

### Phase 2 (не реализовано)

- [ ] E2E тестирование (Playwright)
- [ ] Push-уведомления (Firebase FCM)
- [ ] Redis кэш
- [ ] Международная версия (EN, ZH)
- [ ] Real-time tracking групп (WebSockets)

---

## Деплой

Push в `main` → GitHub Actions → автодеплой на Timeweb Cloud.

### Переменные окружения

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...             # обязательно, min 32 символа
NEXTAUTH_SECRET=...
DEEPSEEK_API_KEY=...
MINIMAX_API_KEY=...
XAI_API_KEY=...
YANDEX_WEATHER_API_KEY=...
CLOUDPAYMENTS_PUBLIC_ID=...
CLOUDPAYMENTS_API_SECRET=...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...
```

---

## Правила разработки

- TypeScript strict, `any` запрещён — использовать `unknown` + type guard
- SQL всегда параметризованный: `$1, $2`, без конкатенации строк
- Роль только из JWT (`session.user.role`), не из тела запроса
- `console.log` запрещён в production коде (использовать `console.error`)
- Новые фичи БД → новая миграция `020_...`, существующие не изменять
- `middleware.ts`, `lib/auth.ts`, `app/api/payments/`, `app/api/safety/sos` — не трогать без явной задачи
- Компоненты без `'use client'` — server по умолчанию; client только для интерактивности

---

## Партнёры

**Камчатская Рыбалка** (fishingkam.ru)  
Контакты: +7 914-782-22-22, +7 999-299-70-07  
11 туров загружены в БД.
