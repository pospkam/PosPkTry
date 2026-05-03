-- Migration 161: Re-hide commercial places restored by migration 651
--
-- Problem: migration 651 (restore_hidden_places) restored ALL hidden places with
-- description >= 50 chars, including commercial tours that migration 159 had correctly
-- hidden. That brought back ~77 commercial tour products into the public catalog.
--
-- Fix: re-apply the name-pattern filter from migration 159, plus helicopter/program
-- patterns that were missing. Also hides new commercial entries added since 159.
--
-- Result: 745 → ~668 visible places
-- Idempotent: safe to run multiple times

UPDATE places
SET    is_visible = false
WHERE  is_visible = true
  AND (
        -- "тур" / "туры" as standalone word
        name ~* '\mтур[аыуеовамиахй]?\M'

        -- Excursion / sightseeing label
     OR name ~* 'экскурс'

        -- Commercial journey / travel package
     OR name ~* 'путешестви'

        -- Adventure package
     OR name ~* 'приключени'

        -- Expedition product
     OR name ~* 'экспедиц'

        -- "Знакомство с …" sales copy
     OR name ~* 'знакомство с'

        -- Compound tour: SUP-тур, Джип-тур, багги-тур, etc.
     OR name ~* '-тур'

        -- Transfer service
     OR name ~* 'трансфер'

        -- Climbing tour
     OR name ~* 'восхождени'

        -- Ski touring product
     OR name ~* 'скитур'

        -- Multi-day package labels
     OR name ~* '\d+\s*(дней|ночей|дня|ночи|день|ночь)'

        -- Helicopter excursion labels (not the geographic location itself)
     OR name ~* 'вертолётн|вертолетн'

        -- "программа" — sales programme
     OR name ~* 'программ'

        -- Named hiking product (not a geographic trail)
     OR name ILIKE '%поход %'
     OR name ILIKE 'Поход %'
  )
  -- Keep real rock formation "Скала Тур"
  AND NOT name ILIKE 'Скала Тур';

-- ── Sanity check ─────────────────────────────────────────────────���────────────
SELECT
  location_type,
  COUNT(*)                                   AS total,
  COUNT(*) FILTER (WHERE is_visible = true)  AS visible,
  COUNT(*) FILTER (WHERE is_visible = false) AS hidden
FROM places
GROUP BY location_type
ORDER BY total DESC;

INSERT INTO _migrations (name)
VALUES ('161_rehide_places_commercials.sql')
ON CONFLICT (name) DO NOTHING;
