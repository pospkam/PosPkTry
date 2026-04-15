# KamchatourHub — План развития

> Репо: **PosPkTry** → `tourhab.ru`
> Обновлено: 15 апреля 2026

---

## Репозитории

| Репо | Назначение | Деплой |
|------|-----------|--------|
| **PosPkTry** | Основная платформа: туристы, операторы, агенты | tourhab.ru |
| **tourhab-operator** | Отдельный MAX-бот для операторов (Камчатская рыбалка) | отдельный деплой |

---

## Текущий статус (апрель 2026)

| Компонент | Статус |
|-----------|--------|
| TypeScript build | ✅ 0 ошибок |
| Timing attacks (8 cron endpoints) | ✅ закрыты |
| Scout-Innovator agent | ✅ создан |
| Agent run history (миграция 143) | ✅ применена в проде |
| Admin agents UI + trigger | ✅ `/hub/admin/agents` |
| RSS retry 3x + TTL 30д | ✅ |
| Оператор `/partner EMAIL` (Telegram + MAX) | ✅ ожидает тестирования |
| Watchdog → Brain patterns | ✅ |
| Инструкция для операторов | ✅ `/hub/operator/help` |

---

## Следующие задачи (очередь)

### 1. Brain UI — `/hub/admin/brain` ⭐ ВЫСОКИЙ
**Что:** Страница просмотра `agent_knowledge` — что агенты накопили
**Зачем:** Сейчас Brain пишет, никто не читает — "чёрный ящик"
**Что показывать:**
- Список страниц по типу (intel / pattern / decision / operator / route)
- Поиск по slug и compiled_truth
- Детальная карточка: compiled_truth + timeline + metadata
- Счётчик страниц, последнее обновление

**Файлы:**
- `app/hub/admin/brain/page.tsx` (server)
- `app/hub/admin/brain/_BrainClient.tsx` (client)
- `app/api/admin/brain/route.ts` (GET list + search)
- `app/api/admin/brain/[slug]/route.ts` (GET detail)

---

### 2. Watchdog → прямые сообщения операторам ⭐ ВЫСОКИЙ
**Что:** После регистрации через `/partner EMAIL` — Watchdog сам пишет оператору при просроченном бронировании
**Зачем:** Сейчас алерт уходит только в TELEGRAM_CHAT_ID (admin). Оператор узнаёт последним.
**Условие:** Сначала надо протестировать `/partner EMAIL` и убедиться что операторы регистрируются

**Изменения:**
- `lib/agents/watchdog.ts` → `checkOperatorNoResponse()`: если у оператора есть `telegram_chat_id` — слать напрямую через `tgSend(operatorChatId, message)`
- Отдельная функция `tgSendTo(chatId, text)` — отправка не в дефолтный чат, а в конкретный

---

### 3. Голос через Groq Whisper ⭐ СРЕДНИЙ
**Что:** Замена Gemini transcribe на Groq Whisper API
**Зачем:** Gemini часто не транскрибирует голосовые — пользователи получают «Не разобрал голосовое»
**Файлы:** `lib/ai/providers.ts` + `app/api/telegram/kuzmich/route.ts` + `app/api/max/kuzmich/route.ts`
**Env var:** `GROQ_API_KEY`

---

### 4. RSS-источники в БД (Phase 3) — НИЗКИЙ / ОТЛОЖЕНО
**Что:** Перенести список RSS URL из кода в таблицу `agent_rss_sources`
**Зачем:** Добавлять источники без деплоя
**Решение:** Сознательно пропущено — сейчас только 4 источника, усложнение не оправдано
**Статус:** Открыть когда источников станет 10+

---

## Протестировать вручную

- [ ] `/partner EMAIL` в Telegram (`@KuzmichKam_bot`)
- [ ] `/partner EMAIL` в MAX
- [ ] Страница `/hub/admin/agents` — запустить агента, проверить историю запусков
- [ ] Brain записи: проверить что watchdog пишет `patterns/operators/*` после срабатывания

---

## Ключевые файлы агентной системы

| Файл | Назначение |
|------|-----------|
| `lib/agents/watchdog.ts` | Мониторинг 30 мин |
| `lib/agents/scout-digest.ts` | RSS дайджест 07:00 UTC |
| `lib/agents/scout-innovator.ts` | Предложения из Brain 06:00 UTC |
| `lib/services/intelligence-monitor.service.ts` | Intel сбор каждые 6ч |
| `lib/agents/memory/agent-knowledge.ts` | Brain (постоянная память) |
| `lib/agents/memory/agent-memory.ts` | Рабочая память (TTL 30д) |
| `lib/agents/run-logger.ts` | Логирование запусков агентов |
| `lib/kuzmich/core.ts` | Мозг Кузьмича |
| `lib/kuzmich/operator-chat.ts` | AI для операторов + регистрация |
