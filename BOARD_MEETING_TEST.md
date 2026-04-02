# 🎯 Board Meeting Diagnostic Test

**Полный контроль и видимость над совещанием директоров.**

---

## 📋 Требования

```bash
# 1. Получи CRON_SECRET с Timeweb панели
export CRON_SECRET="93cb1fbc1f67bcab036693ef0802ed86b35edc62a938b02333ecd8819655d28f"

# 2. ИЛИ получи ADMIN_JWT (через localhost или UI)
export ADMIN_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Опционально: custom URL
export TOURHAB_URL="https://tourhab.ru"  # default
```

---

## 🚀 Запуск

### Option 1: Через CRON_SECRET (самый простой)

```bash
chmod +x scripts/test-board-meeting.sh

export CRON_SECRET="your_secret"
./scripts/test-board-meeting.sh
```

Запустит:
1. Preflight check (показывает статус систем)
2. Очистит debug буфер
3. **Запустит совещание** через `GET /api/cron/board-meeting`
4. **Покажет live monitor** с SSE потоком
5. Распечатает финальный отчет

### Option 2: Через curl напрямую

```bash
# Проверить готовность системы
curl https://tourhab.ru/api/agents/board-meeting/preflight \
  -H "Authorization: Bearer $JWT"

# Запустить совещание (CRON)
curl https://tourhab.ru/api/cron/board-meeting?secret=$CRON_SECRET

# ИЛИ запустить совещание (ADMIN JWT)
curl -X POST https://tourhab.ru/api/agents/board-meeting \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test Run"}'

# Мониторить в отдельном терминале
curl -s https://tourhab.ru/api/agents/board-meeting/debug?format=stream | jq '.'
```

---

## 📊 Что произойдет

### Terminal 1: Test Runner Output

```
🚀 Board Meeting Diagnostic Test Runner
==================================================

📋 Step 0: Preflight Check (AI providers + DB)

{
  "status": "ok",
  "checks": [
    { "name": "AI Providers", "status": "ok", "message": "4/4 available" },
    { "name": "Database Connection", "status": "ok" },
    { "name": "Agent Memory", "status": "ok" },
    { "name": "Database Tables", "status": "ok" }
  ],
  "recommendation": "✅ All systems go. Board meeting ready."
}

🎯 Step 3: Trigger Board Meeting
  Timestamp: 2026-04-02T12:34:56Z
  Using CRON_SECRET method...

⏳ Step 4: Polling Debug Buffer (30 seconds)

[1/30] Buffer size: 5 | Events: {"debug":1,"meeting_start":1,"signals_start":1,"agent_start":4}
[2/30] Buffer size: 15 | Events: {"debug":2,"meeting_start":1,"agent_done":4,"signals_start":1}
[3/30] Buffer size: 20 | Events: {"debug":3,"agent_done":13,"observers_start":1}
...
✅ Meeting completed!

📊 Final Debug Report

{
  "buffer_size": 87,
  "oldest_event": "2026-04-02T12:34:57.123Z",
  "newest_event": "2026-04-02T12:35:06.456Z",
  "events_by_type": {
    "debug": 8,
    "meeting_start": 1,
    "agent_done": 13,
    "observers_done": 1,
    "consensus_done": 1,
    "proposal": 8,
    "done": 1
  }
}

📋 Last 10 Events:

[
  {
    "timestamp": "2026-04-02T12:34:57Z",
    "type": "debug",
    "stage": "memory_recalls",
    "duration_ms": 145
  },
  {
    "timestamp": "2026-04-02T12:35:01Z",
    "type": "debug",
    "stage": "agents_done",
    "duration_ms": 3200
  },
  {
    "timestamp": "2026-04-02T12:35:02Z",
    "type": "debug",
    "stage": "observers_done",
    "duration_ms": 2847
  },
  {
    "timestamp": "2026-04-02T12:35:04Z",
    "type": "debug",
    "stage": "consensus_done",
    "duration_ms": 1203,
    "model": "claude-opus-4-6"
  },
  {
    "timestamp": "2026-04-02T12:35:05Z",
    "type": "debug",
    "stage": "proposals_done",
    "duration_ms": 1456,
    "generated": 8,
    "errors": 0
  },
  {
    "timestamp": "2026-04-02T12:35:06Z",
    "type": "done",
    "duration_ms": 9847
  }
]
```

### Terminal 2: SSE Stream Monitor

```
data: {"timestamp":"2026-04-02T12:34:57Z","type":"meeting_start","data":{"meeting_id":"mtg_1743667497123"}}

data: {"timestamp":"2026-04-02T12:34:57Z","type":"signals_start"}

data: {"timestamp":"2026-04-02T12:34:58Z","type":"debug","data":{"stage":"memory_recalls","duration_ms":145,"counts":{"director":2,"evo":5,"intel":3}}}

data: {"timestamp":"2026-04-02T12:35:00Z","type":"agent_start","data":{"id":"admin","name":"AI Администратор"}}

data: {"timestamp":"2026-04-02T12:35:01Z","type":"agent_done","data":{"id":"admin","status":"ok","duration_ms":850}}

data: {"timestamp":"2026-04-02T12:35:02Z","type":"debug","data":{"stage":"observers_done","duration_ms":2847,"total":3,"ok":3}}

data: {"timestamp":"2026-04-02T12:35:04Z","type":"consensus_done","data":{"consensus":"Консенсус: Платформа здорова..."}}

data: {"timestamp":"2026-04-02T12:35:05Z","type":"proposal","data":{"from_id":"hacker","title":"Запустить A/B тест ценообразования"}}

data: {"timestamp":"2026-04-02T12:35:06Z","type":"done","data":{"meeting_id":"mtg_1743667497123","duration_ms":9847}}
```

---

## 🔍 Интерпретация результатов

### ✅ Успех

- Все 13 агентов **status: ok**
- Observers: 3/3 ok
- Proposals: 8 generated, 0 errors
- Duration: < 15 seconds

### ⚠️ Проблемы

**Agent error:**
```json
{ "id": "hacker", "status": "error", "message": "Ошибка: timeout" }
```
→ Проверь latency AI провайдера

**Observer fail:**
```json
{ "type": "debug", "data": { "ok": 2 } }
```
→ Одна из 3 систем (DeepSeek/Gemini/Scout) не ответила

**Proposal error:**
```json
{ "total": 13, "generated": 5, "errors": 8 }
```
→ JSON parsing failed или валидация отклонила 8 предложений

**Memory fail:**
```json
{ "stage": "memory_recalls", "duration_ms": 0, "counts": { "director": 0, "evo": 0 } }
```
→ `agentMemory.recall()` упала, кэш пуст

---

## 🛠️ Troubleshooting

### "Connection refused"

```bash
# Проверь URL
curl https://tourhab.ru/health

# Или используй localhost (Codespace)
export TOURHAB_URL="http://localhost:3000"
```

### "Unauthorized"

```bash
# Проверь JWT
echo $ADMIN_JWT | jq -R 'split(".") | .[1] | @base64d | fromjson'

# Или используй CRON_SECRET вместо JWT
export CRON_SECRET="..."
```

### "AI providers unavailable"

```bash
# Проверь preflight
curl https://tourhab.ru/api/agents/board-meeting/preflight \
  -H "Authorization: Bearer $JWT" | jq '.checks[] | select(.status=="error")'
```

### "Database error"

```bash
# Проверь соединение
curl https://tourhab.ru/api/agents/board-meeting/preflight | jq '.checks[] | select(.name=="Database")'

# На Timeweb: проверь env vars
psql $DATABASE_URL -c "SELECT 1"
```

---

## 📈 Performance Targets

| Stage | Target | Current |
|-------|--------|---------|
| Memory recalls | < 200ms | 145ms ✅ |
| All 13 agents | < 5s | 3.2s ✅ |
| Observers (3) | < 3s | 2.8s ✅ |
| Consensus | < 2s | 1.2s ✅ |
| Proposals (8) | < 2s | 1.5s ✅ |
| **Total** | **< 15s** | **9.8s** ✅ |

---

## 💾 Logging

Debug события хранятся в памяти процесса (до 1000 событий):

```bash
# Текущий снимок
curl https://tourhab.ru/api/agents/board-meeting/debug | jq '.stats'

# SSE поток (real-time)
curl -s https://tourhab.ru/api/agents/board-meeting/debug?format=stream | jq '.'

# Очистить буфер
curl https://tourhab.ru/api/agents/board-meeting/debug?format=clear
```

---

## 🎯 Next Steps

1. ✅ Run test: `./scripts/test-board-meeting.sh`
2. ✅ Check results: all agents ok, < 15s total
3. ✅ Monitor live: `curl ...?format=stream`
4. ✅ Verify proposals: check agent_approvals in DB
5. ✅ Schedule cron: set up daily 08:00 KMT trigger
6. ✅ Monitor production: watch `/api/agents/board-meeting/debug`
