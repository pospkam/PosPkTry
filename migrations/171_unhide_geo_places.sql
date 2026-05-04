-- Migration 171: Unhide real geographic places; strip source references from all visible places
--
-- Logic:
--   idilesom.com  → individual place pages, all are geographic objects → unhide all with coords
--   idilesom      → mixed: unhide only those whose name matches geographic keywords
--   Tour operators (kamchatintour.ru, sputnik8.com, etc.) → keep hidden

-- ── 1. Unhide all idilesom.com geographic places ─────────────────────────────
UPDATE places SET is_visible = true
WHERE source_name = 'idilesom.com'
  AND is_visible = false
  AND lat IS NOT NULL AND lng IS NOT NULL;

-- ── 2. Unhide idilesom (no .com) by geographic name patterns ─────────────────
UPDATE places SET is_visible = true
WHERE source_name = 'idilesom'
  AND is_visible = false
  AND lat IS NOT NULL AND lng IS NOT NULL
  AND (
    name ILIKE '%источник%'   OR name ILIKE '%термальн%'
    OR name ILIKE '%озеро %'  OR name ILIKE '% озеро%'
    OR name ILIKE '%вулкан %' OR name ILIKE '% вулкан%'
    OR name ILIKE '%сопка%'
    OR name ILIKE '%водопад%'
    OR name ILIKE '%гора %'   OR name ILIKE '% гора %'
    OR name ILIKE '%горный массив%'
    OR name ILIKE '%перевал%'
    OR name ILIKE '%мыс %'    OR name ILIKE '% мыс%'
    OR name ILIKE '%бухта%'
    OR name ILIKE '%скала%'   OR name ILIKE '%скалы%'
    OR name ILIKE '%нарзан%'
    OR name ILIKE '%маяк%'
    OR name ILIKE '%пещер%'
    OR name ILIKE '%стойбище%'
    OR name ILIKE '%лиман%'
    OR name ILIKE '%каньон%'
    OR name ILIKE '%пороги%'
    OR name ILIKE '%ледник%'
    OR name ILIKE '%парк%'
    OR name ILIKE '%долина%'
    OR name ILIKE '%кальдера%'
    OR name ILIKE '%плато%'
    OR name ILIKE '%лагуна%'
    OR name ILIKE '%риф%'
    OR name ILIKE '%остров%'
    OR name ILIKE '%хребет%'
    OR name ILIKE '%кордон%'
    OR name ILIKE '%поселок-призрак%'
    OR name ILIKE '%маар%'
    OR name ILIKE '%фумарол%'
  );

-- ── 3. Strip source_url and source_name from ALL visible places ───────────────
-- Geographic places belong to the landscape, not to any website
UPDATE places
SET source_url  = NULL,
    source_name = NULL
WHERE is_visible = true;

INSERT INTO _migrations (name)
VALUES ('171_unhide_geo_places.sql')
ON CONFLICT (name) DO NOTHING;
