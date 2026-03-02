# Деплой KamHub на Timeweb Cloud

**Последнее обновление:** 3 февраля 2026  
**Статус:** Активный деплой

---

## Текущая конфигурация

| Параметр | Значение |
|----------|----------|
| **App ID** | 151757 |
| **Тип** | Backend (Node.js) |
| **URL** | https://pospk-kamhub-c8e0.twc1.net |
| **IP** | 185.152.94.225 |
| **Node.js** | v20 |
| **Framework** | Next.js 15.5.10 |

### База данных

| Параметр | Значение |
|----------|----------|
| **Тип** | PostgreSQL 18 |
| **Host** | 8ad609fcbfd2ad0bd069be47.twc1.net |
| **Port** | 5432 |
| **User** | gen_user |
| **Database** | default_db |
| **Таблиц** | 44 |

---

## Быстрый старт с MCP

### 1. Установка MCP сервера

```bash
npm install -g timeweb-mcp-server
```

### 2. Настройка токена

```bash
export TIMEWEB_API_TOKEN="ваш-токен"
```

Получить токен: https://timeweb.cloud/my/api-keys

### 3. Конфигурация для IDE

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "timeweb": {
      "command": "npx",
      "args": ["-y", "timeweb-mcp-server"],
      "env": {
        "TIMEWEB_API_TOKEN": "${TIMEWEB_API_TOKEN}"
      }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "timeweb": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "timeweb-mcp-server"],
      "env": {
        "TIMEWEB_API_TOKEN": "${env:TIMEWEB_API_TOKEN}"
      }
    }
  }
}
```

---

## Переменные окружения

### Обязательные

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://pospk-kamhub-c8e0.twc1.net

# База данных
DATABASE_URL=postgresql://gen_user:PASSWORD@8ad609fcbfd2ad0bd069be47.twc1.net:5432/default_db?sslmode=require
DATABASE_SSL=true

# Безопасность
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d
```

### Yandex API

```env
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=REPLACE_WITH_YANDEX_MAPS_API_KEY
YANDEX_MAPS_STATIC_API_KEY=REPLACE_WITH_YANDEX_MAPS_STATIC_API_KEY
YANDEX_WEATHER_API_KEY=REPLACE_WITH_YANDEX_WEATHER_API_KEY
```

### Опциональные

```env
# AI
DEEPSEEK_API_KEY=your-deepseek-key
TIMEWEB_AI_API_KEY=your-timeweb-ai-key

# Email
RESEND_API_KEY=your-resend-key

# Камчатская Рыбалка API
KAMCHATKA_FISHING_API_KEY=REPLACE_WITH_KAMCHATKA_FISHING_API_KEY
KAMCHATKA_FISHING_API_SECRET=REPLACE_WITH_KAMCHATKA_FISHING_API_SECRET
```

---

## Создание приложения через API

```bash
# Установить токен
export TOKEN="ваш-timeweb-api-token"

# Создать backend приложение
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kamhub",
    "type": "backend",
    "preset_id": 2733,
    "framework": "express",
    "provider_id": "ваш-provider-id",
    "repository_id": "ваш-repo-id",
    "branch_name": "main",
    "build_cmd": "npm run build",
    "run_cmd": "npm start",
    "env_version": "20",
    "is_auto_deploy": true
  }' \
  "https://api.timeweb.cloud/api/v1/apps"
```

---

## Управление через API

### Проверить статус

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/151757" | jq '.app.status'
```

### Обновить переменные

```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"envs": {"KEY": "value"}}' \
  "https://api.timeweb.cloud/api/v1/apps/151757"
```

### Передеплоить

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/151757/deploy"
```

### Получить логи

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/151757/logs?limit=100"
```

---

## База данных

### Подключение

```bash
# Через psql
PGPASSWORD='пароль' psql -h 8ad609fcbfd2ad0bd069be47.twc1.net -U gen_user -d default_db

# Через Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: '8ad609fcbfd2ad0bd069be47.twc1.net',
  port: 5432,
  user: 'gen_user',
  password: 'пароль',
  database: 'default_db',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT version()').then(r => console.log(r.rows[0]));
"
```

### Применить схемы

```bash
npm run db:migrate
# или
psql $DATABASE_URL -f lib/database/schema.sql
```

---

## Troubleshooting

### Деплой зависает

1. Проверить статус: `status: deploy` → ждать
2. Проверить логи в панели Timeweb
3. Проверить что коммит запушен в main

### SSL ошибка

SSL настраивается автоматически после деплоя. Подождать 5-10 минут.

### База не подключается

1. Проверить DATABASE_URL
2. Проверить что `sslmode=require`
3. Проверить IP whitelist в настройках БД

### Build падает

```bash
# Локально проверить сборку
npm run build

# Частые проблемы:
# - Устаревшие зависимости → npm update
# - TypeScript ошибки → npm run lint
# - Отсутствующие env → проверить переменные
```

---

## История изменений

### 3 февраля 2026

- Создано backend приложение (ID: 151757)
- Удалено старое frontend приложение (ID: 151755)
- Создана PostgreSQL БД (44 таблицы)
- Настроен MCP сервер
- Обновлены зависимости:
  - next: 14.2.35 → 15.5.10
  - nodemailer: 6.9.13 → 7.0.13
  - eslint-config-next: 14.2.15 → 15.5.10
  - vitest: 1.3.1 → latest
- Исправлены уязвимости: 16 → 6 (0 high)
- Убран deprecated `swcMinify` из next.config.js

---

## Полезные ссылки

- [Панель приложения](https://timeweb.cloud/my/apps/151757)
- [Панель БД](https://timeweb.cloud/my/databases)
- [API документация](https://timeweb.cloud/api-docs)
- [MCP сервер](https://github.com/timeweb-cloud/mcp-server)
