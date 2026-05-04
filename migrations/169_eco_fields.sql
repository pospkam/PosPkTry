-- Migration 169: Ecology fields for places
-- eco_zone: type of protected area
-- eco_permit_required: visitor permit needed
-- eco_rules: visitor rules text
-- eco_permit_url: where to get permit

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS eco_zone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS eco_permit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eco_rules TEXT,
  ADD COLUMN IF NOT EXISTS eco_permit_url TEXT;

COMMENT ON COLUMN places.eco_zone IS 'UNESCO, federal_reserve, regional_reserve, natural_park, zakaznik, none';

-- Pre-fill known protected areas based on zone/district/name
UPDATE places SET eco_zone = 'federal_reserve'
WHERE (name ILIKE '%кроноцк%' OR zone ILIKE '%кроноцк%' OR district ILIKE '%кроноцк%'
    OR description ILIKE '%кроноцкий заповедник%')
  AND eco_zone IS NULL;

UPDATE places SET eco_zone = 'federal_reserve', eco_permit_required = true,
  eco_permit_url = 'https://kronoki.ru/visit/'
WHERE eco_zone = 'federal_reserve';

UPDATE places SET eco_zone = 'zakaznik', eco_permit_required = true
WHERE (name ILIKE '%южно-камчатск%' OR zone ILIKE '%южно-камчатск%'
    OR description ILIKE '%южно-камчатский%' OR name ILIKE '%курильское%')
  AND eco_zone IS NULL;

UPDATE places SET eco_zone = 'natural_park'
WHERE (zone ILIKE '%налычево%' OR description ILIKE '%парк налычево%'
    OR zone ILIKE '%быстринск%' OR zone ILIKE '%южно-камчатск%')
  AND eco_zone IS NULL;

UPDATE places SET eco_zone = 'natural_park', eco_permit_required = true,
  eco_permit_url = 'https://kamchatkaparks.ru/'
WHERE eco_zone = 'natural_park';

-- Standard rules for federal reserves
UPDATE places SET eco_rules =
  'Посещение только в составе организованной группы с лицензированным гидом. ' ||
  'Запрещено: разведение костров вне отведённых мест, сбор растений и грибов, ' ||
  'кормление животных, шум вблизи животных. Необходим пропуск.'
WHERE eco_zone = 'federal_reserve' AND eco_rules IS NULL;

UPDATE places SET eco_rules =
  'Посещение в составе группы с гидом. ' ||
  'Запрещено: разведение огня, сбор растений, беспокойство животных. ' ||
  'Требуется разрешение на посещение.'
WHERE eco_zone IN ('zakaznik', 'natural_park') AND eco_rules IS NULL;

INSERT INTO _migrations (name)
VALUES ('169_eco_fields.sql')
ON CONFLICT (name) DO NOTHING;
