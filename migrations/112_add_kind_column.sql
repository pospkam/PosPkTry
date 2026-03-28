-- Migration 112: Add `kind` column to agent_route_knowledge
-- Establishes 3-tier hierarchy: place → route → tour
--
-- place  — geographic point of interest (volcano, spring, lake, forest…)
-- route  — a path / hiking / climbing / rafting route
-- tour   — commercial packaged product (helicopter flight, fishing trip, bear watching…)
--
-- Default is 'place' — safe fallback for anything not explicitly classified.

ALTER TABLE agent_route_knowledge
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'place';

-- ── Tours (commercial / activity packages) ───────────────────────────────────
UPDATE agent_route_knowledge SET kind = 'tour'
WHERE category IN (
  'morskie_progulki',   -- sea cruises
  'rybalka',            -- fishing
  'рыбалка',            -- fishing (cyrillic duplicate)
  'medvedi',            -- bear watching
  'snegohod',           -- snowmobile
  'vertoletnye_tury',   -- helicopter tours
  'dzhip',              -- jeep safari
  'зимние_туры',        -- winter tours
  'дикая_природа',      -- wildlife tours
  'дайвинг',            -- diving
  'экстрим',            -- extreme sports
  'этнография',         -- ethnography tours
  'комбинированный',    -- combined packages
  'splav'               -- rafting (packaged trip)
);

-- ── Routes (paths / itineraries to follow on foot or by other means) ──────────
UPDATE agent_route_knowledge SET kind = 'route'
WHERE category IN (
  'trekking',           -- trekking routes
  'треккинг',           -- trekking (cyrillic duplicate)
  'восхождения'         -- volcano / mountain ascents
);

-- ── Everything else stays kind='place' (the DEFAULT) ─────────────────────────
-- vulkani, termalnye_istochniki, lakes, geyzery, rivers, mountains, eco,
-- historical, nature_reserve, nature_park, monument, museum, geo, thermal, other

-- Index for fast filtering by map / routes / tours pages
CREATE INDEX IF NOT EXISTS idx_ark_kind ON agent_route_knowledge (kind);

-- Sanity check
SELECT kind, COUNT(*) AS cnt FROM agent_route_knowledge GROUP BY kind ORDER BY cnt DESC;
