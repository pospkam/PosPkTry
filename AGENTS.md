# KamchatourHub — AI Agents Reference

> Реестр всех AI-агентов платформы, правила совета директоров, архитектура.
> Обновлено: апрель 2026

---

## ПРАВИЛА СОВЕТА ДИРЕКТОРОВ

### Кто есть кто

| Роль | Кто | Принцип |
|------|-----|---------|
| **Собственник** | Человек-владелец | Финальное слово по всем решениям. Одобряет/отклоняет инициативы. |
| **13 директоров** | AI-агенты совета | Советники. Анализируют, предлагают, спорят — но НЕ исполняют без одобрения. |
| **3 наблюдателя** | Внешние AI | Независимый взгляд снаружи. Не голосуют, только информируют. |
| **Scout-Innovator** | Внешний агент | Мониторит AI/travel мир, предлагает эволюцию платформы. |

### 5 раундов совещания (`/hub/admin/board-meeting`)

```
Раунд 1 — Отчёты
  Все 13 директоров параллельно готовят отчёт по своей зоне.
  Только факты из БД. Без выдумок.

Раунд 2 — Внешние наблюдатели + Реакции AgentMesh
  DeepSeek Observer  — социальные тренды, настроения
  Gemini Observer    — рыночные тренды, спрос, конкуренты
  Scout-Innovator    — AI-эволюция, отраслевые инновации для платформы
  AgentMesh          — директора реагируют на отчёты друг друга

Раунд 3 — Консенсус
  Claude Sonnet синтезирует все отчёты и реакции в единый вывод.

Раунд 4 — Инициативы
  Каждый директор предлагает ОДНО конкретное действие.
  Инициативы → agent_approvals (ждут одобрения собственника).

Раунд 5 — Дебаты
  По каждой инициативе: агенты-сторонники vs агенты-скептики.
  Вердикт: proceed / revise / reject.
```

### Правила для агентов (антиспам)

1. **Только факты из БД** — не придумывать метрики. Нет данных → писать "нет данных".
2. **Одно предложение за раз** — не предлагать 5 вещей одновременно.
3. **Своя зона компетенции** — Legal не предлагает growth-стратегии. Hacker не пишет compliance.
4. **Зона исполнителя по матрице** — инициативу исполняет компетентный агент, не инициатор.
5. **Без лести** — не хвалить собственника и коллег-агентов. Прямо и по делу.

### Матрица компетенций (кто исполняет что)

| Тип инициативы | Исполнитель |
|----------------|-------------|
| `booking_rule_change` | Admin |
| `commission_change` | Admin |
| `bulk_notify` | Admin |
| `price_change` | Hacker |
| `ui_copy_change` | Content |
| `prompt_optimize` | Evo |
| `api_scope_expand` | Security |
| `schedule_suggest` | Rescue |
| `tour_auto_cancel` | Quality |
| `sql_query_fix` | Evo |
| `code_change` | VibeCoder |

---

## 13 ДИРЕКТОРОВ СОВЕТА

Все участвуют в Board Meeting. У каждого:
- Agency-класс в `lib/agents/agencies/`
- Своя AI-модель через OpenRouter
- Своя зона компетенции и тип инициатив

| # | ID | Имя | Роль | Модель | Расписание |
|---|----|-----|------|--------|------------|
| 1 | `admin` | AI Администратор | Операционный директор | claude-sonnet-4-6 | 4ч |
| 2 | `legal` | AI Юрист | Юрисконсульт | gpt-4o-mini | 24ч |
| 3 | `security` | AI Безопасность | Руководитель безопасности | mistral-large-2411 | 2ч |
| 4 | `hacker` | AI Хакер | Директор по росту | deepseek-chat-v3 | 6ч |
| 5 | `rescue` | AI Спасатель | Начальник SAR | llama-4-maverick | 30 мин |
| 6 | `eco` | AI Эколог | Эколог-аналитик | gemini-2.0-flash | 1ч |
| 7 | `content` | AI Аудитор | Контент-директор | qwen-2.5-72b | 8ч |
| 8 | `quality` | AI Качество | Директор по качеству | gpt-4o | 12ч |
| 9 | `planning` | AI Плановик | Стратегический плановик | claude-haiku-4-5 | 12ч |
| 10 | `evo` | AI Эволюция | Архитектор платформы | mistral-medium-3 | 24ч |
| 11 | `finance` | AI Финдиректор | CFO | deepseek-chat-v3 | 6ч |
| 12 | `infra` | AI DevOps | SRE / Инфраструктура | llama-4-scout | 1ч |
| 13 | `vibe_coder` | AI Разработчик | Vibe Coder | qwen-2.5-coder-32b | 24ч |

Все модели вызываются через OpenRouter (`OR_API_KEY`). Файл: `lib/ai/agent-models.ts`

---

## 3 ВНЕШНИХ НАБЛЮДАТЕЛЯ (Round 2)

Не входят в совет. Не голосуют. Дают внешний взгляд.

| Наблюдатель | Цвет | Фокус |
|-------------|------|-------|
| **DeepSeek Observer** | #5B6EE1 | Социальные тренды, настроения, хайп/антихайп вокруг Камчатки |
| **Gemini Observer** | #4285F4 | Рыночные тренды, поисковый спрос, конкуренты, ценовые тренды |
| **Scout-Innovator** | #7C3AED | AI-эволюция + travel-инновации → конкретные предложения для платформы |

Файл: `lib/agents/observers/external-observers.ts`

---

## SCOUT-INNOVATOR (Разведчик-Новатор)

Отдельный внешний агент, не директор.

**Цикл работы (ежедневно, 06:00 UTC):**
```
/api/cron/intelligence  →  agent_memory (AI/travel сигналы)
        ↓ (10 сек)
/api/cron/scout         →  читает agent_memory
                        →  AI-синтез: что применить к TourHab?
                        →  2-4 конкретных предложения → agent_approvals
```

**На совещании:** участвует как 3й наблюдатель в Round 2.
Метод `briefForBoardMeeting()` — возвращает краткий брифинг из последнего отчёта.

**Файл:** `lib/agents/agencies/scout-innovator-agency.ts`
**Cron:** `.github/workflows/cron-scout.yml`

---

## ОЦЕНКА ОПЕРАТОРОВ (Bull/Bear → Pro/Con)

`OperatorVerdictAgency` — симметричный анализ операторов для пользы проекта.

**5 сторонников vs 5 скептиков** по каждому оператору:

| Сторонники (про) | Скептики (против) |
|------------------|-------------------|
| Аналитик роста | Инспектор рисков |
| Голос туриста | Аудитор качества |
| Финансовый аналитик | Аналитик ёмкости |
| Стратег платформы | Аналитик эффективности |
| Аналитик перспектив | Защитник туриста |

**Вердикты:** `promote` / `hold` / `warn` / `suspend`
**API:** `POST /api/agents/operator-verdict` (admin only, read-only)
**Файл:** `lib/agents/agencies/operator-verdict-agency.ts`

---

## AI WATERFALL (актуально)

```
Tier 1 (гонка): DeepSeek → Gemini → MiMo
Tier 2 (гонка): OpenRouter → YandexGPT → MiniMax
Tier 3 (последовательно): Anthropic
```

xAI исключён — гео-блок на серверах Timeweb (RU).

| Провайдер | Функция | Env | Статус |
|-----------|---------|-----|--------|
| DeepSeek | `callDeepSeek` | `DEEPSEEK_API_KEY` | Tier 1 |
| Gemini 2.0 Flash | `callGeminiDirect` | `GEMINI_API_KEY` | Tier 1 |
| Xiaomi MiMo | `callMiMo` | `XIAOMI_API_KEY` | Tier 1 |
| OpenRouter | `callOpenrouter` | `OR_API_KEY` | Tier 2, 4 модели |
| YandexGPT | `callYandexGPT` | `YANDEX_API_KEY` + `YANDEX_FOLDER_ID` | Tier 2 |
| MiniMax | `callMiniMax` | `MINIMAX_API_KEY` | Tier 2 |
| Anthropic | `callAnthropic` | `ANTHROPIC_API_KEY` | Tier 3 |

**OR модели внутри:** GPT-4o-mini → DeepSeek V3 → Gemini 2.0 Flash → Claude Haiku 4.5

Файл: `lib/ai/providers.ts`

---

## CRON-ЗАДАЧИ

| Файл | Запускатор | Расписание | Что делает |
|------|-----------|------------|------------|
| `/api/cron/leads-process` | GitHub Actions | каждые 30 мин | AI-обработка новых лидов |
| `/api/cron/followups` | GitHub Actions | каждые 30 мин | Follow-up Day+1/2/5 |
| `/api/cron/intelligence` | cron-job.org | каждые 6ч | Мониторинг AI/travel/конкуренты |
| `/api/cron/scout` | GitHub Actions | 06:00 UTC ежедневно | Scout-Innovator: синтез → предложения |
| `/api/cron/danger-analysis` | cron-job.org | 30 мин | Анализ опасностей по зонам |
| `/api/cron/agents-evolve` | cron-job.org | 6ч | Автономная эволюция агентов |
| `/api/cron/initiatives-execute` | cron-job.org | 1ч | Исполнение одобренных инициатив |
| `/api/cron/memory-bridge` | cron-job.org | 6ч | Tourist demand → agent memory |
| `/api/cron/health` | cron-job.org | 1ч | Health: AI + БД + платежи |
| `/api/cron/digest` | cron-job.org | 08:00 UTC | Дневной дайджест в Telegram |
| `/api/cron/kuzmich` | cron-job.org | 12ч | Посты Кузьмича |

GitHub Actions workflows: `.github/workflows/cron-leads.yml`, `cron-scout.yml`

---

## API ENDPOINTS

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/agents/board-meeting` | POST | SSE-стрим совещания (5 раундов) |
| `/api/agents/board-meeting/preflight` | GET | Проверка AI + баланс. `?deep=1` |
| `/api/agents/board-meeting/accountability` | GET | Отчёт об исполнении решений |
| `/api/agents/operator-verdict` | POST | Bull/Bear анализ операторов |
| `/api/agents/dispatch` | POST | Команда агенту (admin) |
| `/api/agents/approvals` | GET/POST/PATCH | Одобрение инициатив |
| `/api/agents/execute/[id]` | POST | SSE-исполнение инициативы |
| `/api/agents/intelligence` | GET/POST | Просмотр/запуск мониторинга |

---

## КЛЮЧЕВЫЕ ФАЙЛЫ

```
lib/agents/
  agencies/
    admin-agency.ts           — 1. Admin
    legal-agency.ts           — 2. Legal
    security-agency.ts        — 3. Security
    hacker-agency.ts          — 4. Hacker
    rescue-agency.ts          — 5. Rescue
    eco-agency.ts             — 6. Eco
    content-auditor-agency.ts — 7. Content
    quality-agency.ts         — 8. Quality
    planning-agency.ts        — 9. Planning
    evolution-agency.ts       — 10. Evo
    finance-agency.ts         — 11. Finance
    infra-agency.ts           — 12. Infra
    vibe-coder-agency.ts      — 13. VibeCoder
    operator-verdict-agency.ts — Pro/Con оценка операторов
    scout-innovator-agency.ts  — Разведчик-Новатор
  observers/
    external-observers.ts     — 3 наблюдателя (DeepSeek + Gemini + Scout)
  tools/
    agent-toolkits.ts         — Инструменты для директоров
    board-executor-tools.ts   — Инструменты для исполнения инициатив
  execution/
    initiative-executor.ts    — Исполнитель одобренных инициатив
  safeguards/
    approval-required.ts      — Система одобрений (agent_approvals)
    director-standards.ts     — Стандарты качества ответов
  memory/
    agent-memory.ts           — Долгосрочная память (agent_memory)
  evolution/
    agent-context-v2.ts       — Rich context builder
    agent-knowledge.ts        — Knowledge base директоров
  research/
    external-researcher.ts    — RSS/Tavily/Brave сигналы

app/api/agents/board-meeting/route.ts  — Главный файл совещания
lib/ai/agent-models.ts                 — Модели для каждого директора
lib/ai/providers.ts                    — AI waterfall
```

---

## РАБОЧИЕ АГЕНТЫ (не в совете)

| Агент | Файл | Где вызывается |
|-------|------|----------------|
| Operator | `operator-agency.ts` | `/api/agents/operator`, AI chat |
| Tourist / Кузьмич | `tourist-agency.ts` | `/api/ai/chat`, Telegram |
| Guide | `guide-agency.ts` | PlatformAgent dispatch |
| Transfer | `transfer-operator-agency.ts` | PlatformAgent dispatch |
| Lead | `lead-agency.ts` | PlatformAgent dispatch |
| Marketing | `marketing-agency.ts` | PlatformAgent dispatch |
| Danger Analyst | `danger-analyst-agency.ts` | Cron, `/api/agents/rescue-consult` |
| Lead Processor | `lib/services/lead-processor.service.ts` | `/api/leads/process` |
