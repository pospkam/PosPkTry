-- Migration 152: Fix transliterated route names to proper Russian
-- Converts: "bukhta pionerskaya" → "Бухта Пионерская"
-- Idempotent: safe to run multiple times (only updates latin-only names)

BEGIN;

-- Fix known transliterated names
UPDATE agent_route_knowledge
SET title = 'Бухта Пионерская', updated_at = NOW()
WHERE id = '5d5e7f8a-0b1c-4d2e-9f3a-6b7c8d9e0f1a'
  AND title ~ '^[a-z\s]+$'
  AND (title ILIKE '%bukhta%' OR title ILIKE '%pionerskaya%');

UPDATE agent_route_knowledge
SET title = 'Голубые озёра', updated_at = NOW()
WHERE id = '6e6f8g9b-1c2d-5e3f-0g4b-7c8d9e0f2b1b'
  AND title ~ '^[a-z\s]+$'
  AND (title ILIKE '%golubye%' OR title ILIKE '%ozera%');

UPDATE agent_route_knowledge
SET title = 'Камчатский камень', updated_at = NOW()
WHERE title ~ '^[a-z\s]+$'
  AND (title ILIKE '%kamchatskiy kamen%' OR title ILIKE '%kamchatka stone%');

UPDATE agent_route_knowledge
SET title = 'Водопад Бабий Камень', updated_at = NOW()
WHERE title ~ '^[a-z\s]+$'
  AND (title ILIKE '%vodopad babiy%' OR title ILIKE '%babiy kamen%');

UPDATE agent_route_knowledge
SET title = 'Водопад Снежный Барс', updated_at = NOW()
WHERE title ~ '^[a-z\s]+$'
  AND (title ILIKE '%vodopad snezhnyy%' OR title ILIKE '%snezhnyy bars%');

-- Bulk fix: any route with only lowercase latin + spaces
-- Maps common patterns
UPDATE agent_route_knowledge
SET title = INITCAP(title), updated_at = NOW()
WHERE title ~ '^[a-z\s]+$'
  AND title NOT ILIKE ANY (ARRAY['bukhta%', 'golubye%', 'kamchatskiy%', 'vodopad%', 'ozero%', 'reka%', 'gora%']);

COMMIT;
