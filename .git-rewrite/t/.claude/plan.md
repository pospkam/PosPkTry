# План: Bright Data MCP + массовый сбор точек в базу

## Проблема
- В БД 260 маршрутов из 3 источников (curated JSON, idilesom, agent scraper)
- Существующие скрейперы используют прямой fetch — блокируются капчами и anti-bot защитой
- Bright Data Web Unlocker API уже используется в `scrape-idilesom.js` (токен есть)
- Обогащение (season, difficulty, duration, equipment, altitude, danger) — phantom fields, никогда не заполняются
- Нет единого MCP-интерфейса для AI-агентов для структурированного чтения интернета

## Решение: Bright Data MCP + обогащенный scraper pipeline

### Шаг 1: Подключить Bright Data MCP Server
**Что:** Добавить `@brightdata/mcp` в конфигурацию MCP серверов.
**Файлы:**
- `.cursor/mcp.json` — добавить brightdata MCP server
- `.claude/settings.json` или Claude Code MCP config — аналогично

**Конфигурация:**
```json
{
  "mcpServers": {
    "brightdata": {
      "command": "npx",
      "args": ["@brightdata/mcp"],
      "env": {
        "API_TOKEN": "${BRIGHTDATA_API_TOKEN}",
        "WEB_UNLOCKER_ZONE": "unlocker"
      }
    }
  }
}
```

**Бесплатный тариф:** 5000 запросов/мес — `search_engine` + `scrape_as_markdown`.
Этого хватит на 500+ новых точек за один прогон.

### Шаг 2: Создать универсальный скрипт-скрейпер через Bright Data API
**Что:** Новый скрипт `scripts/scrape-routes-brightdata.js` — использует Bright Data API напрямую (не MCP, а raw API) для массового сбора.
**Файлы:**
- `scripts/scrape-routes-brightdata.js` — новый скрипт

**Логика:**
1. Список целевых URL (сайты Камчатки + Яндекс.Карты + 2ГИС + форумы)
2. Для каждого: `scrape_as_markdown` через Bright Data API
3. Парсинг markdown → JSON через regexp + AI fallback
4. Дедупликация по `route_dedupe_key`
5. Сохранение в `agent_route_knowledge` с payload enrichment

**Новые источники (помимо существующих 12):**
- `kamchatkaland.ru` — местный портал
- `tour.kam-krai.ru` — краевой туристический портал
- `wikimapia.org` (Камчатка)
- `2gis.ru` (Петропавловск-Камчатский, nature objects)
- `nakamchatku.ru` — форум путешественников
- `kamforum.ru` — региональный форум
- `wikiloc.com/kamchatka` — GPS-треки

### Шаг 3: Обогащение маршрутов (enrichment pipeline)
**Что:** Заполнить phantom fields в `payload` JSONB таблицы `agent_route_knowledge`.
**Файлы:**
- `scripts/enrich-routes.js` — новый скрипт

**Логика:**
1. SELECT из `agent_route_knowledge` WHERE `payload->>'difficulty' IS NULL`
2. Для каждого маршрута: пере-скрейпить source_url через Bright Data
3. Извлечь из текста: `difficulty`, `duration`, `season`, `best_months`, `altitude`, `danger_level`, `required_equipment`, `price_from`
4. UPDATE `payload` JSONB

**Где брать обогащение:**
- `difficulty` — из текста ("легкий"/"средний"/"сложный"/"экстремальный")
- `duration` — "2 часа", "Целый день", "3-5 дней"
- `season` — "июнь-сентябрь", "зимний", "круглогодичный"
- `best_months` — массив месяцев [6,7,8,9]
- `altitude` — метры над уровнем моря (из текста или координат + elevation API)
- `danger_level` — "low"/"moderate"/"high"/"extreme"
- `required_equipment` — массив строк ["треккинговые ботинки", "каска", "ледоруб"]
- `price_from` — числовое значение в рублях

**Без миграции** — все через JSONB `payload` (уже в схеме).

### Шаг 4: Обновить npm scripts
**Файл:** `package.json`

```json
"scripts": {
  "scrape:brightdata": "node scripts/scrape-routes-brightdata.js",
  "scrape:brightdata:dry": "node scripts/scrape-routes-brightdata.js --dry-run",
  "scrape:enrich": "node scripts/enrich-routes.js",
  "scrape:enrich:dry": "node scripts/enrich-routes.js --dry-run"
}
```

### Шаг 5: Обновить `.env.local.example`
**Файл:** `.env.local.example`
Добавить: `BRIGHTDATA_API_TOKEN=`

## Порядок реализации
1. Шаг 1 — MCP конфигурация (2 файла, 5 минут)
2. Шаг 2 — Скрипт скрейпера (1 файл, основная работа)
3. Шаг 3 — Скрипт обогащения (1 файл)
4. Шаг 4+5 — package.json + env example

## Что НЕ трогаем
- Существующие скрейперы (route-scraper-agent.js, unique-routes-scraper.js) — работают, не ломаем
- Схему БД (миграции) — всё через `payload` JSONB
- middleware.ts, auth, payments, SOS

## Риски
- Bright Data free tier: 5000 req/мес. Если мало — переходим на Pro ($0.001/req)
- Некоторые сайты могут всё равно блокировать (но Bright Data обходит 99%)
- AI-enrichment (difficulty, season из текста) — не 100% точность, нужен human review
