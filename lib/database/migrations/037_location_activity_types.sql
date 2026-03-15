-- Migration 037: Добавить location_type и activity_type в agent_route_knowledge
-- location_type = ГДЕ (тип географического объекта, точка на карте)
-- activity_type = ЧТО ПРОДАЮТ (тип активности/продукта)

ALTER TABLE agent_route_knowledge
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS activity_type TEXT;

-- Индексы для фильтрации на карте и в каталоге
CREATE INDEX IF NOT EXISTS idx_ark_location_type ON agent_route_knowledge(location_type);
CREATE INDEX IF NOT EXISTS idx_ark_activity_type ON agent_route_knowledge(activity_type);

COMMENT ON COLUMN agent_route_knowledge.location_type IS
  'Тип географического объекта: volcano, geyser, hot_spring, lake, mountain, river, bay, cape, island, glacier, forest, beach, waterfall, rock, settlement, other';

COMMENT ON COLUMN agent_route_knowledge.activity_type IS
  'Основная активность/продукт: trekking, fishing, bear_watching, thermal, helicopter, snowmobile, jeep, boat_trip, surf, diving, camping, photo, cultural, ski, eco, other';
