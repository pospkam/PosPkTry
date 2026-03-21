# AI System Plan — KamchatourHub

> Трансформация туристической платформы в AI-систему для туристического бизнеса,
> которая одновременно самоэволюционирует.
>
> Обновлено: Март 2026

---

## ОСНОВНАЯ ЗАДАЧА

Построить AI-систему ДЛЯ туристического бизнеса, которая умеет самоэволюционироваться:
- Продакшн-работает (ценность за неделю для каждой роли)
- Самоэволюционирует (анализирует себя, учится, оптимизирует промпты)

---

## АРХИТЕКТУРА (7 недель)

```
Нед.  Слой                          Выход
──────────────────────────────────────────────────────────────────
1-2   Core Agent Framework          PlatformAgent, Context Hub, Observation Logger
      (Safe + Observable)           → Admin bot /digest Claude работает

2-3   Multi-Role Agencies           AdminAgency, OperatorAgency, TouristAgency
      (Production Ready)            → Все три роли получают AI-ценность

3-4   Learning Layer                Feedback loop, Pattern recognition, A/B tests
      (Self-Evolution v1)           → Система анализирует и предлагает улучшения

4-5   TripBuilder v2                AI-aware builder + Smart recommendations + DnD
      (User Delight)                → Турист: "вулканы + рыбалка" → 2 клика

5-6   Optimization Engine           Runtime prompt tuning, Dynamic rules, Telemetry
      (Auto-improvement)            → Система сама пишет лучшие промпты

6-7   Scale Layer                   Guide Agency, Transfer-Operator Agency
      (Next Roles)                  → Готовность к расширению на все 6 ролей
```

---

## СХЕМА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────────┐
│                USERS (Admin / Operator / Tourist / Guide)        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ intent
              ┌────────▼─────────┐
              │  PlatformAgent   │  единая точка входа
              │  Intent Parser   │  (lib/agents/platform-agent.ts)
              └────────┬─────────┘
                       │
              ┌────────▼──────────────────────────────┐
              │          CONTEXT HUB                  │
              │  (lib/agents/context-hub.ts)           │
              ├───────────────────────────────────────┤
              │  user_context    (роль, история)      │
              │  task_context    (текущая задача)      │
              │  platform_knowledge  (1189 маршрутов)  │
              │  execution_state (running, logs)       │
              └────────┬──────────────────────────────┘
                       │
              ┌────────▼──────────────────────────────┐
              │     AGENT REGISTRY & SPAWNER           │
              │  (lib/agents/agencies/)                │
              ├──────────────┬──────────────┬──────────┤
              │ AdminAgency  │ OpAgency     │ TAgency  │
              │ /digest      │ tours/mgmt   │ TripBuild│
              │ /health      │ booking/mgmt │ recommend│
              │ /leads       │ weather_ai   │ personlz │
              └──────────────┴──────────────┴──────────┘
                       │
              ┌────────▼──────────────────────────────┐
              │       LEARNING & EVOLUTION LAYER       │
              │  (lib/agents/learning/)                │
              ├───────────────────────────────────────┤
              │  feedback_loop      success/fail log   │
              │  pattern_recognition  что работало?    │
              │  experiment_tracker   A/B testing      │
              │  prompt_tuning        авто-оптимизация │
              └────────┬──────────────────────────────┘
                       │
              ┌────────▼──────────────────────────────┐
              │   EXECUTION LAYER (существующий код)   │
              │  operator_tours, bookings, leads        │
              │  cloudpayments, telegram, analytics      │
              └───────────────────────────────────────┘
```

---

## СТРУКТУРА ФАЙЛОВ (новая)

```
lib/agents/
├── platform-agent.ts             # Main entry — intent dispatch
├── context-hub.ts                # OpenViking-like memory system
├── feedback-loop.ts              # Log all decisions for learning
├── pattern-recognition.ts        # Learn from success/fail patterns
├── agencies/
│   ├── admin-agency.ts           # /digest, /health, /forecast, /leads AI
│   ├── operator-agency.ts        # tour mgmt, booking, weather AI
│   ├── tourist-agency.ts         # recommendations, personalization
│   └── subagent-spawner.ts       # Spawn child agents for parallel tasks
├── learning/
│   ├── experiment-tracker.ts     # A/B testing framework
│   ├── prompt-tuning.ts          # Runtime prompt optimization
│   └── rule-generator.ts         # Auto-generate rules from patterns
└── safeguards/
    ├── approval-required.ts      # Зона, требующая одобрения admin
    └── audit-log.ts              # Все изменения системы логируются

app/api/agents/
├── dispatch/route.ts             # Intent routing
├── feedback/route.ts             # Log success/fail + context
└── learning/route.ts             # Analytics: что работает

app/hub/admin/agents/             # Admin UI: Agent Activity Dashboard
```

---

## SAFETY GUARDRAILS (самоэволюция без рисков)

```
SAFE (применяется автоматически):
  - Prompt optimization (better results = better prompts)
  - Pattern recognition (что сработало для похожих задач)
  - Scheduling recommendations (когда лучше делать X)
  - UI/UX improvements (flow, wording, layout)

NEED REVIEW (требует одобрения admin):
  - Изменение бизнес-логики (условия бронирования)
  - Новые API-вызовы (расширение доступа)
  - Изменение цен, комиссий, скидок
  - Массовые рассылки

FORBIDDEN (система никогда не может):
  - Удалять данные
  - Обходить авторизацию
  - Изменять schema БД напрямую
  - Выполнять платежи без явного подтверждения
  - Изменять safeguards сами по себе
```

---

## ЧТО ПОЛУЧИТ КАЖДАЯ РОЛЬ

### Admin (tourhab_bot /digest):
```
→ "34 новых лида (↑12% к прошлой неделе), 8 бронирований,
   3 тура без слотов на июнь.
   Рекомендую: #1 добавить слоты рыбалке, #2 -15% на треккинг в пятницу,
   #3 weather alert: Авачинский — 4 тура в риске на этих выходных"
```

### Operator (TG или UI):
```
"Какие туры у меня не заполнены?"
→ "Тур #5 (рыбалка, 3/8 мест). Предлагаю скидку -15% или перенос среду
   (исторически популярнее пятницы для этого сегмента)"
→ [Применить скидку] [Перенести] [Посмотреть]
```

### Tourist (TripBuilder v2):
```
"Хочу вулканы + рыбалку, 5 дней, июнь, с гидом"
→ 3 готовых маршрута с картой, ценами, рейтингами операторов
→ Бронирование в 2 клика
```

---

## НЕДЕЛЯ ЗА НЕДЕЛЕЙ

### Нед. 1-2: Core (Safe Foundation)
```
- PlatformAgent класс (intent dispatch, tool registry)
- Context Hub (4 типа контекста: user/task/platform/execution)
- Observation Logger (все решения логируются, база для обучения)
- Интеграция с существующими 5 AI подсистемами
- Admin bot /digest v1 — работает в production
- Tests + TypeScript strict
```

### Нед. 2-3: Agencies (Production Value)
```
- OperatorAgency (обёртка над operator_tours/bookings API)
- TouristAgency (рекомендации, TripBuilder backbone)
- AdminAgency (все dashboard операции через AI)
- Telegram command routing через PlatformAgent
- Error handling + fallback strategies
```

### Нед. 3-4: Learning (Self-Evolution v1)
```
- Feedback Loop API (log success/fail + context)
- Pattern Recognition (MiroFish-like swarm approach)
- Experiment Tracking (A/B тест новых подходов)
- Prompt version control (безопасный апгрейд)
- ApprovalRequired зона + Admin review dashboard
```

### Нед. 4-5: TripBuilder v2 (User Delight)
```
- AI-aware builder (знает интересы из context hub)
- Smart recommendations (context-based, не random)
- DnD с AI-валидацией (логичность маршрута)
- Marketplace интеграция (operator tours в TripBuilder)
- Save/share trips (user_trips table, migration 058 готова)
```

### Нед. 5-6: Optimization Engine
```
- Runtime prompt optimization (лучше результат = лучше промпт)
- Performance metrics dashboard (что улучшилось)
- Dynamic rules engine (if X then Y из паттернов)
- Telemetry: что работает, что нет
```

### Нед. 6-7: Scale
```
- Guide Agency прототип
- Transfer-Operator Agency
- Agent (referral partner) Agency
- Context Hub расширяется на новые роли
- Integration tests
```

---

## ЗАВИСИМОСТИ (что уже готово)

```
ГОТОВО (используем напрямую):
  lib/ai/providers.ts          ← AI waterfall (4 провайдера)
  lib/ai/embeddings.ts         ← Smart search (embedding-based)
  lib/services/trip-recommender.ts  ← Tourist recommendations
  lib/ai/crew-agents.ts        ← Multi-agent patterns (reference)
  lib/ai/role-assistants.ts    ← Role-based chat
  app/api/.../auto-fill-ai/    ← Tour card auto-fill
  lib/services/rag.service.ts  ← RAG / KB queries

СТРОИМ ПОВЕРХ:
  lib/agents/platform-agent.ts  ← NEW, orchestrates all above
  lib/agents/context-hub.ts     ← NEW, persistent context
  lib/agents/learning/          ← NEW, evolution layer
```

---

## РИСКИ И МИТИГАЦИЯ

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Самоэволюция ломает продакшн | Средняя | ApprovalRequired зона, audit log |
| AI галлюцинирует в бизнес-логике | Высокая | Только факты из БД, no free generation |
| Prompt tuning ухудшает результат | Средняя | A/B testing, rollback механизм |
| Context hub разрастается | Низкая | TTL на execution_state, сжатие |
| один человек не успевает | Высокая | Фокус на Core сначала, остальное итеративно |
