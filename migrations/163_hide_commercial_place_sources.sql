-- Migration 163: Hide all places from commercial tour operator sources
--
-- Problem: ~300 visible places come from tour booking/operator sites.
-- These are commercial tour products (or duplicates), not geographic facts.
-- We have full authoritative coverage via OpenStreetMap (306) + Wikipedia (22).
--
-- Kept sources:
--   openstreetmap.org, wikipedia     — authoritative geographic data
--   visitkamchatka.ru, extraguide.ru — official Kamchatka tourism info
--   volcanoesland.ru, kamchatka.travel, spkam.com — official/scientific
--   topkam.ru, kamcha10.ru           — travel guide articles (real place info)
--   kamchatkamuseum.ru, vulcanarium.ru — museums (unique entries)
--
-- Hidden sources (commercial tour operators):
--   idilesom / idilesom.com  — tour marketplace (187+38 entries)
--   kamchatintour.ru         — tour operator (23 entries)
--   zimaletokamchatka.ru     — tour operator (12 entries)
--   sputnik8.com             — tour booking (11 entries)
--   vpoxod.ru                — outdoor activity marketplace (6 entries)
--   tokamchatka.ru           — tour operator (6 entries)
--   mestechkokam.ru          — tour operator (3 entries)
--   russiadiscovery.ru       — tour operator (1 entry)
--
-- Result: ~654 → ~367 visible places (clean geographic facts only)
-- Idempotent: safe to run multiple times

UPDATE places
SET    is_visible = false
WHERE  is_visible = true
  AND  source_name IN (
         'idilesom',
         'idilesom.com',
         'kamchatintour.ru',
         'zimaletokamchatka.ru',
         'sputnik8.com',
         'vpoxod.ru',
         'tokamchatka.ru',
         'mestechkokam.ru',
         'russiadiscovery.ru'
       );

-- Sanity check: visible places by source after migration
SELECT source_name, COUNT(*) AS visible
FROM   places
WHERE  is_visible = true
GROUP  BY source_name
ORDER  BY visible DESC;

INSERT INTO _migrations (name)
VALUES ('163_hide_commercial_place_sources.sql')
ON CONFLICT (name) DO NOTHING;
