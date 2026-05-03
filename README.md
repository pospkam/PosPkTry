# TourHab — Volcano OS

**Камчатка без связи. С контролем.**

**[tourhab.ru](https://tourhab.ru)** · PWA · offline map · Kuzmich AI · 1423 маршрута

Мобильная операционная система для туриста на Камчатке. Работает в авиарежиме. Показывает где ты, что вокруг, как дойти, и что делать если что-то пошло не так.

---

## Что это

| | |
|---|---|
| 🗺️ **Офлайн-карта** | Тайлы кэшируются при первом посещении. GPS без интернета. Маркеры, треки, кластеры |
| 📍 **Геоконтекст** | «Я тут, что вокруг?» — Кузьмич знает координаты и отвечает по-местному |
| 🆘 **SOS** | Экстренные номера с tel: ссылками. Работают через сотовую сеть, без интернета |
| 🤖 **Kuzmich AI** | Multi-modal ассистент: текст, фото, голос. Ищет маршруты, погоду, отвечает на вопросы |
| 🌋 **1423 маршрута** | Вулканы, гейзеры, источники, озёра, мысы, пляжи — всё на карте |
| 📱 **PWA** | Homescreen, service worker, 100% offline-first |

**Стек скрейпинга:** Bright Data Web Unlocker (обход антибот-защиты, 2GIS/Yandex Maps)

**Слоган:** *«Камчатка без связи. С контролем.»*

**Codename:** Volcano OS

---

## Архитектура

```
Next.js 15 App Router + TypeScript strict
PostgreSQL (raw SQL, no ORM, 132 миграции)
JWT auth + role-based middleware
AI waterfall: OpenRouter → DeepSeek → Gemini → MiniMax → Anthropic
Telegram Bot API (Kuzmich + операторы)
Timeweb Cloud — auto-deploy on push to main
```

### Данные

| Метрика | Значение |
|---|---|
| TypeScript файлов | 1,186 |
| API маршрутов | 461 |
| UI компонентов | 143 |
| SQL миграций | 132 |
| Маршрутов в БД | 1,423 |
| Строк кода | 195k+ |

### Ключевые модули

```
app/
  map/                  -- Офлайн-карта (Leaflet, markercluster, GPS)
  kuzmich/              -- AI-чат (full-page + web widget + Telegram)
  routes/[id]/          -- Страница маршрута
  sos/                  -- Экстренные номера
  hub/operator/         -- Дашборд оператора
  hub/tourist/          -- Профиль туриста
  hub/safety/           -- Safety center
  api/routes/           -- REST API маршрутов
  api/cron/             -- Background agents

lib/
  kuzmich/core.ts       -- Agent loop, tools, booking
  ai/rag-context.ts     -- RAG контекст + search_count
  ai/providers.ts       -- AI provider waterfall
  offline/              -- IndexedDB для офлайн-режима
  agents/               -- Watchdog, Editor, Scout Digest
  services/             -- Flights, hotels, insurance, transfers
```

---

## Offline-first

Приложение спроектировано для работы без связи:

1. **Тайлы** — кэшируются через Service Worker (zoom 7–10 при установке, zoom 10+ при посещении /map)
2. **Маршруты** — IndexedDB, заполняются при онлайн-сессии
3. **SOS-контакты** — захардкожены, работают через сотовую сеть
4. **GPS** — watchPosition с high accuracy, работает без интернета
5. **Кузьмич** — базовые ответы с геоконтекстом (координаты + ближайшие точки из кэша)

---

## AI stack

### Kuzmich

1. **Agent loop** — 4 tool call'а за ход: поиск маршрутов, погода, места знаний, информация
2. **Геоконтекст** — координаты пользователя + ближайшие точки из БД
3. **Vision** — распознавание фото через Gemini (OpenRouter)
4. **Voice** — транскрипция голосовых сообщений
5. **Memory** — per-user notes, синтез каждые 5 сообщений
6. **search_count** — неинкрементальный подсчёт запросов для data-driven top-100

### Background agents

| Агент | Расписание | Роль |
|---|---|---|
| Watchdog | каждые 30 мин | Зависшие бронирования, медленные операторы |
| Editor | 02:00 UTC | AI-enrichment описаний маршрутов |
| Scout Digest | 07:00 UTC | RSS → AI synthesis → Telegram |
| Intelligence Monitor | каждые 6ч | Конкуренты, индустрия, технологии |
| Kuzmich Place Enricher | 04:00 UTC | Генерирует заметки Кузьмича о местах (kuzmich_review) |

---

## Дизайн-система

Тёплая, земляная, премиальная. Без glassmorphism, без cyberpunk.

- **Шрифты**: Playfair Display (заголовки) + Outfit (текст)
- **Палитра**: CSS custom properties, полный dark mode
- **Акцент**: `#D44A0C` (вулканический оранжевый)
- **Иконки**: lucide-react

---

## Разработка

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.example .env.local
npm run dev
```

### Команды

```bash
npm run dev           # Dev server
npm run build         # Production build
npm run migrate       # Применить миграции (локально)
npx tsc --noEmit      # Type check
```

---

## Дорожная карта

### ✅ Завершено
- PWA на homescreen
- Офлайн-карта (тайлы + IndexedDB + GPS)
- Kuzmich с геоконтекстом для веб-чата
- search_count для data-driven top-100
- SOS панель с экстренными номерами
- 779 мест (вулканы, озёра, источники, гейзеры) + 294 маршрута
- Карточки мест с безопасностью, отзывами, GPX-экспортом
- Анонимные отзывы о местах (без регистрации)
- 5 background AI агентов (Watchdog, Editor, Scout, Intelligence, Kuzmich Enricher)
- Bright Data Web Unlocker для скрейпинга

### 🔧 В работе
- Kuzmich Place Enricher — заполнение kuzmich_review (20 мест/день)
- route_waypoints — связи маршрут→точки
- SOS sticky bar на карточках мест и маршрутов

### 📋 План
- UGC — фото с GPS, заметки, GPX, отчёты
- Lock-in — чек-ины, push-уведомления
- Офлайн PWA v2 — полный кэш мест без интернета

---

## Статус

**Live.** Деплоится автоматически на Timeweb при push в main.

**[tourhab.ru](https://tourhab.ru)**

---

*Построено для Камчатки. Где вулканы встречаются с океаном.*
