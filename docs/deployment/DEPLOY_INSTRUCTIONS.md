# Kamhub -- Инструкция по деплою на Timeweb Cloud

## Архитектура деплоя

```
git push origin main
       |
       v
+-------------------+     +------------------------+
| GitHub webhook    | --> | Timeweb Cloud          |
| (автоматический)  |     | App ID: 159529         |
+-------------------+     | is_auto_deploy: true   |
                          +------------------------+
                                    |
                          +---------+---------+
                          | 1. git clone/pull |
                          | 2. npm install    |
                          | 3. npm run build  |
                          | 4. Копирование    |
                          |    standalone     |
                          | 5. node server.js |
                          +---------+---------+
                                    |
                                    v
                          https://pospkam-pospktry-c1f3.twc1.net
```

**Деплой полностью автоматический.** Каждый `git push origin main` запускает билд и деплой через webhook Timeweb Cloud.

---

## Текущая конфигурация приложения

| Параметр | Значение |
|----------|----------|
| App ID | `159529` |
| Домен | `pospkam-pospktry-c1f3.twc1.net` |
| IP | `89.23.116.15` |
| Тип | `backend` (Next.js standalone) |
| Framework | `express` (в терминологии Timeweb) |
| Ветка | `main` |
| Пресет | `1005` (1 CPU, 2GB RAM, NVMe) |
| Регион | `ru-1` (SPB-3) |
| Auto-deploy | `true` |
| VCS Provider | GitHub (`0fd1ea1e-fd02-446a-8ab6-fec10110c4ee`) |
| Repository | `pospkam/PosPkTry` (`56c73255-250a-4daa-b1a4-a3f4d16c744f`) |

### Команды билда/запуска (настроены в Timeweb)

```bash
# Build
NODE_OPTIONS=--max-old-space-size=1536 npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/

# Run
node .next/standalone/server.js
```

### Переменные окружения (настроены в панели Timeweb)

| Переменная | Описание |
|-----------|----------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Секрет для JWT токенов |
| `NEXTAUTH_SECRET` | Секрет NextAuth.js |
| `NEXTAUTH_URL` | `https://pospkam-pospktry-c1f3.twc1.net` |
| `NEXT_PUBLIC_APP_URL` | `https://pospkam-pospktry-c1f3.twc1.net` |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` |
| `NODE_OPTIONS` | `--max-old-space-size=1536` |
| `MINIMAX_API_KEY` | AI provider key |
| `XAI_API_KEY` | x.ai (Grok) key |

---

## Как деплоить

### Автоматический деплой (основной способ)

```bash
# 1. Внести изменения
# 2. Закоммитить
git add -A
git commit -m "feat: описание изменений"

# 3. Запушить -- деплой запустится автоматически
git push origin main

# Timeweb webhook подхватит push и начнёт билд.
# Обычно деплой занимает 2-5 минут.
```

### Проверка статуса деплоя

```bash
# Через Timeweb API
curl -s -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/159529" | \
  python3 -c "
import json, sys
app = json.load(sys.stdin)['app']
print(f'Status: {app[\"status\"]}')
print(f'Commit: {app[\"commit_sha\"][:7]}')
print(f'Domain: https://{app[\"domains\"][0][\"fqdn\"]}')
"
```

Возможные статусы:
- `deploy` -- идёт билд/деплой
- `active` -- приложение работает
- `error` -- ошибка (смотри логи)

### Ручной запуск деплоя (если webhook не сработал)

```bash
curl -X POST \
  -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.timeweb.cloud/api/v1/apps/159529/deployments"
```

### Просмотр логов

```bash
# Runtime логи
curl -s -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/159529/logs?log_type=runtime" | \
  python3 -m json.tool

# Build логи
curl -s -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  "https://api.timeweb.cloud/api/v1/apps/159529/logs?log_type=build" | \
  python3 -m json.tool
```

---

## Timeweb MCP Server (управление через Copilot)

Timeweb Cloud предоставляет официальный MCP-сервер для управления деплоем прямо из VS Code через GitHub Copilot.

### Установка

Конфигурация уже настроена в `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "timeweb": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "timeweb-mcp-server"],
      "env": {
        "TIMEWEB_TOKEN": "${env:TIMEWEB_TOKEN}"
      }
    }
  }
}
```

Убедитесь, что переменная окружения `TIMEWEB_TOKEN` установлена:

```bash
export TIMEWEB_TOKEN="your-api-token-here"
```

### Доступные MCP инструменты

| Инструмент | Описание |
|-----------|----------|
| `create_timeweb_app` | Создание нового приложения |
| `add_vcs_provider` | Добавление VCS провайдера (GitHub/GitLab) |
| `get_vcs_providers` | Список VCS провайдеров |
| `get_vcs_provider_repositories` | Список репозиториев провайдера |
| `get_vcs_provider_by_repository_url` | Поиск провайдера по URL репо |
| `get_allowed_presets` | Доступные тарифы/пресеты |
| `get_deploy_settings` | Настройки деплоя по умолчанию для фреймворков |

### Примеры использования через Copilot Chat

```
"Покажи статус моего приложения на Timeweb"
"Какие VCS провайдеры подключены?"
"Покажи доступные пресеты для Next.js"
"Покажи настройки деплоя для next.js"
```

### Создание нового приложения через MCP

MCP-сервер автоматически:
1. Определяет тип проекта (frontend/backend) по структуре
2. Определяет фреймворк по `package.json`
3. Получает Git info из `.git/`
4. Подбирает подходящий пресет
5. Получает default deploy settings для фреймворка
6. Создаёт приложение

Достаточно написать в Copilot Chat:
```
"Задеплой мое приложение на Timeweb Cloud"
```

**Важно:** После создания приложения необходимо вручную настроить переменные окружения в панели управления Timeweb Cloud.

---

## GitHub Actions Workflow

Файл `.github/workflows/deploy.yml` -- мониторинг, не деплой.

Деплой выполняется Timeweb Cloud webhook (auto-deploy). GitHub Actions лишь проверяет статус приложения после push.

### Секреты GitHub

| Секрет | Описание |
|--------|----------|
| `TIMEWEB_TOKEN` | API-токен Timeweb Cloud |

Настройка: [GitHub Settings -> Secrets -> Actions](https://github.com/pospkam/PosPkTry/settings/secrets/actions)

---

## Timeweb API Reference

Base URL: `https://api.timeweb.cloud`

### Основные эндпоинты

```
GET    /api/v1/apps                          # Список приложений
GET    /api/v1/apps/{app_id}                 # Статус приложения
PATCH  /api/v1/apps/{app_id}                 # Обновить настройки (envs, build_cmd, run_cmd)
POST   /api/v1/apps/{app_id}/deployments     # Запустить деплой
GET    /api/v1/apps/{app_id}/logs            # Логи (query: log_type=build|runtime)
GET    /api/v1/presets/apps                   # Доступные пресеты
GET    /api/v1/vcs-provider                   # VCS провайдеры
GET    /api/v1/vcs-provider/{provider_id}     # Репозитории провайдера
POST   /api/v1/vcs-provider                   # Добавить VCS провайдер
GET    /api/v1/deploy-settings/apps           # Настройки деплоя по умолчанию
POST   /api/v1/apps                           # Создать приложение
```

Авторизация: `Authorization: Bearer {TIMEWEB_TOKEN}`

---

## Troubleshooting

### Деплой не запускается после push

1. Проверьте что `is_auto_deploy: true` в настройках приложения
2. Проверьте webhook в настройках репозитория GitHub
3. Запустите ручной деплой:
   ```bash
   curl -X POST -H "Authorization: Bearer $TIMEWEB_TOKEN" \
     "https://api.timeweb.cloud/api/v1/apps/159529/deployments"
   ```

### Ошибка билда

1. Проверьте build логи:
   ```bash
   curl -s -H "Authorization: Bearer $TIMEWEB_TOKEN" \
     "https://api.timeweb.cloud/api/v1/apps/159529/logs?log_type=build"
   ```
2. Убедитесь что `npm run build` проходит локально
3. Проверьте `NODE_OPTIONS=--max-old-space-size=1536` (лимит RAM)

### Сайт отвечает 502

- Приложение перезагружается -- подождите 1-2 минуты
- Проверьте runtime логи
- Убедитесь что `PORT=3000` и `HOSTNAME=0.0.0.0` установлены

### GitHub Actions workflow падает

- Workflow только мониторит статус, не влияет на деплой
- Проверьте что `TIMEWEB_TOKEN` есть в GitHub Secrets
- Workflow не блокирует автоматический деплой Timeweb

---

## Обновление переменных окружения

### Через панель Timeweb Cloud
1. Зайти на https://timeweb.cloud -> Приложения -> Kamhub
2. Настройки -> Переменные окружения
3. Изменить/добавить переменную
4. Сохранить (приложение перезапустится)

### Через API
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TIMEWEB_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.timeweb.cloud/api/v1/apps/159529" \
  -d '{
    "envs": {
      "NEW_VAR": "value"
    }
  }'
```

**Примечание:** PATCH объединяет envs, не заменяет полностью.

---

## Схема деплоя (полная)

```
Developer        GitHub              Timeweb Cloud
   |                |                      |
   |-- git push --> |                      |
   |                |-- webhook ---------> |
   |                |                      |-- git pull
   |                |                      |-- npm install
   |                |                      |-- npm run build
   |                |                      |-- cp standalone
   |                |                      |-- node server.js
   |                |                      |
   |                |-- Actions workflow ->|
   |                |   (status check)     |-- GET /apps/159529
   |                |                      |<- status: active
   |                |<- check passed ------|
   |                |                      |
   |<-- site live --+----------------------+
   |                                       |
   https://pospkam-pospktry-c1f3.twc1.net  |
```

> Обновлено: Март 2026
