# AI Direction Platform — Why Broken + How to Fix

## STATUS REPORT

### Designed (3 intents per role)

**Admin intents:**
- `read_tours` — see all tours
- `read_bookings` — see all bookings
- `read_agents` — see all agents

**Operator intents:**
- `read_tours` — see my tours
- `read_bookings` — see my bookings
- `create_tour` — create new tour
- `fill_ai` — AI fill fields
- `add_slots` — batch add dates

**Tourist intent:**
- `search_tours` — search + recommend

**Implemented:**
- ✅ `/api/agents/dispatch` — route intent to handler
- ✅ `/api/agents/health` — system health

**Missing:**
- ❌ Intent handlers (only `dispatch` stub)
- ❌ UI forms to trigger intents
- ❌ Permission model (who can call what)
- ❌ Real operator testing

---

## WHY BROKEN

### 1. No Operator Testing

**Current:** Designed for KamchatskayaRybalka operator
**Reality:** Operator was supposed to test, hasn't

**Blocker:**
- Can't know if `op_create_tour` works until real person uses it
- Can't validate UI without real use case

### 2. Missing UI

**Design:** Each intent needs a form
```
op_create_tour → Form: title, description, date, price, capacity
op_fill_ai → Form: (empty) paste tour text, click "AI fill"
op_add_slots → Form: date range, repeat pattern, capacity
```

**Reality:** Forms don't exist (only API exists)

### 3. No Permission Model

**Needed:** Check that operator can only call `op_*` intents, not `admin_*`

**Current:** Anyone can call anything (security risk)

```typescript
// lib/ai/permissions.ts — MISSING

export const INTENT_PERMISSIONS = {
  'admin_read_tours': ['admin'],
  'op_create_tour': ['operator'],
  'op_fill_ai': ['operator'],
  'tourist_search': ['tourist', 'anonymous'],
};

// /api/agents/dispatch — should check this
```

### 4. No Feedback Loop

**Needed:** After AI fills fields, system should:
1. Show what AI generated
2. Let operator edit/approve
3. Save or reject

**Current:** No UI to see result

---

## FIX ROADMAP

### Phase 1: Permission Model (TODAY — 1 hour)

```typescript
// lib/ai/permissions.ts
export const INTENT_PERMISSIONS: Record<string, string[]> = {
  'admin_read_tours': ['admin'],
  'admin_read_bookings': ['admin'],
  'operator_read_tours': ['operator'],
  'operator_create_tour': ['operator'],
  'operator_fill_ai': ['operator'],
  'tourist_search_tours': ['tourist', 'user'],
};

export function canCallIntent(userRole: string | null, intentName: string): boolean {
  const allowed = INTENT_PERMISSIONS[intentName] || [];
  return allowed.includes(userRole || 'anonymous');
}

// /api/agents/dispatch
export async function POST(req: Request) {
  const intent = body.intent;
  const userRole = req.user?.role;

  if (!canCallIntent(userRole, intent)) {
    return Response.json(
      { error: 'Permission denied' },
      { status: 403 }
    );
  }

  // ... proceed
}
```

### Phase 2: Operator UI Form (1-2 days)

Create `/hub/operator/ai-assist` page:

```tsx
// app/hub/operator/ai-assist/page.tsx

export default function AIAssist() {
  return (
    <div className="ds-page">
      <h1>AI Create Tour</h1>

      <textarea
        placeholder="Paste tour description or copy from competitor website"
        value={tourText}
      />

      <button onClick={() => callAgent('op_fill_ai', { text: tourText })}>
        ✨ AI Fill Fields
      </button>

      {aiResult && (
        <div>
          <h2>AI Generated:</h2>
          <form onSubmit={saveTour}>
            <input name="title" defaultValue={aiResult.title} />
            <textarea name="description" defaultValue={aiResult.description} />
            <input name="price" defaultValue={aiResult.price} />
            <input name="date" defaultValue={aiResult.date} />
            <button type="submit">Save Tour</button>
          </form>
        </div>
      )}
    </div>
  );
}
```

### Phase 3: Operator Testing (ongoing)

**Contact KamchatskayaRybalka:**
1. Send login
2. Guide through "AI Create Tour" flow
3. Let them create 1-2 tours
4. Collect feedback

### Phase 4: Scale Other Intents (next week)

Once op_fill_ai works:
- Add op_create_tour full form
- Add op_add_slots batch editor
- Add admin_read_tours dashboard
- Add tourist_search UI

---

## Quick Check: Why Broken

```
/api/agents/dispatch endpoint exists
    ↓
But handlers are stubs
    ↓
No permission check (security risk)
    ↓
No operator UI (can't be tested)
    ↓
No real operator tested it
    ↓
Result: System designed but never run
```

---

## Minimal To Fix (Get 1 Intent Working)

### Option A: Fast (2 hours)

1. Add permission check to /api/agents/dispatch
2. Create simple form: textarea + button
3. Test with KamchatskayaRybalka manually
4. Iterate based on feedback

### Option B: Full (2 days)

1. Permission model
2. Full UI page
3. Feedback loop (show AI result, edit, approve)
4. Auto-save to DB
5. Real operator test

---

## Files To Create/Change

```
lib/ai/permissions.ts              — NEW permission model
lib/ai/handlers/op-fill-ai.ts      — NEW real handler (not stub)
app/hub/operator/ai-assist/page.tsx — NEW UI form
app/api/agents/dispatch/route.ts    — CHANGE add permissionCheck
app/api/agents/feedback/route.ts    — NEW log operator feedback
```

---

## Why It Matters

**Current:**
- 10 intents designed but 0 working
- Looks like "finished" but isn't

**Need:**
- 1 intent fully working (op_fill_ai)
- Real operator using it
- Feedback → iterate

This is **credibility**. Show working intent > show 10 stubs.

