# KamchatourHub — AI Agents Reference

> Полный реестр всех AI-агентов платформы.
> Полный реестр всех AI-агентов платформы.
> Где вызываются, за что отвечают, какие инструменты имеют.
> Обновлено: 26 марта 2026

---

## СОВЕТ ДИРЕКТОРОВ (13 агентов)

Все 13 участвуют в Board Meeting (`/hub/admin/board-meeting`).
Каждый имеет:
- Agency-класс в `lib/agents/agencies/`
- Knowledge base в `lib/agents/evolution/agent-knowledge.ts`
- Toolkit в `lib/agents/tools/agent-toolkits.ts`
- Автономное расписание в `lib/agents/scheduler.ts`

---

### 1. Admin — AI Администратор

| Параметр | Значение |
|----------|----------|
| **ID** | `admin` |
| **Роль** | Операционный директор |
| **Intent** | `admin_digest` |
| **Файл** | `lib/agents/agencies/admin-agency.ts` |
| **Расписание** | Каждые 4 часа |
| **Отвечает за** | KPI платформы, брони, операторы, сводка |

**Инструменты:** `sendDigestNotification`, `runDiagnostic`, `recallSharedMemory`, `emitEvent`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1 отчёт
- Scheduler — каждые 4ч автономно
- `PlatformAgent.dispatch()` — admin-команды в чате/Telegram
- `/api/agents/dispatch` — POST (admin-only)

---

### 2. Legal — AI Юрист

| Параметр | Значение |
|----------|----------|
| **ID** | `legal` |
| **Роль** | Юрисконсульт |
| **Intent** | `legal_risks` |
| **Файл** | `lib/agents/agencies/legal-agency.ts` |
| **Расписание** | Каждые 24 часа |
| **Отвечает за** | Compliance, договоры, юридические риски, GDPR |

**Инструменты:** `getAgreementStats`, `emitComplianceIssue`, `sendLegalAlert`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — раз в сутки
- `PlatformAgent.dispatch()` — legal-вопросы

---

### 3. Security — AI Служба безопасности

| Параметр | Значение |
|----------|----------|
| **ID** | `security` |
| **Роль** | Руководитель безопасности |
| **Intent** | `sec_report` (board), `sec_access_audit`, `sec_anomaly` |
| **Файл** | `lib/agents/agencies/security-agency.ts` |
| **Расписание** | Каждые 2 часа |
| **Отвечает за** | Аудит доступа, аномалии в бронях/платежах, угрозы |

**Инструменты:** `runDiagnostic`, `sendSecurityAlert`, `emitAnomaly`, `getFailedActions`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 2ч
- `PlatformAgent.dispatch()` — sec-запросы

---

### 4. Hacker — AI Хакер

| Параметр | Значение |
|----------|----------|
| **ID** | `hacker` |
| **Роль** | Директор по росту |
| **Intent** | `hack_growth` |
| **Файл** | `lib/agents/agencies/hacker-agency.ts` |
| **Расписание** | Каждые 6 часов |
| **Отвечает за** | Growth-стратегия, конверсия, воронка, спрос |

**Инструменты:** `getDemandSignals`, `getConversionFunnel`, `emitConversionDrop`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 6ч
- `PlatformAgent.dispatch()` — growth-вопросы
- Cron `memory-bridge` — получает tourist demand данные

---

### 5. Rescue — AI Спасатель

| Параметр | Значение |
|----------|----------|
| **ID** | `rescue` |
| **Роль** | Начальник SAR |
| **Intent** | `rescue_sos_stats` (board), `rescue_weather_risk`, `rescue_protocols` |
| **Файл** | `lib/agents/agencies/rescue-agency.ts` |
| **Расписание** | Каждые 30 минут |
| **Отвечает за** | SOS-мониторинг, погодные риски, протоколы МЧС |

**Инструменты:** `fetchWeather`, `emitWeatherAlert`, `sendSosAlert`, `getActiveIncidents`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 30 мин (самый частый)
- `/api/agents/rescue-consult` — SAR-консультации
- `PlatformAgent.dispatch()` — rescue-запросы

---

### 6. Eco — AI Эколог

| Параметр | Значение |
|----------|----------|
| **ID** | `eco` |
| **Роль** | Эколог-аналитик |
| **Intent** | `eco_impact` (board), `eco_zones` |
| **Файл** | `lib/agents/agencies/eco-agency.ts` |
| **Расписание** | Каждый час |
| **Отвечает за** | Нагрузка на природу, eco-score, заповедные зоны |

**Инструменты:** `emitZoneAlert`, `writeZoneWarning`, `getBookingsByZone`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждый час
- `PlatformAgent.dispatch()` — eco-запросы

---

### 7. Content — AI Аудитор

| Параметр | Значение |
|----------|----------|
| **ID** | `content` |
| **Роль** | Контент-директор |
| **Intent** | `content_audit` |
| **Файл** | `lib/agents/agencies/content-auditor-agency.ts` |
| **Расписание** | Каждые 8 часов |
| **Отвечает за** | Качество описаний туров, фото, CTR |

**Инструменты:** `getLowCTRTours`, `recallSharedMemory`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 8ч
- `PlatformAgent.dispatch()` — content-запросы

---

### 8. Quality — AI Качество

| Параметр | Значение |
|----------|----------|
| **ID** | `quality` |
| **Роль** | Директор по качеству |
| **Intent** | `qa_operators` |
| **Файл** | `lib/agents/agencies/quality-agency.ts` |
| **Расписание** | Каждые 12 часов |
| **Отвечает за** | Рейтинги, отзывы, здоровье операторов |

**Инструменты:** `computeScore`, `getRecentBadReviews`, `emitNegativeFeedback`, `sendQualityAlert`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 12ч
- `PlatformAgent.dispatch()` — quality-запросы

---

### 9. Evo — AI Эволюция

| Параметр | Значение |
|----------|----------|
| **ID** | `evo` |
| **Роль** | Архитектор платформы |
| **Intent** | `evo_optimize` (board), `evo_experiment`, `evo_analyze` |
| **Файл** | `lib/agents/agencies/evolution-agency.ts` |
| **Расписание** | Каждые 24 часа |
| **Отвечает за** | Самоанализ системы, A/B-тесты, синтез агентов |

**Инструменты:** `recallSharedMemory`, `runDiagnostic`, `getExperimentResults`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — раз в сутки
- Cron `agents-evolve` — автономный цикл эволюции (6ч)
- `PlatformAgent.dispatch()` — evo-запросы

---

### 10. Finance — AI Финдиректор

| Параметр | Значение |
|----------|----------|
| **ID** | `finance` |
| **Роль** | CFO / Финансовый директор |
| **Intent** | `finance_report` |
| **Файл** | `lib/agents/agencies/finance-agency.ts` |
| **Расписание** | Каждые 6 часов |
| **Отвечает за** | Unit-экономика, выручка, платежи, комиссии |

**Инструменты:** `getPaymentHealth`, `sendFinanceAlert`, `emitPriceAnomaly`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 6ч
- `PlatformAgent.dispatch()` — finance-запросы

---

### 11. Infra — AI DevOps

| Параметр | Значение |
|----------|----------|
| **ID** | `infra` |
| **Роль** | SRE / Инфраструктура |
| **Intent** | `infra_health` (board), `infra_crons` |
| **Файл** | `lib/agents/agencies/infra-agency.ts` |
| **Расписание** | Каждый час |
| **Отвечает за** | Здоровье API, AI-провайдеры, cron, БД |

**Инструменты:** `probeAIProviders`, `getCronStatus`, `sendInfraAlert`, `runDiagnostic`, `emitRateLimitHit`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждый час
- `PlatformAgent.dispatch()` — infra-запросы

---

### 12. VibeCoder — AI Разработчик

| Параметр | Значение |
|----------|----------|
| **ID** | `vibe_coder` |
| **Роль** | Vibe Coder / Самомодификация |
| **Intent** | `code_analysis` |
| **Файл** | `lib/agents/agencies/vibe-coder-agency.ts` |
| **Расписание** | Каждые 24 часа |
| **Отвечает за** | Качество кода, тех-долг, UI-паттерны |

**Инструменты:** `scanComponentPatterns`, `recallSharedMemory`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — раз в сутки
- `PlatformAgent.dispatch()` — code-запросы

---

### 13. Planning — AI Плановик

| Параметр | Значение |
|----------|----------|
| **ID** | `planning` |
| **Роль** | Стратегический плановик |
| **Intent** | `plan_forecast` |
| **Файл** | `lib/agents/agencies/planning-agency.ts` |
| **Расписание** | Каждые 12 часов |
| **Отвечает за** | Прогнозы бронирований, сезонность, дефицит туров |

**Инструменты:** `getDemandSnapshot`, `getSeasonalForecast`, `parseInterests`, `fetchWeather`

**Где вызывается:**
- `/hub/admin/board-meeting` — Round 1
- Scheduler — каждые 12ч
- `PlatformAgent.dispatch()` — planning-запросы

---

## РАБОЧИЕ АГЕНТЫ (7 штук)

Не участвуют в Board Meeting, но работают через `PlatformAgent.dispatch()`.

### Operator — AI Оператор

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/operator-agency.ts` |
| **Intents** | `op_dashboard`, `op_bookings`, `op_analytics`, `op_create_tour`, `op_fill_ai`, `op_add_slots` |
| **Где** | `/api/agents/operator` (POST), `/api/ai/chat` (operator role) |
| **Что делает** | CRM-операции: создание туров, AI-заполнение, добавление дат |

### Tourist — AI Турист

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/tourist-agency.ts` |
| **Intents** | `tourist_help`, `tourist_plan` |
| **Где** | `/api/ai/chat` (tourist role), PlatformAgent |
| **Что делает** | Помощь туристам, TripPlanner, рекомендации |

### Guide — AI Гид

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/guide-agency.ts` |
| **Intents** | `guide_*` |
| **Где** | PlatformAgent dispatch |
| **Что делает** | Расписание гидов, назначения, рейтинги |

### Transfer Operator — AI Трансфер

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/transfer-operator-agency.ts` |
| **Intents** | `transfer_*` |
| **Где** | PlatformAgent dispatch |
| **Что делает** | Логистика трансферов |

### Lead — AI Лидогенерация

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/lead-agency.ts` |
| **Intents** | `lead_*` |
| **Где** | PlatformAgent dispatch |
| **Что делает** | Обработка лидов, воронка |

### Marketing — AI Маркетинг

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/marketing-agency.ts` |
| **Intents** | `mkt_*` |
| **Где** | PlatformAgent dispatch |
| **Что делает** | Маркетинговые кампании |

### Danger Analyst — AI Аналитик опасностей

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/agents/agencies/danger-analyst-agency.ts` |
| **Intents** | (не через dispatch, вызывается напрямую) |
| **Где** | Cron `/api/cron/danger-analysis` (каждые 30 мин), `/api/agents/rescue-consult` |
| **Что делает** | Анализ опасностей по зонам Камчатки (сейсмика, погода, вулканы) |

---

### Lead Processor — AI Обработчик лидов

| Параметр | Значение |
|----------|----------|
| **Файл** | `lib/services/lead-processor.service.ts` |
| **Класс** | `LeadProcessorService` |
| **Где** | `POST /api/leads/process`, вызывается оператором из `/hub/operator/leads` |
| **Что делает** | Квалификация лида → подбор туров → генерация персонального предложения (PDF) → Telegram-нотификация |

**Пайплайн:**
1. AI-квалификация (`callAIFast`) — извлекает activity_types, бюджет, даты, интересы из свободного текста
2. Матчинг туров — SQL-запрос по activity_type + бюджету + ключевым словам + ранжирование
3. Генерация предложения — headline + summary + highlights через AI
4. Сохранение в `lead_proposals`, обновление статуса лида
5. Telegram-уведомление оператора со ссылками на лид и PDF

**State machine лида:** `new` → `ai_processing` → `ai_qualified` → `proposal_sent` → `awaiting_confirm` → `converted` / `lost`

**PDF:** `lib/pdf/proposal-generator.ts` — PDFKit, генерация на сервере, ~1-2 сек

---

## СТРАНИЦЫ И API

### UI-страницы с агентами

| Страница | Путь | Что показывает |
|----------|------|----------------|
| **Board Meeting** | `/hub/admin/board-meeting` | Совещание 13 директоров: 4 раунда (отчёты, реакции, голосование, предложения) |
| **Agents Dashboard** | `/hub/admin/agents` | 4 вкладки: Activity / Insights / Experiments / Approvals |
| **Safety Dashboard** | `/hub/admin/safety` | Данные danger-analyst (опасности по зонам) |
| **AI Chat** | `/ai-assistant` | Чат с AI: для admin/operator перехватывается PlatformAgent |
| **Leads (Operator)** | `/hub/operator/leads` | AI Lead Processor: список лидов, one-click AI-обработка, скачать PDF |

### API endpoints агентов

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/agents/board-meeting` | POST | SSE-стрим совещания 13 агентов |
| `/api/agents/board-meeting/preflight` | GET | Проверка AI-провайдеров + баланс. `?deep=1` для полного теста |
| `/api/agents/board-meeting/accountability` | GET | Отчёт об исполнении решений прошлого совещания |
| `/api/agents/dispatch` | POST | Отправить команду агенту (admin-only) |
| `/api/agents/operator` | POST | Команды оператора через агент |
| `/api/agents/health` | GET | Здоровье scheduler + платформы |
| `/api/agents/init` | POST | Инициализация платформы (scheduler + event bus) |
| `/api/agents/activity` | GET | Лог активности агентов |
| `/api/agents/insights` | GET | Паттерны + метрики обратной связи |
| `/api/agents/experiments` | GET/POST/PATCH | A/B эксперименты |
| `/api/agents/approvals` | GET/POST/PATCH | Одобрение инициатив |
| `/api/agents/execute/[id]` | POST/GET | SSE-исполнение инициативы |
| `/api/agents/execute-tool` | POST | Прямой запуск инструмента (SQL fix, alert) |
| `/api/agents/feedback` | POST | Оценка ответа агента (good/bad) |
| `/api/agents/rescue-consult` | GET | SAR-консультация с данными об опасностях |
| `/api/ai/chat` | POST | Главный чат: PlatformAgent intercept + AI waterfall |
| `/api/telegram/webhook` | POST | Telegram: `/agent` команда вызывает PlatformAgent |
| `/api/leads/process` | POST | AI Lead Processor: квалификация + подбор тура + генерация предложения |
| `/api/leads/[id]/proposal` | GET | Данные готового предложения по лиду |
| `/api/leads/[id]/proposal/pdf` | GET | Скачать PDF-предложение (PDFKit, ~1-2 сек) |

### Cron-задачи с агентами

| Cron | Частота | Что делает |
|------|---------|------------|
| `/api/cron/danger-analysis` | 30 мин | AI-анализ опасностей по зонам |
| `/api/cron/agents-evolve` | 6 часов | Автономная эволюция: observe, learn, evolve, maintain |
| `/api/cron/initiatives-execute` | 1 час | Исполнение одобренных инициатив (до 5 шт) |
| `/api/cron/memory-bridge` | 6 часов | Синхронизация tourist demand в agent memory |

---

## AI ПРОВАЙДЕРЫ (waterfall)

Текущее состояние на проде:

| # | Провайдер | Функция | Env | Статус |
|---|-----------|---------|-----|--------|
| 1 | Xiaomi MiMo-V2-Pro | `callMiMo` | `XIAOMI_API_KEY` | Нет ключа |
| 2 | OpenRouter (4 модели) | `callOpenrouter` | `OPENROUTER_API_KEY` | Работает ($999) |
| 3 | YandexGPT 5.1 | `callYandexGPT` | `YANDEX_API_KEY` + `YANDEX_FOLDER_ID` | Нет ключа |
| 4 | DeepSeek direct | `callDeepSeek` | `DEEPSEEK_API_KEY` | Нет ключа |
| 5 | Gemini 2.0 Flash | `callGeminiDirect` | `GEMINI_API_KEY` | Нет ключа |
| 6 | xAI Grok-4 | `callXai` | `XAI_API_KEY` | 403 (geo-blocked RU) |
| 7 | Anthropic Claude Haiku | `callAnthropic` | `ANTHROPIC_API_KEY` | 403 (geo-blocked RU) |

**OpenRouter sub-models:** GPT-4o-mini -> DeepSeek V3 -> Gemini 2.0 Flash -> Claude Haiku 4.5

**Waterfall полный:** MiMo -> OpenRouter -> YandexGPT -> DeepSeek -> Gemini -> xAI -> Anthropic

**Waterfall быстрый (callAIFast):** MiMo -> DeepSeek via OR -> Gemini Direct

Файл: `lib/ai/providers.ts`

---

## КЛЮЧЕВЫЕ ФАЙЛЫ

```
lib/agents/
  agencies/               — 20 agency-классов (13 директоров + 7 рабочих)
  tools/agent-toolkits.ts — Реестр инструментов для всех 13 директоров
  evolution/
    agent-knowledge.ts    — Knowledge base каждого директора
    agent-context-v2.ts   — Rich context builder (метрики + история)
  context-hub.ts          — AgentContext (user, task, platform, tools)
  scheduler.ts            — Автономное расписание 13 агентов
  platform-init.ts        — Инициализация платформы
  platform-agent.ts       — PlatformAgent: dispatch + intent classification
  memory/
    agent-memory.ts       — Долгосрочная память агентов
    memory-bridge.ts      — Tourist demand -> Agent memory синхронизация
  learning/
    pattern-recognition.ts — Распознавание паттернов
    feedback-loop.ts       — Цикл обратной связи
    experiment-tracker.ts  — A/B эксперименты
  execution/
    initiative-executor.ts — Исполнитель одобренных инициатив
  safeguards/
    approval-required.ts   — Система одобрений
    audit-log.ts           — Аудит лог
    director-standards.ts  — Стандарты качества ответов

app/api/agents/           — Все API endpoints агентов
app/hub/admin/
  board-meeting/          — UI совещания
  agents/                 — UI дашборд агентов
```

---

## ИЗВЕСТНЫЕ ПРОБЛЕМЫ (24.03.2026)

1. **AI на проде работает только через OpenRouter** — остальные 6 провайдеров не настроены или geo-blocked
2. **`ai_actions_log` на проде имеет только 4 колонки** (id, action_type, metadata, created_at) — нужна миграция для расширения
3. **`sos_events.resolved_at` не существует** — нужна миграция
4. **`user_eco_points` не в миграциях** — только в schema.sql, может не быть на проде
5. **Cron-задачи не настроены на cron-job.org** — агенты не работают автономно
6. **Миграции 077, 078 не применены на проде** — Telegram chat_id + support tickets
## ИЗВЕСТНЫЕ ПРОБЛЕМЫ (26.03.2026)

1. **AI на проде работает только через OpenRouter** — остальные 6 провайдеров не настроены или geo-blocked
2. **`ai_actions_log` на проде имеет только 4 колонки** (id, action_type, metadata, created_at) — нужна миграция для расширения
3. **`sos_events.resolved_at` не существует** — нужна миграция
4. **`user_eco_points` не в миграциях** — только в schema.sql, может не быть на проде
5. **Cron-задачи не настроены на cron-job.org** — агенты не работают автономно
6. **Миграции 077, 078 не применены на проде** — Telegram chat_id + support tickets
7. **Миграция 083 требует применения на проде** — AI Lead Processor + lead_proposals + lead_activity_log
