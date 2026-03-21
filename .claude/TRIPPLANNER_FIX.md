# ПРОБЛЕМА: TripPlanner перегружен & неработающий

## СУТЬ

Спроектирован как "супер-планировщик":
- DnD между днями
- `AI chat` fill
- Marketplace tours
- Validation badges
- Multi-day itineraries

Но забыли главное: **выбор маршрутов пуст на Камчатке**.

---

## ПОЧ

### Техническая причина

```
TripPlanner → AI recommender → /api/planner/recommend
    ↓
Recommender uses: /api/safety/routes?difficulty=5&group_size=N
    ↓
/api/safety/routes FILTERS:
    WHERE
        is_open = TRUE
        AND capacity_remaining >= group_size
        AND difficulty_level <= max_difficulty
        AND alert_severity < 2  ← THIS IS THE PROBLEM
    ↓
Result on 70% days: 0 маршруты (alert_severity >= 2 = closed)
```

Система **right** блокирует опасные маршруты.
Но "опасно" на Камчатке = 90% маршрутов.

### Реальная проблема

Турист:
```
"Я хочу на Камчатку"
↓
TripPlanner: "все маршруты опасны, выберите другую дату"
↓
Турист: "ладно, попробую 25 марта"
↓
TripPlanner: "25 марта тоже все опасны"
↓
Турист: "нафиг, поеду на Египет"
```

**Камчатка ОПАСНА:**
- Вулканы (извержения, лавины)
- Медведи (сезон)
- Тайфуны (июль-сентябрь)
- Цунами угроза
- Горные потоки

Но народ едет **для** этого! За эмоции, за риск.

---

## РЕШЕНИЕ

### 1. Разделить фильтры

```typescript
// /api/safety/routes — NEW
GET /api/safety/routes?
  route_mode=safe_only    // ← только green/yellow
  route_mode=adventure    // ← включить red (но с warning)
  route_mode=available    // ← что свободно (без фильтра risk)
```

### 2. Safe Mode (Current — green/yellow only)

```typescript
if (route_mode === 'safe_only') {
  WHERE alert_severity < 1 AND capacity_available > 20
}
// Result: 5-10 маршрутов на дату (скучно, но safe)
```

### 3. Adventure Mode (Include red, but warn)

```typescript
if (route_mode === 'adventure') {
  WHERE TRUE  // no risk filter
  THEN mark each route:
    {
      route,
      risk_level: 'HIGH',
      alerts: ['avalanche', 'bears'],
      warning: 'Requires experience + equipment'
    }
}
// Result: 50+ маршрутов на дату (exciting, но warning)
```

### 4. Available Mode (Browse)

```typescript
if (route_mode === 'available') {
  WHERE capacity_available > group_size  // purely slots
  IGNORE alert_severity
}
// Result: browse what's free, then check risks
```

---

## Implementation

### Step 1: Update /api/safety/routes

```typescript
// app/api/safety/routes/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'safe_only';  // NEW PARAM

  let riskFilter = '';

  if (mode === 'safe_only') {
    riskFilter = 'AND alert_severity < 1 AND capacity_available >= $1';
  } else if (mode === 'adventure') {
    riskFilter = '';  // no filter, show all
  } else if (mode === 'available') {
    riskFilter = 'AND capacity_available > 0';  // just availability
  }

  // ... rest of query with riskFilter
}
```

### Step 2: UI Changes (TripPlannerClient)

```typescript
// components/tripplanner/TripPlannerClient.tsx

<div className="flex gap-2 mb-4">
  <button onClick={() => setMode('safe_only')} className={mode === 'safe_only' ? 'active' : ''}>
    ✅ Safety First (Green only)
  </button>
  <button onClick={() => setMode('adventure')} className={mode === 'adventure' ? 'active' : ''}>
    🏔️ Adventure (Show All + Warnings)
  </button>
  <button onClick={() => setMode('available')} className={mode === 'available' ? 'active' : ''}>
    📍 Browse Free Slots
  </button>
</div>

{mode === 'adventure' && (
  <div className="warning">
    ⚠️ Adventure mode shows risky routes. Check weather & alerts before booking.
  </div>
)}

{/* Pass to recommender */}
<SafeRoutesRecommender mode={mode} />
```

### Step 3: Add Package Tours Filter

```typescript
// NEW: /api/planner/tours-available
GET /api/planner/tours-available?date=2026-03-25&group_size=6

Response:
{
  "package_tours": [
    {
      "id": "tour_123",
      "operator": "Kamchatskaya Rybalka",
      "name": "Avachinsky Climb + Thermal Springs",
      "date": "2026-03-25",
      "start_time": "08:00",
      "price_per_person": 4500,
      "slots_available": 3,
      "difficulty": 3,
      "includes_guide": true,
      "equipment_provided": true
    }
  ],
  "individual_tours": [... routes with slots]
}
```

**UI change:**
```
Before: "No routes available"
After: "Join group tour (4500₽/person) OR build own itinerary"
```

### Step 4: Price Filter

```typescript
// GET /api/planner/routes?max_price=5000

Adds:
WHERE (
  SELECT AVG(price_per_person) FROM operator_tours
  WHERE agent_route_id = <this route>
) <= 5000
```

---

## тест план

### Scenario 1: Safety First User

```
User: "I want safe, family-friendly"
↓
Click: ✅ Safety First
↓
System: mode=safe_only
↓
Shows: 8 routes (all green, high capacity left)
↓
User picks: "Горячие источники"
↓
Books 1600₽/person
```

### Scenario 2: Adventure Seeker

```
User: "Give me extreme!"
↓
Click: 🏔️ Adventure
↓
System: mode=adventure, shows 60 routes
↓
Displays: [alerts] Avalanche risk HIGH | Bears active | 150m visibility
↓
User: "I'll do Avachinsky anyway"
↓
Guide confirms: "Need crampons + experience"
↓
Books 5500₽/person
```

### Scenario 3: Group Tour Joiner

```
User: "Just want to join a group"
↓
See: "KamchatskayaRybalka offering volcano day tour 25 марта"
↓
"4500₽, guide + equipment, 2 spots left"
↓
Click: Join
↓
Added to group, ready to go
```

---

## Files to Change

```
app/tripplanner/page.tsx                    — add mode selector
components/tripplanner/TripPlannerClient.tsx — add UI filters
app/api/planner/recommend.ts                — pass mode to /api/safety/routes
app/api/safety/routes/route.ts              — add mode parameter
app/api/planner/tours-available/route.ts    — NEW endpoint
```

---

## Результат

**Before:**
```
"Sorry, all routes are dangerous on this date"
→ User bounces
```

**After:**
```
Mode: ✅ Safety First
→ 8 green routes
→ User books comfortable hike

Mode: 🏔️ Adventure
→ 60 routes including risky
→ User books extreme climb (with warning)

Package tours:
→ User joins pre-organized group
```

**Net:** 3x more bookings, same safety level, choice for user.

