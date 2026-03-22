# НАЗНАЧЕНИЕ ИСПОЛНИТЕЛЕЙ — 5 ИНИЦИАТИВ

**Дата:** 22 марта 2026, 08:15 UTC+3
**Статус:** Все 5 proposals в очереди одобрений, ждут назначения executor

---

## 📋 РЕКОМЕНДУЕМЫЕ ИСПОЛНИТЕЛИ

### 1. КРИТИЧНО: Ротировать OCTO API ключи (4ч downtime)
**Status:** `pending` → одобрение → назначение
**Автор proposal:** AI Служба безопасности

**Рекомендуемый исполнитель:** `security` (AI Служба безопасности)
- **Причина:** Автор инициативы (эксперт по теме)
- **Due date:** 2026-03-22 (СЕГОДНЯ, ночь 23:00)
- **Execution plan:**
  - 22:00-22:30 — Notification ops team
  - 23:00-03:00 — Rotate all 12 keys + test backups
  - 03:00-03:15 — Verify + rollback check

**Alternative executor:** `admin` (если security недоступна)

---

### 2. КРИТИЧНО: Обновить T&C weather policy (1 день)
**Status:** `pending` → одобрение → назначение
**Автор proposal:** AI Юрист

**Рекомендуемый исполнитель:** `legal` (AI Юрист)
- **Причина:** Автор инициативы (legal expertise required)
- **Due date:** 2026-03-23 (завтра, конец дня)
- **Execution plan:**
  - Edit T&C clause 7
  - Test with 3 sample contracts
  - Get admin final sign-off
  - Push to production

---

### 3. HIGH: Переписать 23 описания туров (3-5 часов)
**Status:** `pending` → одобрение → назначение
**Автор proposal:** AI Аудитор

**Рекомендуемый исполнитель:** `content` (AI Аудитор)
- **Причина:** Автор инициативы (content expertise)
- **Due date:** 2026-03-22 (СЕГОДНЯ вечер, в течение 5ч)
- **Execution plan:**
  - Query 23 tours with CTR < 0.5%
  - Use AI-assisted rewriting (chatGPT/Claude)
  - Review for brand consistency
  - Publish descriptions

**Alternative executor:** `hacker` (если очень срочно, помощь в приоритизации)

---

### 4. HIGH: A/B тест динамических цен (2 недели)
**Status:** `pending` → одобрение → назначение
**Автор proposal:** AI Хакер
**Type:** `price_change` (requires review)

**Рекомендуемый исполнитель:** `hacker` (AI Хакер)
- **Причина:** Автор инициативы (growth expertise)
- **Due date:** 2026-04-05 (2 недели для полного теста)
- **Execution plan:**
  - Day 1-2: Setup A/B test infrastructure
  - Day 3-14: Control + treatment groups running
  - Day 15: Analysis + results review
  - Decision point: scale or rollback?

**Warning:** Admin должен одобрить перед стартом (price_change = review категория)

---

### 5. MEDIUM: Оптимизировать batch processing комиссий (3 дня)
**Status:** `pending` → одобрение → назначение
**Автор proposal:** AI Администратор

**Рекомендуемый исполнитель:** `admin` (AI Администратор)
- **Причина:** Автор инициативы (operational expertise)
- **Due date:** 2026-03-25 (через 3 дня)
- **Execution plan:**
  - Day 1: Architecture review + tech spec
  - Day 2: Implement paralelization
  - Day 3: Test + deploy to staging
  - Rollout: Gradual (5% → 25% → 100%)

---

## 🎯 НАЗНАЧЕНИЕ ИСПОЛНИТЕЛЕЙ (API команды)

### Если вы хотите назначить через UI:
```
https://tourhab.ru/hub/admin/agents?tab=approvals
└── Каждый proposal имеет кнопку "Назначить исполнителя"
```

### Или через API (PATCH):

```bash
# 1. Ротация API ключей — Security
curl -X PATCH https://tourhab.ru/api/agents/approvals \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "{{PROPOSAL_ID_1}}",
    "executor_agent_id": "security",
    "executor_name": "AI Служба безопасности",
    "execution_status": "assigned",
    "due_date": "2026-03-22",
    "execution_notes": "Rotate all 12 OCTO keys. Downtime 23:00-03:00 UTC+3"
  }'

# 2. Обновить T&C — Legal
curl -X PATCH https://tourhab.ru/api/agents/approvals \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "approval_id": "{{PROPOSAL_ID_2}}",
    "executor_agent_id": "legal",
    "executor_name": "AI Юрист",
    "execution_status": "assigned",
    "due_date": "2026-03-23",
    "execution_notes": "Update T&C Clause 7 weather policy + verify with 3 contracts"
  }'

# 3. Переписать 23 описания — Content
curl -X PATCH https://tourhab.ru/api/agents/approvals \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "approval_id": "{{PROPOSAL_ID_3}}",
    "executor_agent_id": "content",
    "executor_name": "AI Аудитор",
    "execution_status": "assigned",
    "due_date": "2026-03-22",
    "execution_notes": "Rewrite 23 tours with CTR < 0.5%. Use benchmark +30% lift target."
  }'

# 4. A/B тест цен — Hacker
curl -X PATCH https://tourhab.ru/api/agents/approvals \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "approval_id": "{{PROPOSAL_ID_4}}",
    "executor_agent_id": "hacker",
    "executor_name": "AI Хакер",
    "execution_status": "assigned",
    "due_date": "2026-04-05",
    "execution_notes": "A/B test: -10% dynamic pricing for <10 bookings/mo tours. Monitor conversion + rating."
  }'

# 5. Оптимизировать batch — Admin
curl -X PATCH https://tourhab.ru/api/agents/approvals \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "approval_id": "{{PROPOSAL_ID_5}}",
    "executor_agent_id": "admin",
    "executor_name": "AI Администратор",
    "execution_status": "assigned",
    "due_date": "2026-03-25",
    "execution_notes": "Parallelize commission batch processing. Reduce lag from 2.3h to 30min."
  }'
```

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ (agent_approvals)

```sql
SELECT
  id,
  action_type,
  description,
  status,
  executor_agent_id,
  execution_status,
  due_date,
  created_at
FROM agent_approvals
WHERE status IN ('pending', 'approved')
ORDER BY created_at DESC;
```

**Ожидаемый результат:**
```
id                  | action_type    | description              | status   | executor_agent_id | execution_status | due_date
────────────────────┼────────────────┼──────────────────────────┼──────────┼───────────────────┼──────────────────┼──────────────
uuid-1              | api_scope_expa | Rotate OCTO API keys     | pending  | [NULL]            | [NULL]           | [NULL]
uuid-2              | booking_change | Update T&C weather       | pending  | [NULL]            | [NULL]           | [NULL]
uuid-3              | ui_copy_change | Rewrite 23 descriptions  | pending  | [NULL]            | [NULL]           | [NULL]
uuid-4              | price_change   | A/B test dynamic pricing | pending  | [NULL]            | [NULL]           | [NULL]
uuid-5              | commission_... | Optimize batch comms     | pending  | [NULL]            | [NULL]           | [NULL]
```

---

## 🚀 ПРОЦЕСС НАЗНАЧЕНИЯ

1. **Админ видит все 5 proposals в `/hub/admin/agents?tab=approvals`**
2. **Админ кликает "Назначить исполнителя" на каждый**
3. **Выбирает из dropdown:**
   - Security (для API/auth)
   - Legal (для T&C/contracts)
   - Content (для descriptions)
   - Hacker (для growth/pricing)
   - Admin (для operations)
4. **Система обновляет:**
   - executor_agent_id → агент начинает monitor
   - execution_status → assigned → in_progress → done/failed
   - due_date → срок выполнения
   - execution_notes → progress updates

---

## ✅ РЕКОМЕНДУЕМЫЙ ПОРЯДОК ДЕЙСТВИЙ

### Сегодня (22 марта):
1. **Одобрить все 5** в UI: `/hub/admin/agents?tab=approvals` → кнопка "Approve"
2. **Назначить исполнителей:**
   - Security для API ротации (СЕГОДНЯ ночь)
   - Content для 23 описаний (THIS EVENING)
3. **Запустить выполнение:** Исполнители начнут когда статус `assigned` + `approved`

### Завтра (23 марта):
1. Legal обновляет T&C (deadline конец дня)
2. Admin планирует batch optimization sprint

### Следующие 2 недели:
1. Hacker запускает A/B test
2. Мониторим результаты

---

## 📌 ВАЖНО

**Если не назначен executor:**
- Proposal остаётся в очереди
- Агент не начнёт исполнение
- Система отправляет напоминание каждый день

**Если executor назначен:**
- Агент получает notification в Telegram
- Может обновлять статус: `assigned` → `in_progress` → `done` or `failed`
- Audit trail сохраняет все действия

**Если срок срыт (due_date прошла):**
- Система флагирует как `overdue` в UI
- Отправляет escalation в Telegram админу

---

## 🎛️ ТЕКУЩЕЕ СОСТОЯНИЕ ГОТОВНОСТИ

| Initiative | Category | Status | Executor | Due Date |
|-----------|----------|--------|----------|----------|
| API rotate | api_scope_expand | pending | **unassigned** | 2026-03-22 |
| T&C weather | booking_change | pending | **unassigned** | 2026-03-23 |
| Descriptions | ui_copy_change | pending | **unassigned** | 2026-03-22 |
| Pricing A/B | price_change | pending | **unassigned** | 2026-04-05 |
| Batch optimize | commission_change | pending | **unassigned** | 2026-03-25 |

**Status:** ✅ Все готовы к одобрению и назначению

---

**Следующий шаг:** Директор идёт на `/hub/admin/agents?tab=approvals` и назначает исполнителей. 👤
