# Agent Route Knowledge Schema

Цель: хранить нормализованную и обновляемую базу знаний маршрутов для AI-агентов без полного ручного пересбора.

## Таблицы

### 1) `kamchatka_routes`
Источник импортированных маршрутов (из `kamchatka-routes-curated.json`).

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

## Поток обновления

1. Импорт маршрутов:
```bash
npm run db:import:kamchatka-routes
```

2. Инкрементная синхронизация в таблицу агента:
```bash
npm run db:sync:agent-routes
```

3. Сборка файла `crew/knowledge-base.json` для Crew:
```bash
npm run ai:setup-agent-rag
```

## Почему это снимает "перескидывание"

- Новые/измененные маршруты определяются по `source_hash`.
- Неизмененные строки не перезаписываются, обновляется только `last_synced_at`.
- `setup-agent-rag.ts` читает уже подготовленную таблицу `agent_route_knowledge` и только при ее отсутствии использует fallback `kamchatka_routes`.
