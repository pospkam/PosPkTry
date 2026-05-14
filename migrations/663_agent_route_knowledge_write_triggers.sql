-- Migration 663: INSTEAD OF triggers for agent_route_knowledge VIEW
--
-- agent_route_knowledge is a UNION ALL VIEW over places + kamchatka_routes.
-- Without triggers, all UPDATE/INSERT statements against the view fail at runtime.
-- This migration adds INSTEAD OF triggers so legacy code continues to work.
--
-- UPDATE routing logic:
--   1. Try UPDATE places WHERE ark_id = OLD.id (for places rows, kind='place')
--   2. If not found, UPDATE kamchatka_routes WHERE COALESCE(ark_id, id) = OLD.id
--
-- INSERT routing: always inserts into kamchatka_routes (all imports come from there).

BEGIN;

-- ── UPDATE trigger ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ark_view_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE places
  SET
    name          = COALESCE(NEW.title,         name),
    description   = COALESCE(NEW.description,   description),
    category      = COALESCE(NEW.category,       category),
    lat           = COALESCE(NEW.lat,            lat),
    lng           = COALESCE(NEW.lng,            lng),
    is_visible    = COALESCE(NEW.is_visible,     is_visible),
    location_type = COALESCE(NEW.location_type,  location_type),
    activity_type = COALESCE(NEW.activity_type,  activity_type),
    zone          = COALESCE(NEW.zone,           zone),
    updated_at    = NOW()
  WHERE ark_id = OLD.id;

  IF NOT FOUND THEN
    UPDATE kamchatka_routes
    SET
      title         = COALESCE(NEW.title,         title),
      description   = COALESCE(NEW.description,   description),
      category      = COALESCE(NEW.category,       category),
      lat           = COALESCE(NEW.lat::numeric,   lat),
      lng           = COALESCE(NEW.lng::numeric,   lng),
      is_visible    = COALESCE(NEW.is_visible,     is_visible),
      activity_type = COALESCE(NEW.activity_type,  activity_type),
      zone          = COALESCE(NEW.zone,           zone),
      metadata      = COALESCE(NEW.payload,        metadata),
      updated_at    = NOW()
    WHERE COALESCE(ark_id, id) = OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ark_update ON agent_route_knowledge;
CREATE TRIGGER ark_update
  INSTEAD OF UPDATE ON agent_route_knowledge
  FOR EACH ROW EXECUTE FUNCTION ark_view_update();

-- ── INSERT trigger — routes only (places not created via importer) ────────────

CREATE OR REPLACE FUNCTION ark_view_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO kamchatka_routes
    (id, dedupe_key, slug, title, description, category,
     source_url, source_name, metadata, is_visible,
     activity_type, zone, created_at, updated_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    COALESCE(NEW.route_dedupe_key, NEW.title),
    LOWER(REGEXP_REPLACE(COALESCE(NEW.title, 'route'), '[^a-zа-я0-9]+', '-', 'g')),
    NEW.title,
    NEW.description,
    COALESCE(NEW.category, 'ekskursii'),
    NEW.source_url,
    NEW.source_name,
    COALESCE(NEW.payload, '{}'),
    COALESCE(NEW.is_visible, TRUE),
    NEW.activity_type,
    NEW.zone,
    NOW(),
    NOW()
  )
  ON CONFLICT (dedupe_key) DO UPDATE
    SET title       = EXCLUDED.title,
        description = COALESCE(EXCLUDED.description, kamchatka_routes.description),
        source_url  = EXCLUDED.source_url,
        updated_at  = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ark_insert ON agent_route_knowledge;
CREATE TRIGGER ark_insert
  INSTEAD OF INSERT ON agent_route_knowledge
  FOR EACH ROW EXECUTE FUNCTION ark_view_insert();

COMMIT;
