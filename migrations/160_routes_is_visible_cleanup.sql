-- Migration 160: Add is_visible to kamchatka_routes + hide commercial garbage
--
-- Problems fixed:
--   1. kamchatka_routes has no is_visible column — all 294 rows always show on /routes
--   2. 95 idilesom/idilesom.com records are commercial tour products (lat=0), not routes
--   3. 10 more commercial-named routes from other sources
--   4. VIEW agent_route_knowledge hardcodes true for kamchatka_routes — rebuilt here
--
-- Result: 294 → ~199 visible routes in kamchatka_routes
-- Idempotent: safe to run multiple times

-- ── Step 1: Add is_visible to kamchatka_routes ────────────────────────────────
ALTER TABLE kamchatka_routes
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

-- ── Step 2: Hide all idilesom records (commercial tour products, not routes) ──
-- idilesom / idilesom.com imported 95 commercial tour packages.
-- They are NOT geographic routes — they are products sold by tour operators.
-- Most have lat=0.0 (fake coordinates). All should be hidden from the catalog.
UPDATE kamchatka_routes
SET    is_visible = false
WHERE  source_name IN ('idilesom', 'idilesom.com');

-- ── Step 3: Hide remaining commercial-named routes from other sources ──────────
UPDATE kamchatka_routes
SET    is_visible = false
WHERE  is_visible = true
  AND  source_name NOT IN ('idilesom', 'idilesom.com')
  AND (
        -- "тур" / "туры" as standalone word
        title ~* '\mтур[аыуеовамиахй]?\M'
        -- Excursion label
     OR title ~* 'экскурс'
        -- Adventure package
     OR title ~* 'приключени'
        -- "Знакомство с …" sales copy
     OR title ~* 'знакомство с'
        -- Compound tour words
     OR title ~* '-тур'
        -- Transfer service
     OR title ~* 'трансфер'
        -- Ski touring product
     OR title ~* 'скитур'
        -- Multi-day package labels
     OR title ~* '\d+\s*(дней|ночей|дня|ночи|день|ночь)'
  )
  AND NOT title ILIKE 'Скала Тур';

-- ── Step 4: Rebuild agent_route_knowledge VIEW to use r.is_visible ─────────────
-- Previously the VIEW hardcoded "true AS is_visible" for kamchatka_routes.
-- Now it reads the actual column value, so hiding works without schema changes.
CREATE OR REPLACE VIEW agent_route_knowledge AS
  SELECT
    p.ark_id                          AS id,
    NULL::text                        AS route_dedupe_key,
    NULL::uuid                        AS route_id,
    p.category,
    p.name                            AS title,
    p.description,
    p.lat,
    p.lng,
    p.source_url,
    p.source_name,
    NULL::tsvector                    AS search_text,
    '{}'::jsonb                       AS payload,
    NULL::text                        AS source_hash,
    NULL::timestamptz                 AS source_updated_at,
    NULL::timestamptz                 AS last_synced_at,
    p.created_at,
    p.updated_at,
    p.is_visible,
    p.location_type,
    p.activity_type,
    NULL::text                        AS kuzmich_review,
    p.zone,
    'place'::text                     AS kind,
    p.search_count
  FROM places p
UNION ALL
  SELECT
    COALESCE(r.ark_id, r.id)          AS id,
    r.dedupe_key                      AS route_dedupe_key,
    NULL::uuid                        AS route_id,
    r.category,
    r.title,
    r.description,
    r.lat,
    r.lng,
    r.source_url,
    r.source_name,
    NULL::tsvector                    AS search_text,
    COALESCE(r.metadata, '{}'::jsonb) AS payload,
    NULL::text                        AS source_hash,
    NULL::timestamptz                 AS source_updated_at,
    NULL::timestamptz                 AS last_synced_at,
    r.created_at,
    r.updated_at,
    r.is_visible,
    NULL::character varying           AS location_type,
    r.activity_type,
    NULL::text                        AS kuzmich_review,
    r.zone,
    'route'::text                     AS kind,
    r.search_count
  FROM kamchatka_routes r;

-- ── Sanity check ───────────────────────────────────────────────��──────────────
SELECT
  source_name,
  COUNT(*)                                   AS total,
  COUNT(*) FILTER (WHERE is_visible = true)  AS visible,
  COUNT(*) FILTER (WHERE is_visible = false) AS hidden
FROM kamchatka_routes
GROUP BY source_name
ORDER BY total DESC;

INSERT INTO _migrations (name)
VALUES ('160_routes_is_visible_cleanup.sql')
ON CONFLICT (name) DO NOTHING;
