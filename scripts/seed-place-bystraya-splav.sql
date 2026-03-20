-- Seed: Место "Река Быстрая -- сплав"
-- Центральная Камчатка, приток р. Большая
-- Старт: п. Сокочи, финиш: Малкинские термальные источники
-- Источник: Telegram-группа операторов (Катерина, март 2026)

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
  zone,
  payload
)
VALUES (
  'reka-bystraya-splav|53.33|157.77',
  'splav',
  'river',
  'boat_trip',
  'Река Быстрая -- сплав',
  'Однодневный сплав по реке Быстрая в центральной части Камчатки. Река берёт исток у подножия вулкана Бакенинг и через 275 км впадает в Охотское море. Маршрут проходит по живописным местам Срединного хребта. В программе: инструктаж, сплав, обед с ухой из лосося, рыбалка, фотоохота на бурого медведя, посещение Малкинских горячих источников. Старт из Петропавловска-Камчатского или Паратунской зоны отдыха, остановка в п. Сокочи. Трансфер, питание, снаряжение и услуги гида включены.',
  'Река Быстрая сплав рафтинг Камчатка Сокочи Малкинские источники термальные горячие медведь рыбалка boat_trip splav rafting',
  md5('reka-bystraya-splav|53.33|157.77'),
  53.33,
  157.77,
  'telegram-operators',
  'https://t.me/+GCy5EVOotCE1NDMy',
  TRUE,
  'western',
  jsonb_build_object(
    'difficulty', 'easy',
    'season', ARRAY['июль', 'август', 'сентябрь', 'октябрь'],
    'best_months', ARRAY[7, 8, 9],
    'duration_hours', 12,
    'price_from', 13000,
    'price_unit', 'per_person',
    'included', ARRAY['трансфер', 'питание', 'снаряжение', 'услуги гида и повара', 'удочки', 'экипировка'],
    'highlights', ARRAY['сплав по реке', 'уха из лосося', 'рыбалка', 'фотоохота на медведя', 'Малкинские горячие источники'],
    'start_point', 'Петропавловск-Камчатский / Паратунка',
    'geometry', jsonb_build_object(
      'type', 'polyline',
      'coordinates', jsonb_build_array(
        jsonb_build_array(53.33, 157.77),
        jsonb_build_array(53.33, 157.60),
        jsonb_build_array(53.33, 157.48)
      ),
      'color', 'blue',
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
  zone           = EXCLUDED.zone,
  payload        = EXCLUDED.payload;

-- Проверка
SELECT id, title, location_type, activity_type, zone, lat, lng, is_visible,
       payload->>'price_from' AS price,
       payload->'geometry'->>'type' AS geom_type
FROM agent_route_knowledge
WHERE route_dedupe_key = 'reka-bystraya-splav|53.33|157.77';
