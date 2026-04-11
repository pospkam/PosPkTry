# KamchatourHub — AI Agents

> Реестр рабочих AI-агентов платформы.
> Обновлено: апрель 2026

---

## РАБОЧИЕ АГЕНТЫ

### 3 Cron-агента (автономные)

| Агент | Файл | Cron | Что делает |
|-------|------|------|------------|
| **Watchdog** | `lib/agents/watchdog.ts` | каждые 30 мин | Бронирования без подтверждения >24ч, операторы без ответа >48ч, лиды >2ч, SOS >30 мин. Алерты в Telegram. |
| **Editor** | `lib/agents/editor.ts` | 02:00 UTC ежедневно | Находит туры с описанием <300 символов, переписывает AI, сохраняет в `route_description_cache`. |
| **Scout Digest** | `lib/agents/scout-digest.ts` | 07:00 UTC ежедневно | Собирает RSS (Habr AI/ML, RATA, Tourprom, Kamgov), AI-синтез, дайджест в Telegram. |

GitHub Actions: `.github/workflows/cron-watchdog.yml`, `cron-editor.yml`, `cron-scout-digest.yml`

### Kuzmich (AI-ассистент туристов)

Мультиканальный чат-бот. Все каналы используют общий мозг: `lib/kuzmich/core.ts`

| Канал | Endpoint | Статус |
|-------|----------|--------|
| Веб (полная страница) | `/kuzmich` | Работает |
| Виджет (все страницы) | `components/kuzmich/KuzmichWidget.tsx` в `layout.tsx` | Работает |
| Telegram | `/api/telegram/kuzmich` | Активен (разговоры сегодня) |
| MAX (VK) | `/api/max/kuzmich` | Активен (разговоры вчера) |
| WhatsApp | `/api/whatsapp/kuzmich` | Код готов |

Возможности: текст + фото (Gemini Vision), инлайн-бронирование с QR-оплатой (Точка Банк), UTM-трекинг, долгосрочная память (`user_ai_memory`), поиск туров из БД.

### Danger Analyst

| Файл | Cron | Что делает |
|------|------|------------|
| `lib/agents/agencies/danger-analyst-agency.ts` | 30 мин (cron-job.org) | Анализ опасностей по зонам маршрутов |

Endpoint: `/api/cron/danger-analysis`

### Platform Agent (диспетчер)

`lib/agents/platform-agent.ts` — маршрутизирует запросы к нужному agency по intent.

| Agency | Файл | Интенты | Канал |
|--------|------|---------|-------|
| **Operator** | `agencies/operator-agency.ts` | `op_tours_summary`, `op_bookings_today`, `op_revenue`, `op_create_tour`, `op_fill_ai`, `op_add_slots` | `/hub/operator/ai-assist` |
| **Tourist** | `agencies/tourist-agency.ts` | Рекомендации туров | Kuzmich |
| **Guide** | `agencies/guide-agency.ts` | Гид по маршрутам | PlatformAgent |
| **Rescue** | `agencies/rescue-agency.ts` | SOS-консультации | PlatformAgent |
| **Lead** | `agencies/lead-agency.ts` | Обработка лидов | PlatformAgent |
| **Marketing** | `agencies/marketing-agency.ts` | Маркетинг | PlatformAgent |
| **Transfer** | `agencies/transfer-operator-agency.ts` | Трансферы | PlatformAgent |

---

## AGENT BRAIN (память агентов)

Два слоя хранения знаний:

| Слой | Таблица | TTL | Назначение |
|------|---------|-----|------------|
| Оперативная | `agent_memory` | 7 дней | Наблюдения, текущие данные, recall по agent_id |
| Постоянная | `agent_knowledge` | навсегда | Compiled truth + timeline, Russian FTS |

**KnowledgeBase** (`lib/agents/memory/agent-knowledge.ts`):
- `upsert()` — создать/обновить страницу знаний
- `search()` — полнотекстовый поиск (tsvector + ILIKE fallback)
- `appendTimeline()` — добавить запись в хронологию
- `link()` — связать страницы между собой

**MCP-инструменты** (в `lib/mcp/dev-tools/server.ts`):
`brain_search`, `brain_get`, `brain_upsert`, `brain_timeline`, `brain_list`

**Slug convention:**

| Тип | Паттерн | Пример |
|-----|---------|--------|
| operator | `operators/{slug}` | `operators/fishingkam` |
| route | `routes/{slug}` | `routes/avachinsky-volcano` |
| intel | `intel/{domain}/{YYYY-MM}` | `intel/ai_tech/2026-04` |
| decision | `decisions/{id}/{topic}` | `decisions/bm-2026-04-11/pricing` |
| pattern | `patterns/{agent}/{slug}` | `patterns/eco/seasonal-load` |

---

## AI WATERFALL

```
Tier 1 (гонка): OpenRouter + DeepSeek + Gemini + MiMo + GLM
Tier 2 (гонка): YandexGPT + MiniMax
Tier 3 (последовательно): Anthropic
```

| Провайдер | Env | Статус |
|-----------|-----|--------|
| OpenRouter | `OR_API_KEY` | Tier 1 |
| DeepSeek | `DEEPSEEK_API_KEY` | Tier 1 |
| Gemini 2.0 Flash | `GEMINI_API_KEY` | Tier 1 |
| Xiaomi MiMo | `XIAOMI_API_KEY` | Tier 1 |
| GLM Z1 | `OR_API_KEY` (via OR) | Tier 1 |
| YandexGPT | `YANDEX_API_KEY` + `YANDEX_FOLDER_ID` | Tier 2 |
| MiniMax | `MINIMAX_API_KEY` | Tier 2 |
| Anthropic | `ANTHROPIC_API_KEY` | Tier 3 |

Файл: `lib/ai/providers.ts`

---

## CRON-ЗАДАЧИ

| Endpoint | Запускатор | Расписание | Статус |
|----------|-----------|------------|--------|
| `/api/cron/watchdog` | GitHub Actions | 30 мин | Работает |
| `/api/cron/editor` | GitHub Actions | 02:00 UTC | Работает |
| `/api/cron/scout-digest` | GitHub Actions | 07:00 UTC | Работает |
| `/api/cron/leads-process` | GitHub Actions | 30 мин | Работает |
| `/api/cron/followups` | GitHub Actions | 30 мин | Работает |
| `/api/cron/intelligence` | cron-job.org | 6ч | Работает |
| `/api/cron/danger-analysis` | cron-job.org | 30 мин | Работает |
| `/api/cron/health` | cron-job.org | 1ч | Работает |
| `/api/cron/kuzmich` | cron-job.org | 12ч | Посты Кузьмича |
| `/api/cron/abandoned-bookings` | cron-job.org | 1ч | Напоминания/auto-cancel |

---

## УДАЛЕНО (апрель 2026)

Совет директоров из 13 AI-агентов был удалён как неэффективный театр:
- 15 agency-файлов (admin, legal, security, hacker, eco, content, quality, planning, evo, finance, infra, vibe-coder, scout-innovator)
- Board meeting (5 раундов, SSE-стрим) — 1,204 строки
- Board meeting UI — 1,241 строка
- 18 API-маршрутов `/api/agents/*`
- AgentMesh, observers, training, programs
- Итого: **10,318 строк**

Коммиты: `9da9e8d2`, `5d4d83f9`

---

## КЛЮЧЕВЫЕ ФАЙЛЫ

```
lib/agents/
  watchdog.ts              — Watchdog (мониторинг)
  editor.ts                — Editor (описания туров)
  scout-digest.ts          — Scout Digest (RSS дайджест)
  platform-agent.ts        — Диспетчер intent → agency
  intent-classifier.ts     — Классификатор интентов
  permissions.ts           — Матрица разрешений
  memory/
    agent-memory.ts        — Оперативная память (TTL 7д)
    agent-knowledge.ts     — Постоянная память (brain, FTS)
  agencies/
    operator-agency.ts     — Оператор-тулза (6 интентов)
    tourist-agency.ts      — Рекомендации для туристов
    guide-agency.ts        — Гид по маршрутам
    rescue-agency.ts       — SOS-консультации
    lead-agency.ts         — Обработка лидов
    marketing-agency.ts    — Маркетинг
    transfer-operator-agency.ts — Трансферы
    danger-analyst-agency.ts — Анализ опасностей

lib/kuzmich/
  core.ts                  — Общий мозг Кузьмича (все каналы)

lib/ai/providers.ts        — AI waterfall
lib/mcp/dev-tools/server.ts — MCP: brain_* tools
```
