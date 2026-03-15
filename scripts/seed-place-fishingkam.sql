-- Seed: Место "Рыболовная база «Камчатская рыбалка»"
-- Рыболовный участок №1182, река Камчатка
-- Оператор: partners.slug = 'kamchatskaya-rybalka'
-- Запускать ПОСЛЕ миграции 037

INSERT INTO agent_route_knowledge (
  route_dedupe_key,
  category,
  location_type,
  activity_type,
  title,
  description,
  search_text,
  source_hash,
  lat,
  lng,
  source_name,
  source_url,
  is_visible,
  payload
)
VALUES (
  'rybolovnaya-baza-kamchatskaya-rybalka|55.4441|159.5874',
  'rybalka',
  'river',
  'fishing',
  'Рыболовная база «Камчатская рыбалка»',
  'Лицензионный рыболовный участок №1182 на реке Камчатка. Протяжённость ~21 км. Нахлыст и спиннинг на нерку, кижуча, чавычу. Рыбалка с берега и с лодки. На базе — домики для проживания, баня, инструктора, прокат снаряжения.',
  'Рыболовная база Камчатская рыбалка река Камчатка рыбалка нахлыст нерка кижуч чавыча участок 1182 rybalka fishing',
  md5('rybolovnaya-baza-kamchatskaya-rybalka|55.4441|159.5874'),
  55.4441,
  159.5874,
  'kamchatskaya-rybalka',
  'https://tourhab.ru/operators/kamchatskaya-rybalka',
  TRUE,
  jsonb_build_object(
    'difficulty', 'easy',
    'season', ARRAY['июль', 'август', 'сентябрь'],
    'best_months', ARRAY[7, 8, 9],
    'duration_days', 3,
    'group_size_max', 10,
    'geometry', jsonb_build_object(
      'type', 'polyline',
      'coordinates', jsonb_build_array(
        jsonb_build_array(55.4461, 159.6731),
        jsonb_build_array(55.4444, 159.6742),
        jsonb_build_array(55.4433, 159.5003),
        jsonb_build_array(55.4422, 159.5022)
      ),
      'color', 'teal',
      'weight', 4
    )
  )
)
ON CONFLICT (route_dedupe_key) DO UPDATE SET
  location_type  = EXCLUDED.location_type,
  activity_type  = EXCLUDED.activity_type,
  description    = EXCLUDED.description,
  search_text    = EXCLUDED.search_text,
  is_visible     = EXCLUDED.is_visible,
  payload        = EXCLUDED.payload;

-- Проверка
SELECT id, title, location_type, activity_type, lat, lng, is_visible,
       payload->'geometry'->>'type' AS geom_type
FROM agent_route_knowledge
WHERE route_dedupe_key = 'rybolovnaya-baza-kamchatskaya-rybalka|55.4441|159.5874';
