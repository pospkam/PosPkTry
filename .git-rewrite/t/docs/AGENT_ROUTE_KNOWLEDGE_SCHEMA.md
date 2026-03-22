# Agent Route Knowledge Schema

Цель: хранить нормализованную и обновляемую базу знаний маршрутов для AI-агентов без полного ручного пересбора.

## Таблицы и View

### 1) `kamchatka_routes`
Техническая таблица импорта маршрутов (из `kamchatka-routes-curated.json` и `idilesom-tours.json`).

Создается и заполняется скриптом:
- `node scripts/import-kamchatka-routes.js`

### 2) `agent_route_knowledge`
Инкрементная таблица для агентов.

Поля:
- `route_dedupe_key` - стабильный уникальный ключ маршрута
- `route_id` - ссылка на запись источника
- `title`, `category`, `description`, `lat`, `lng`, `source_url`, `source_name`
- `search_text` - агрегированный текст для поиска/ранжирования
- `payload` - JSONB для расширяемых метаданных
- `source_hash` - хэш исходных данных для быстрых инкрементных апдейтов
- `source_updated_at`, `last_synced_at`, `created_at`, `updated_at`

DDL находится в миграции:
- `lib/database/migrations/018_create_agent_route_knowledge.sql`

### 3) `v_kamchatka_routes_api`
Единый SQL view для чтения полной базы маршрутов всеми API и агентами.

Поля:
- `route_id`, `route_dedupe_key`
- `category`, `title`, `description`
- `lat`, `lng`, `has_coordinates`
- `source_url`, `source_name`, `import_source`
- `category_total`, `category_position`
- `metadata`, `created_at`, `source_updated_at`

### 4) `v_kamchatka_route_groups_api`
Групповой view для API.

Поля:
- `category`
- `total_routes`
- `total_with_coordinates`
- `min_source_updated_at`, `max_source_updated_at`

DDL находится в миграции:
- `lib/database/migrations/019_create_kamchatka_routes_api_views.sql`

## Поток обновления

1. Полный импорт маршрутов:
```bash
npm run db:import:kamchatka-routes -- --reset
```

2. Инкрементная синхронизация в таблицу агента:
```bash
npm run db:sync:agent-routes
```

3. Сборка файла `crew/knowledge-base.json` для Crew:
```bash
npm run ai:setup-agent-rag
```

## Единые правила чтения

- Для API и UI читать маршруты только из `v_kamchatka_routes_api`.
- Для группировки читать только из `v_kamchatka_route_groups_api`.
- `kamchatka_routes` использовать только как таблицу загрузки.
- Агенты читают `agent_route_knowledge`, fallback только на `v_kamchatka_routes_api`.

## Почему это снимает "перескидывание"

- Новые/измененные маршруты определяются по `source_hash`.
- Неизмененные строки не перезаписываются, обновляется только `last_synced_at`.
- `setup-agent-rag.ts` читает уже подготовленную таблицу `agent_route_knowledge` и только при ее отсутствии использует fallback `v_kamchatka_routes_api`.
