-- Migration 658: integrity fixes — wrong coordinates + duplicate waypoint positions
--
-- PART 1: Fix places with coordinates outside Kamchatka bbox (lat 50-62, lng 155-170).
-- All affected places have a systematic offset (stored lat ~5° too high, lng ~7° too low).
-- Corrected values sourced from sibling places with valid GPS in the same geographic area.
--
-- PART 2: Fix duplicate waypoint positions within routes.
-- Migrations 653-656 assigned the same position index to multiple places in the same route.
-- Fix: renumber all waypoints per affected route using ROW_NUMBER ordered by current position.

-- =============================================================================
-- PART 1: coordinate fixes (6 places; Гора Летняя Поперечная skipped — no ref)
-- =============================================================================

-- Вилючинский вулкан: (58.26,152.56) → matches Вулкан Вилючинский cluster (52.70,158.28)
UPDATE places SET lat = 52.7050, lng = 158.2820
WHERE id = '708c021c-8d41-45f2-add0-ae8597bbc3ba';

-- Карымшинские термальные источники: (58.09,150.14) → matches Карымшинские (52.81,158.09)
UPDATE places SET lat = 52.8107, lng = 158.0919
WHERE id = 'b2a206bc-8f39-4e61-a4f1-1ad8ecbbf0f0';

-- На Авачинский перевал и Экструзию Верблюд: (58.77,151.61) → matches перевал cluster (53.21,158.59)
UPDATE places SET lat = 53.2083, lng = 158.5896
WHERE id = '61ff0f2c-cb82-4c94-bc07-d683e0db8030';

-- Озеро Толмачёва: (57.26,151.58) → matches Толмачёва similar (52.55,157.73)
UPDATE places SET lat = 52.5520, lng = 157.7333
WHERE id = '9eba9524-8a26-40b5-9a7e-7fd442c85fbc';

-- Тимоновские термальные источники: (58.20,151.05) → matches Тимоновские водопады (53.23,158.32)
UPDATE places SET lat = 53.2328, lng = 158.3175
WHERE id = '7e973234-0380-48d4-a378-c07e231e2be2';

-- Паужетские термальные источники: (56.81,150.75) → Pauzhetka springs, southern Kamchatka ~51.46N 157.58E
UPDATE places SET lat = 51.4600, lng = 157.5800
WHERE id = 'f54589e0-031e-4fa6-bfee-4c73401bb8f2';

-- NOTE: Гора Летняя Поперечная (d03edfd2-47ce-4fea-b573-abc22e9ddd83, lat=53.07, lng=150.65)
--   No reference with valid coordinates found. Requires manual GPS lookup.
-- NOTE: 30 places at placeholder (53.0444,158.6483) — separate GPS data task.

-- NOTE: Гора Летняя Поперечная (d03edfd2, lat=53.07, lng=150.65) — no reference found, skip.
-- NOTE: 30 places at placeholder (53.0444,158.6483) — separate GPS data task.

-- =============================================================================
-- PART 2: fix duplicate waypoint positions within routes
-- For each affected route: shift existing positions by +10000 to avoid temp collisions,
-- then reassign 0,1,2,... ordered by the original position value.
-- =============================================================================

DO $$
DECLARE
  r uuid;
  affected uuid[] := ARRAY[
    '53e258b5-4e34-4b77-b96e-c098a66bf520',
    '5791282c-e246-4748-8708-e5c24f5a0445',
    'f447bbe2-37ef-4858-b5eb-d8014fbf50d2',
    '7013a5bc-cc3f-4fb1-b993-b8978f606bd2',
    '85dab60b-5679-4a9d-9f33-267b82755f93',
    'd382a208-3986-4495-9039-1f3f7d9961c4',
    'af6cc904-f111-4995-89f4-58687dc31875',
    '9d9372aa-d866-463a-a97e-0897e163b5fd',
    'cd1c64de-9667-4cc0-b074-a6c2cb640214',
    '9f8d4b00-0378-475d-b861-12f7254f45a7',
    '41cff650-ee52-44ed-8ce8-23fc6cb0d6c0',
    '3b3633ec-871a-401d-bd68-021d889435ea',
    '7528c3eb-a80a-452c-b376-e44849952eb8',
    '57029378-cd71-4cf0-b6cc-c5a43de13214',
    '5e91b4f6-eeb7-443a-8624-37fd8da93f0f'
  ];
BEGIN
  FOREACH r IN ARRAY affected LOOP
    UPDATE route_waypoints SET position = position + 10000
    WHERE route_id = r;

    UPDATE route_waypoints rw
    SET position = sub.new_pos
    FROM (
      SELECT place_id,
        (ROW_NUMBER() OVER (ORDER BY position) - 1)::int AS new_pos
      FROM route_waypoints
      WHERE route_id = r
    ) sub
    WHERE rw.route_id = r
      AND rw.place_id = sub.place_id;
  END LOOP;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================
SELECT
  (SELECT COUNT(*) FROM (
    SELECT route_id, position FROM route_waypoints
    GROUP BY route_id, position HAVING COUNT(*) > 1
  ) t) AS remaining_dup_positions,
  (SELECT COUNT(*) FROM places
    WHERE lat::float NOT BETWEEN 50 AND 62
       OR lng::float NOT BETWEEN 155 AND 170) AS remaining_bad_coords;
