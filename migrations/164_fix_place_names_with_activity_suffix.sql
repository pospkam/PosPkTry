-- Migration 164: Fix place names that have activity descriptions appended
-- Real geographic places with commercial/activity suffixes in their names.

UPDATE places SET name = 'Курильское озеро'
WHERE name = 'Курильское озеро — наблюдение за медведями';

UPDATE places SET name = 'Авачинская бухта'
WHERE name = 'Авачинская бухта — морская прогулка';

INSERT INTO _migrations (name)
VALUES ('164_fix_place_names_with_activity_suffix.sql')
ON CONFLICT (name) DO NOTHING;
