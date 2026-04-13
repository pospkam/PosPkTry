# TourHab -- AI-powered tourism platform for Kamchatka

**[tourhab.ru](https://tourhab.ru)** | Solo-dev full-stack project

Tourism platform connecting travelers with verified local operators across Kamchatka peninsula. AI-first approach: from trip planning to booking to safety alerts.

---

## What it does

- **Kuzmich AI** -- multi-channel assistant (Telegram, web widget, full-page chat). Understands photos (vision), voice messages (transcription), recommends tours, handles bookings inline
- **260+ routes** -- hiking, volcanoes, fishing, bear watching, helicopter tours, rafting, thermal springs, diving, snowmobiles
- **Inline booking** -- tourist describes what they want in natural language, AI matches the tour, collects details, creates booking, notifies operator
- **Operator dashboards** -- booking management, earnings, tour editor, calendar
- **Safety system** -- SOS button, route danger warnings, MChS integration
- **AI agents** -- Watchdog (stale bookings alerts), Editor (tour description enrichment), Scout Digest (industry news aggregation)

## Architecture

```
Next.js 15 App Router + TypeScript strict
PostgreSQL (raw SQL, no ORM)
JWT auth + role-based middleware
AI waterfall (OpenRouter -> DeepSeek -> Gemini -> MiniMax -> Anthropic)
Telegram Bot API (Kuzmich + operator notifications)
Timeweb Cloud deploy (auto-deploy on push)
```

### Scale

| Metric | Count |
|--------|-------|
| TypeScript files | 1,700+ |
| API routes | 445 |
| UI components | 143 |
| SQL migrations | 115 |
| Lines of code | 365k+ |
| Tour routes in DB | 260+ |

### Key modules

```
app/
  kuzmich/              -- AI chat (full-page)
  marketplace/          -- Tour catalog
  routes/[id]/          -- Tour detail + affiliate blocks
  hub/admin/            -- Platform admin (analytics, operators, content)
  hub/operator/         -- Operator dashboard (bookings, tours, earnings)
  hub/tourist/          -- Tourist profile (bookings, favorites)
  hub/safety/           -- Safety center
  api/telegram/kuzmich/ -- Telegram webhook
  api/ai/               -- AI endpoints (chat, stream, vision)
  api/payments/         -- Payment processing

lib/
  kuzmich/core.ts       -- Kuzmich brain (agent loop, tools, booking flow)
  ai/providers.ts       -- AI provider waterfall (6 providers, auto-failover)
  agents/               -- Background agents (watchdog, editor, scout)
  services/             -- Domain services (insurance, flights, hotels, transfers)

components/
  homepage/             -- Landing (Hero, BentoGrid, LiveFeed, Marquee)
  kuzmich/              -- Chat widget + inline booking
  marketplace/          -- Catalog, filters, cards
  routes/               -- Affiliate blocks (flights, hotels, insurance)
```

## Design system

Warm, earthy, premium. No glassmorphism, no cyberpunk.

- **Fonts**: Playfair Display (headings) + Outfit (body)
- **Palette**: CSS custom properties with full dark mode support
- **Accent**: `#D44A0C` (volcanic orange)
- **Components**: `ds-card`, `ds-btn`, `ds-input`, `ds-badge`, `ds-skeleton`
- **Icons**: lucide-react only

## AI stack

Kuzmich uses a multi-level architecture:

1. **Tool-use agent loop** -- 4 tools (search tours, get place info, get weather, search Kamchatka knowledge base). Up to 4 tool calls per turn
2. **Waterfall fallback** -- if agent loop fails, falls back to simple completion with tour context
3. **Vision** -- photo recognition via Gemini (through OpenRouter)
4. **Voice** -- transcription via Gemini, then standard processing
5. **Memory** -- per-user notes synthesized every 5 messages, stored in DB
6. **Booking detection** -- NLU triggers inline booking flow with context-aware tour matching

## Local development

```bash
git clone https://github.com/pospkam/PosPkTry.git
cd PosPkTry
npm install
cp .env.example .env.local  # fill in DATABASE_URL, OR_API_KEY, etc.
npm run dev
```

### Required env vars

```
DATABASE_URL          -- PostgreSQL connection string
OR_API_KEY            -- OpenRouter API key (primary AI provider)
DEEPSEEK_API_KEY      -- DeepSeek fallback
JWT_SECRET            -- Auth signing key
TELEGRAM_BOT_TOKEN    -- Kuzmich bot token
```

### Commands

```bash
npm run dev           # Dev server
npm run build         # Production build
npx tsc --noEmit      # Type check
npm test              # Tests
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + design tokens |
| Database | PostgreSQL (parameterized SQL) |
| Auth | JWT + role middleware |
| AI | OpenRouter, DeepSeek, Gemini, MiniMax, Anthropic |
| Payments | Tochka Bank QR |
| Bot | Telegram Bot API |
| Deploy | Timeweb Cloud |
| CI/CD | GitHub auto-deploy |

## Status

Production. Solo project, actively developed.

**Live**: [tourhab.ru](https://tourhab.ru)

---

Built for Kamchatka. Where volcanoes meet the ocean.
