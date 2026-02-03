# Kamhub - Туристическая платформа Камчатки

## Обзор проекта

Kamhub - платформа для бронирования туров на Камчатке. Рыбалка, вулканы, термальные источники.

**Стек:** Next.js 15, TypeScript, Tailwind CSS, PostgreSQL (Timeweb Cloud)

**Продакшен:** https://pospk-kamhub-c8e0.twc1.net

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
app/                 # Next.js App Router
├── api/             # API endpoints
│   ├── tours/       # CRUD туров
│   ├── operator/    # Кабинет оператора
│   └── transfers/   # Трансферы
├── tours/           # Страницы туров
└── partner/         # Кабинет партнера

components/          # React компоненты
lib/
├── database.ts      # Подключение к PostgreSQL
├── partners/        # Данные партнеров
└── config.ts        # Конфигурация

scripts/             # Скрипты деплоя и миграций
tests/               # Unit тесты
```

## База данных

**Хост:** 8ad609fcbfd2ad0bd069be47.twc1.net  
**Таблицы:** tours, users, partners, bookings, transfers

Миграции в `lib/database/migrations/`

## Деплой

Timeweb Cloud Apps автоматически деплоит при push в main.

```bash
# Ручной деплой через API
gitpod automations task start deploy
```

## Правила кода

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
```

## Партнеры

Основной партнер: **Камчатская Рыбалка** (fishingkam.ru)
- 11 туров загружены в БД
- Контакты: +7 914-782-22-22, +7 999-299-70-07
