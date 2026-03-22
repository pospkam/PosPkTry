# ⚡ KamHub - Краткий обзор проекта

> Быстрая справка по проекту для разработчиков

---

## 📊 Проект в цифрах

```
📁 418 файлов | 💻 115 TS/TSX | 🎨 16 CSS | 🗄️ 42 таблицы БД
🔌 32 API эндпоинта | ⚛️ 22 компонента | 🧪 5 тестов
💰 Оценка: $100-150K | ⭐ Качество: 8.5/10 | 🚀 Готовность: 85%
```

---

## 🎯 Что это за проект?

**KamHub** - полнофункциональная туристическая платформа для Камчатского края с:
- 🤖 AI-гидом (консенсус 3 провайдеров)
- 🔍 Умным поиском туров
- 🚌 Системой трансферов
- 💳 Платежами (CloudPayments)
- 🎁 Программой лояльности
- 🏢 CRM для операторов

---

## 🏗️ Архитектура за 30 секунд

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 14 (App Router)            │
├──────────────┬──────────────┬───────────────────────┤
│   Frontend   │   API Routes │    Business Logic     │
│              │              │                       │
│ React 18     │ 32 endpoints │ lib/ (25+ модулей)   │
│ TypeScript   │ RESTful      │ Payments, Transfers, │
│ TailwindCSS  │ Edge Runtime │ Loyalty, Maps, AI... │
└──────────────┴──────────────┴───────────────────────┘
                       ↓
              ┌─────────────────┐
              │  PostgreSQL     │
              │  + PostGIS      │
              │  42 таблицы     │
              └─────────────────┘
```

---

## 🚀 Быстрый старт

```bash
# Клонирование
git clone https://github.com/PosPk/kamhub.git
cd kamhub

# Установка
npm install

# Настройка окружения
cp .env.example .env.local
# Заполните: DATABASE_URL, DEEPSEEK_API_KEY, др.

# Миграции БД
npm run migrate:up

# Запуск
npm run dev
# → http://localhost:3002
```

---

## 📁 Где что находится?

| Что нужно | Где искать |
|-----------|------------|
| 🎨 **Компоненты UI** | `components/` |
| 📱 **Страницы** | `app/hub/`, `app/partner/` |
| 🔌 **API** | `app/api/` |
| 💼 **Бизнес-логика** | `lib/` |
| 🗄️ **БД схемы** | `lib/database/*.sql` |
| 🧪 **Тесты** | `test/` |
| 📜 **Скрипты** | `scripts/` |
| 📖 **Документация** | `docs/` |

---

## 🔑 Ключевые файлы

| Файл | Описание |
|------|----------|
| `app/page.tsx` | Главная страница (Samsung Elegant дизайн) |
| `app/layout.tsx` | Корневой layout |
| `lib/database.ts` | Подключение к БД |
| `lib/config.ts` | Конфигурация приложения |
| `middleware.ts` | Next.js middleware |
| `package.json` | Зависимости и скрипты |

---

## 🎨 Основные компоненты

```tsx
<AIChatWidget />           // AI-чат консультант
<PremiumSearchBar />       // Поиск туров
<SearchFilters />          // Фильтры поиска
<TourCard />               // Карточка тура
<WeatherWidget />          // Погода
<TransferSearchWidget />   // Поиск трансферов
<LoyaltyWidget />          // Программа лояльности
<FloatingNav />            // Навигация
```

---

## 🔌 Главные API

```
GET  /api/tours              → Список туров
POST /api/tours/create       → Создать тур
GET  /api/partners           → Партнеры
POST /api/transfers/book     → Забронировать трансфер
POST /api/chat               → Чат с AI
GET  /api/weather            → Погода
POST /api/loyalty/promo/apply → Применить промокод
```

---

## 🗄️ Главные таблицы БД

```sql
users          → Пользователи
partners       → Партнеры/операторы
tours          → Туры
bookings       → Бронирования
transfers      → Трансферы
loyalty_points → Баллы лояльности
chat_sessions  → Сессии AI-чата
```

---

## 🛠️ Полезные команды

```bash
# Разработка
npm run dev              # Старт dev сервера
npm run build            # Сборка продакшена
npm run start            # Запуск продакшена

# База данных
npm run migrate:up       # Применить миграции
npm run migrate:down     # Откатить миграции
npm run db:test          # Проверить подключение
npm run db:stats         # Статистика БД

# Качество кода
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript проверка

# Тесты
npm test                 # Запуск тестов
npm run test:ui          # UI для тестов
npm run test:coverage    # Покрытие

# Timeweb
npm run timeweb:check    # Проверка статуса
npm run timeweb:setup    # Настройка сервера
```

---

## 🔒 Переменные окружения

```env
# Обязательные
DATABASE_URL=postgresql://...
DEEPSEEK_API_KEY=...
JWT_SECRET=...

# AI
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...

# Карты и погода
YANDEX_MAPS_API_KEY=...

# Платежи
CLOUDPAYMENTS_PUBLIC_ID=...
CLOUDPAYMENTS_API_SECRET=...
```

---

## 👥 Роли пользователей

| Роль | Описание | Страница |
|------|----------|----------|
| `traveler` | Турист | `/hub/tourist` |
| `operator` | Туроператор | `/hub/operator` |
| `guide` | Гид | `/hub/guide` |
| `transfer` | Трансфер оператор | `/hub/transfer-operator` |
| `agent` | Агент | - |
| `admin` | Администратор | - |

---

## 🎨 Текущий дизайн

**Используется:** `samsung-elegant.css` - черно-золотой премиум дизайн

**Доступны:** (можно переключить)
- `modern-homepage.css` - современный
- `professional-homepage.css` - профессиональный
- `homepage-2025.css` - футуристичный
- `final-homepage.css` - финальный

---

## 🚨 Известные проблемы

1. ⚠️ Мало тестов (5) - нужно >50
2. ⚠️ 5 вариантов дизайна - нужно выбрать один
3. ⚠️ Нет API документации (OpenAPI)
4. ⚠️ Мобильное приложение не завершено

---

## ✅ Что работает отлично

- ✅ TypeScript покрытие 100%
- ✅ Архитектура чистая и масштабируемая
- ✅ Безопасность (CSRF, rate-limit, JWT)
- ✅ AI консенсус из 3 провайдеров
- ✅ Полная система трансферов
- ✅ Интеграция платежей
- ✅ Программа лояльности
- ✅ Миграции БД

---

## 🎯 Приоритеты развития

### Этот месяц
1. 🧪 Написать unit-тесты (32 для API)
2. 🎨 Выбрать один дизайн, удалить остальные
3. 📖 Добавить OpenAPI документацию
4. 📊 Настроить Sentry мониторинг

### Следующий месяц
5. 📱 Завершить мобильное приложение
6. 🚀 Оптимизация производительности
7. 🌍 Добавить интернационализацию
8. 🔄 Настроить CI/CD

---

## 💡 Советы для новых разработчиков

### Где начать изучение?
1. Прочитайте `README.md`
2. Изучите `docs/PROJECT_STRUCTURE.md`
3. Посмотрите `app/page.tsx` (главная страница)
4. Изучите `lib/database.ts` (база данных)
5. Попробуйте API через `/api/health`

### Как добавить новую фичу?
1. **Компонент:** Создайте в `components/`
2. **Страница:** Добавьте в `app/hub/`
3. **API:** Создайте в `app/api/`
4. **Логика:** Добавьте модуль в `lib/`
5. **БД:** Создайте миграцию в `lib/database/`
6. **Тест:** Добавьте в `test/`

### Как дебажить?
```bash
# Проверка БД
npm run db:test

# Логи в реальном времени
npm run dev

# TypeScript ошибки
npm run type-check

# Тесты
npm test
```

---

## 📚 Полезные ссылки

- 📖 [Полная структура проекта](./PROJECT_STRUCTURE.md)
- 📊 [Аналитика репозитория](./REPOSITORY_ANALYTICS.md)
- 🧹 [Отчет о наведении порядка](./CLEANUP_REPORT.md)
- 🏗️ [Архитектура системы](./architecture/system-overview.mdc)
- 🛤️ [Trip Planner API](./TRIP_PLANNER_API.md)
- 🔄 [Development Workflow](./development-workflow.mdc)

---

## 🆘 Частые вопросы

**Q: Почему порт 3002, а не 3000?**  
A: Чтобы не конфликтовать с другими Next.js проектами

**Q: Где хранятся секреты?**  
A: В `.env.local` (не коммитится в git)

**Q: Как переключить дизайн главной?**  
A: В `app/page.tsx` измените импорт CSS файла

**Q: Где AI логика?**  
A: `app/api/ai/route.ts` (консенсус) + провайдеры в `ai/deepseek/`

**Q: Как добавить новую роль?**  
A: В `lib/database/schema.sql` + контекст в `contexts/RoleContext.tsx`

---

## 🎖️ Команда

- **Разработка:** PosPk Team
- **Дизайн:** Kamchatka Nature (ocean/volcano/moss)
- **AI:** Multi-provider Consensus
- **Архитектура:** Next.js + PostgreSQL

---

## 📈 Статус проекта

```
████████████████░░░░ 85% готовности к production

✅ Архитектура    100%
✅ Frontend       90%
✅ Backend        95%
✅ База данных    100%
⚠️  Тесты         20%
⚠️  Документация  70%
```

---

**Последнее обновление:** 5 ноября 2025

🏔️ **Сделано с любовью для Камчатки**

