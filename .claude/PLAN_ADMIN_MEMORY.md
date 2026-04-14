# ПЛАН: Admin Memory Management System для PosPkTry

**Date:** 2026-04-14  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Author:** claude-code  
**Scope:** ~2-3 дней работы  

---

## 📌 Problem Statement (3 issues)

| # | Проблема | Решение |
|---|----------|---------|
| 1️⃣ | ❌ Админка отсутствует | ✅ 5 новых admin pages |
| 2️⃣ | ❌ Парсинг в "чёрном ящике" | ✅ Intelligence Dashboard |
| 3️⃣ | ❌ Нет управления источниками | ✅ Sources Management UI |

---

## 🎯 Solution: 6 API endpoints + 5 pages

### Backend APIs (новые эндпойнты)

```
GET    /api/admin/memory/list              → фильтруемый список
GET    /api/admin/memory/:id               → полная запись + история
POST   /api/admin/memory/inject            → manual intelligence
PATCH  /api/admin/memory/:id               → обновить запись
DELETE /api/admin/memory/:id               → удалить (manual только)

GET    /api/admin/memory/sources           → список RSS
POST   /api/admin/memory/sources           → добавить RSS
PATCH  /api/admin/memory/sources/:id       → обновить RSS
DELETE /api/admin/memory/sources/:id       → удалить RSS

GET    /api/admin/memory/stats             → статистика
GET    /api/admin/memory/agents/:id/history → история запусков
```

### Frontend Pages

1. **Memory Browser** (`/hub/admin/memory`)
   - Table с фильтрами, поиском, пагинацией
   - View/edit/delete actions
   - Edit history modal с diffs

2. **Manual Intelligence** (`/hub/admin/memory/inject`)
   - Form для создания сигналов
   - Preview + submit

3. **Sources Management** (`/hub/admin/memory/sources`)
   - CRUD RSS источников
   - Test RSS button

4. **Intelligence Dashboard** (`/hub/admin/memory/intelligence`)
   - Stats cards (total, by domain, by tier)
   - Timeline chart (30 дней)
   - Edit activity

5. **Enhanced Agents Panel** (upgrade существующей)
   - Last 10 runs per agent
   - Manual trigger
   - Agent memory view

---

## 💾 Database

**Новые таблицы:**
- `intelligence_sources` — управление RSS/API источниками
- `agent_run_history` — История запусков агентов

---

## ⏱ Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| **1** | 6 новых API endpoints | 3-4ч |
| **2** | 5 новых pages + 1 upgrade | 4-5ч |
| **3** | DB migrations + seed | 1-2ч |

**Total:** ~2-3 дней

---

## ✅ After Implementation

- ✅ Админ видит ВСЕ memories (8000+) с поиском/фильтрами
- ✅ Админ видит результаты парсинга в реалтайме
- ✅ Админ управляет RSS источниками (add/edit/delete)
- ✅ Админ может inject custom сигналы
- ✅ Админ видит историю агентов (последние 30 запусков)
- ✅ По принципу Bright Data: структурировано, масштабируемо

---

## 📁 Critical Files

**New:**
- `/app/api/admin/memory/list/route.ts`
- `/app/api/admin/memory/[id]/route.ts`
- `/app/api/admin/memory/inject/route.ts`
- `/app/api/admin/memory/sources/route.ts`
- `/app/hub/admin/memory/page.tsx` + `_MemoryBrowserClient.tsx`
- `/app/hub/admin/memory/inject/page.tsx`
- `/app/hub/admin/memory/sources/page.tsx`
- `/app/hub/admin/memory/intelligence/page.tsx`

**Upgrade:**
- `/app/hub/admin/agents/_AgentsClient.tsx` (add run history)

**Database:**
- `/migrations/XXX_intelligence_sources.sql`
- `/migrations/XXX_agent_run_history.sql`

---

See `.claude/MEMORY.md` for current system architecture.
