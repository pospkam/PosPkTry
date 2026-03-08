# KamchatourHub — Cursor Rules (CLAUDE.md)

## 1. ЗАДАЧА (Task)

Ты помогаешь разрабатывать **KamchatourHub** — туристическую платформу Камчатки.
Успех = рабочий, задеплоенный код на Timeweb Cloud без регрессий.
Без ролей типа "веди себя как сеньор". Просто делай задачу.

---

## 2. КОНТЕКСТ ПРОЕКТА (Context)

**Стек:**
- Next.js (App Router), TypeScript, Tailwind CSS
- PostgreSQL — прямой SQL через `lib/database.ts` (не Prisma)
- JWT auth, 6 ролей: admin / operator / guide / tourist / moderator / support
- Деплой: Timeweb Cloud → pospkam-pospktry-c1f3.twc1.net
- CI/CD: GitHub → автодеплой

**Архитектура:**
- 91 страница, разбита по ролям и активностям
- 14 категорий маршрутов: vulkani / geyzery / termalnye_istochniki / rybalka / snegohod / dzhip / morskie_progulki / trekking / lakes / mountains / rivers / medvedi / vertoletnye_tury / eco
- API routes в `/app/api/`
- Публичные изображения в `/public/images/`

**Прочитай перед стартом:**
- `lib/database.ts` — PostgreSQL клиент
- `lib/auth.ts` — логика JWT
- `crew/knowledge-base.json` — база знаний агентов (259 маршрутов)

---

## 3. ДИЗАЙН-СИСТЕМА (Reference)

**Цвета:**
- Акцент: `#00D4FF` (cyan) — активные состояния, выбор
- Glassmorphism: `backdrop-blur`, `bg-white/10`, `border-white/20`
- Ripple-эффект на кнопках при клике

**Типографика:**
- Заголовки: `Playfair Display`
- Основной текст: системный шрифт

**Темы:**
- Светлая (default mobile): `light.jpg`
- Тёмная: `dark.jpg`
- Переключатель в хедере

**Компоненты:**
- Хедер: `KH` логотип + иконка темы + ЛК. БЕЗ поиска.
- Поиск — только через иконку → модальное окно
- Навбар (mobile, pill): Дом / Карта / Избранное / ЛК / СОС
- Футер — только desktop
- Карусель: `/public/images/carousel/`
- Активности: SVG-иконки одна линия, glassmorphism карточки

---

## 4. ПРАВИЛА КОДА (Rules)

**Обязательно:**
- TypeScript строгий, без `any`
- Все API routes с валидацией входных данных
- JWT проверка на каждом защищённом маршруте
- SQL только параметризованный: `$1, $2` — никогда конкатенация
- Обработка ошибок с понятными сообщениями на русском

**Запрещено:**
- `console.log` в продакшн-коде
- Хардкод строк подключения и секретов — только через `.env.local`
- Изменение схемы БД без миграции (следующая: `024_...sql`)
- Читать `kamchatka_routes` напрямую — только через `v_kamchatka_routes_api`

**Стиль:**
- Компоненты в `components/`, атомарно
- Хуки в `hooks/`
- Утилиты в `lib/`
- Именование: `kebab-case` для файлов, `PascalCase` для компонентов

---

## 5. ПРОЦЕСС (Plan)

**Перед тем как писать код:**
1. Назови 3 правила из этого файла, которые важны для текущей задачи
2. Дай план: что изменяешь, какие файлы затронуты, возможные риски

**Не начинай без плана если задача затрагивает:**
- Схему БД
- Логику авторизации
- API endpoints
- Компоненты с бизнес-логикой бронирований

---

## 6. УТОЧНЕНИЯ (Conversation)

Если задача неоднозначна — **НЕ начинай выполнение**.
Задай уточняющие вопросы:
- Какая роль пользователя затронута?
- Это новый функционал или правка существующего?
- Есть ли пример желаемого поведения?

---

## 7. ВЫРАВНИВАНИЕ (Alignment)

Начинай работу только после того, как план согласован.
Если собираешься нарушить одно из правил выше — **остановись и скажи об этом**.

---

## 8. ДЕПЛОЙ (Deploy)

- Проверь: `npm run build` без ошибок
- Миграции: `node scripts/apply-new-schemas.sql` (или через psql)
- Переменные окружения заданы на Timeweb Cloud
- Push в `main` → автодеплой через GitHub Actions

### Timeweb MCP Server

Для управления деплоем через AI-агентов используется **Timeweb MCP Server**:
- Токен: `TIMEWEB_TOKEN` (в `.cursor/mcp.json` или `.vscode/mcp.json`, **не** в `.env.local`)
- Команды: `create_timeweb_app`, `get_deploy_settings`, `add_vcs_provider`
- Не использовать прямой `TIMEWEB_API_TOKEN` в скриптах — только через MCP

```json
{
  "mcpServers": {
    "timeweb-mcp-server": {
      "command": "npx",
      "args": ["timeweb-mcp-server"],
      "env": { "TIMEWEB_TOKEN": "your-timeweb-token" }
    }
  }
}
```

---

## 9. МАРШРУТЫ (Routes Knowledge)

**Текущее состояние БД:**
- `agent_route_knowledge`: **259 маршрутов**, 14 категорий
- Источники: mestechkokam.ru (HTML), zimaletokamchatka.ru (GraphQL/Strapi), kamchatintour.ru (HTML/Bitrix)

**Workflow обновления базы знаний агентов:**
```bash
# 1. Скрапинг новых маршрутов (без AI)
npm run ai:scrape-unique:direct

# 2. Пересобрать knowledge-base.json (259 маршрутов)
npm run ai:setup-agent-rag

# 3. Регенерировать конфиги 5 агентов
python3 crew/agent-trainer.py
```

**Дедупликация** работает на двух уровнях:
1. По `route_dedupe_key` (hostname:slug)
2. По нормализованному заголовку (lowercase + ё→е + strip non-alnum)
