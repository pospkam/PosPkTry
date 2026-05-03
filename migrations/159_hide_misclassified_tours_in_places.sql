-- Migration 159: Hide misclassified commercial tours/activities in places table
--
-- Problem: ~95 records in the `places` table are commercial tours, excursions,
-- expeditions, multi-day packages, or transfer services — not geographic locations.
-- Migration 157 hid 50 manually-identified records by ark_id. This migration adds
-- pattern-based detection to catch the remaining misclassified records.
--
-- Strategy: UPDATE places SET is_visible = false WHERE name matches regex patterns
-- that indicate a commercial product rather than a geographic fact.
-- Safety exclusion: "Скала Тур" is a legitimate rock formation.
--
-- Idempotent: safe to run multiple times (UPDATE is always safe to repeat).

UPDATE places
SET    is_visible = false
WHERE  is_visible = true   -- only touch currently-visible records (idempotent)
  AND (
        -- "тур" / "туры" / "туру" etc. as a standalone word (not part of another word)
        name ~* '\mтур[аыуеовамиахй]?\M'

        -- Excursion / sightseeing
     OR name ~* 'экскурс'

        -- Commercial journey / travel package
     OR name ~* 'путешестви'

        -- Adventure package
     OR name ~* 'приключени'

        -- Expedition product
     OR name ~* 'экспедиц'

        -- "Знакомство с …" pattern (e.g. "Знакомство с Камчаткой")
     OR name ~* 'знакомство с'

        -- Compound tour words: SUP-тур, Джип-тур, скитур, etc.
     OR name ~* '-тур'

        -- Transfer / logistics service
     OR name ~* 'трансфер'

        -- Climbing tour / ascent package
     OR name ~* 'восхождени'

        -- Ski touring product
     OR name ~* 'скитур'

        -- Multi-day package indicator: "5 дней", "3 ночи", "2 дня", etc.
     OR name ~* '\d+\s*(дней|ночей|дня|ночи|день|ночь)'

        -- Hiking tour as a named product (not a geographic trail)
     OR name ILIKE '%поход %'
     OR name ILIKE 'Поход %'
  )
  -- Safety exclusion: "Скала Тур" is a real rock formation, not a tour product
  AND NOT name ILIKE 'Скала Тур';

-- Track this migration (runner also inserts automatically; ON CONFLICT makes this idempotent)
INSERT INTO _migrations (name)
VALUES ('159_hide_misclassified_tours_in_places.sql')
ON CONFLICT (name) DO NOTHING;
