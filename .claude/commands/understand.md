Perform a deep scan of the entire codebase and produce an interactive knowledge graph summary. Follow these steps:

## 0. Persistence (required)

After the scan, save a machine-readable graph file at:

`.understand-anything/knowledge-graph.json`

If `.understand-anything/` does not exist, create it first.

The JSON must include at least:
- `version`
- `generatedAt`
- `project` (name, stack, frameworks)
- `layers` (architecture layers)
- `nodes` (files/modules/services/components)
- `edges` (imports/calls/depends_on)
- `tour` (suggested onboarding path)

## 1. Project Architecture Scan

Explore the following dimensions in parallel:

**Pages & Routes**
- List all pages in `app/` (Next.js App Router) with their paths and purpose
- Map API endpoints from `app/api/` — group by domain (auth, operator, tours, bookings, AI, etc.)
- Identify protected vs public routes

**Components**
- Catalog all components in `components/` by category
- For each category identify: purpose, key props, dependencies
- Highlight "smart" components (with data fetching) vs "dumb" (presentational)

**Data Layer**
- List all DB tables inferred from `lib/types/db-rows.ts` and migrations
- Map service files in `lib/services/` to their DB tables
- Show table relationships (FKs, joins)

**Business Logic**
- Summarize each service in `lib/services/`
- Identify key algorithms (AI waterfall, rate limiting, SOS flow, booking with departures)
- List all external integrations (Telegram, CloudPayments, Weather APIs, AI providers)

**State & Auth**
- Map React contexts (`contexts/`)
- Describe auth flow: JWT creation → middleware → role enforcement
- List all roles and their permissions

## 2. Knowledge Graph Output

Output a structured knowledge graph in this format:

```
KAMHUB KNOWLEDGE GRAPH
======================

[ENTRY POINTS]
  app/page.tsx ──── _HomePageClient.tsx
  app/hub/* ──── per-role dashboards
  app/api/* ──── 256 API endpoints

[CORE MODULES]
  lib/database.ts ──── query wrapper
  lib/db-pool.ts ──── { pool } connection
  lib/auth.ts ──── JWT verify/create
  lib/auth/middleware.ts ──── requireAuth/requireRole
  ...

[DOMAIN CLUSTERS]
  TOURS: tours table → tour_departures → bookings
  AI: providers.ts → waterfall → RAG (agent_route_knowledge)
  SAFETY: SOSButton → /api/safety/sos → notifications
  ...

[EXTERNAL INTEGRATIONS]
  Telegram @KuzmichKam_bot
  CloudPayments (HMAC-SHA256)
  Yandex Weather / OpenWeatherMap / WeatherAPI
  6× AI providers (waterfall)
  Yandex Maps
  AWS S3
```

Also provide a short confirmation that the graph was persisted to `.understand-anything/knowledge-graph.json`.

## 3. Health Check

After mapping, quickly flag:
- Any `any` type usage (violations of strict TypeScript)
- Components importing directly from `kamchatka_routes` (should use view)
- Default pool imports (should be named `{ pool }`)
- Emoji in UI code (forbidden by project rules)
- Hardcoded hex colors (should use CSS vars)

## 4. Summary Table

End with a summary table:

| Metric | Count |
|--------|-------|
| Pages | ? |
| API endpoints | ? |
| Components | ? |
| DB tables | ? |
| Services | ? |
| Migrations | ? |
| AI providers | ? |
| User roles | ? |

Scan thoroughly. Be specific with file paths.
