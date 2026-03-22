-- Migration 064: Safety & Capacity Layer + Emergency Contacts
-- Created: 2026-03-21

-- location_safety_profile: вместимость, опасности, правила
CREATE TABLE IF NOT EXISTS location_safety_profile (
  id BIGSERIAL PRIMARY KEY,
  agent_route_id BIGINT REFERENCES agent_route_knowledge(id) UNIQUE,

  -- Вместимость
  capacity_per_day INT DEFAULT 50,
  capacity_per_hour INT DEFAULT 20,
  optimal_group_size INT DEFAULT 8,

  -- Seasonal
  open_from_date DATE,
  open_to_date DATE,
  closed_reason VARCHAR(255),

  -- Опасности
  hazard_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_level INT DEFAULT 2,
  altitude_m INT,
  terrain_type VARCHAR(50),

  -- Дорога
  road_type VARCHAR(50) DEFAULT 'gravel',
  road_accessibility INT DEFAULT 50,
  altitude_diff_m INT,
  distance_km DECIMAL(8,2),

  -- Emergency
  nearest_medical_km DECIMAL(8,2),
  emergency_access TEXT,
  phone_ranger_mches VARCHAR(20),
  sat_communicator_required BOOLEAN DEFAULT FALSE,

  -- Rules
  rules_required TEXT,
  weather_threshold JSONB,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- location_real_time_status: текущее состояние
CREATE TABLE IF NOT EXISTS location_real_time_status (
  id BIGSERIAL PRIMARY KEY,
  agent_route_id BIGINT REFERENCES agent_route_knowledge(id) UNIQUE,

  is_open BOOLEAN DEFAULT TRUE,
  current_crowds INT DEFAULT 0,
  current_weather JSONB,

  active_alerts TEXT[] DEFAULT ARRAY[]::TEXT[],
  alert_severity INT DEFAULT 0,
  alert_message VARCHAR(500),
  alert_source VARCHAR(50),
  alert_expires_at TIMESTAMP,

  tourists_today INT DEFAULT 0,
  tourists_hour INT DEFAULT 0,

  recommender_status VARCHAR(50) DEFAULT 'green',

  updated_at TIMESTAMP DEFAULT NOW()
);

-- external_alerts: МЧС, погода, сейсмология
CREATE TABLE IF NOT EXISTS external_alerts (
  id BIGSERIAL PRIMARY KEY,

  alert_type VARCHAR(50),
  severity INT,
  title VARCHAR(255),
  description TEXT,

  affected_zones TEXT[],
  affected_locations BIGINT[] DEFAULT ARRAY[]::BIGINT[],

  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,

  source_url VARCHAR(500),
  external_id VARCHAR(100) UNIQUE,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- crowd_log: логирование туристов
CREATE TABLE IF NOT EXISTS crowd_log (
  id BIGSERIAL PRIMARY KEY,
  agent_route_id BIGINT REFERENCES agent_route_knowledge(id),

  group_id UUID,
  group_size INT,
  guide_id BIGINT REFERENCES partners(id),

  checkin_at TIMESTAMP,
  checkout_at TIMESTAMP,
  duration_hours INT,

  incidents TEXT,
  guide_notes TEXT,
  safety_score INT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- emergency_contacts: МЧС, медики, гиды
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id BIGSERIAL PRIMARY KEY,
  zone VARCHAR(50),
  contact_type VARCHAR(50),
  name VARCHAR(255),
  phone VARCHAR(20),
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),
  service_hours TEXT,
  capabilities TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_real_time_open_capacity ON location_real_time_status(is_open, recommender_status);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON external_alerts(expires_at DESC) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_crowd_log_today ON crowd_log(agent_route_id, checkin_at) WHERE DATE(checkin_at) = CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_emergency_zone ON emergency_contacts(zone, contact_type);

-- SEED: Emergency Contacts для Камчатки
INSERT INTO emergency_contacts (zone, contact_type, name, phone, location_lat, location_lng, capabilities, service_hours)
VALUES
  ('avachinsky', 'mches', 'МЧС Авачинский район', '+7 (415) 223-00-11', 56.1964, 160.8456, ARRAY['rescue', 'medivac'], '24/7'),
  ('northern', 'ranger', 'Кроноцкий заповедник', '+7 (415) 444-20-77', 54.5100, 160.8000, ARRAY['rescue', 'guide'], '08:00-18:00'),
  ('western', 'mches', 'МЧС западный регион', '+7 (415) 123-45-67', 55.3000, 157.0000, ARRAY['rescue'], '24/7'),
  ('eastern', 'medical', 'Скорая помощь Елизово', '+7 (415) 111-22-33', 55.7500, 161.5000, ARRAY['firstaid', 'medivac'], '24/7')
ON CONFLICT DO NOTHING;

-- SEED: Populate location_safety_profile для существующих маршрутов
INSERT INTO location_safety_profile (
  agent_route_id,
  capacity_per_day,
  optimal_group_size,
  difficulty_level,
  terrain_type,
  hazard_types
)
SELECT
  id,
  CASE
    WHEN location_type = 'volcano' THEN 30
    WHEN location_type = 'hot_spring' THEN 100
    WHEN location_type = 'geyser' THEN 80
    WHEN activity_type = 'fishing' THEN 20
    ELSE 50
  END,
  CASE
    WHEN location_type = 'volcano' THEN 6
    WHEN activity_type = 'fishing' THEN 4
    ELSE 8
  END,
  CASE
    WHEN activity_type = 'helicopter' THEN 4
    WHEN location_type = 'volcano' THEN 4
    WHEN activity_type = 'boat_trip' THEN 2
    ELSE 2
  END,
  CASE
    WHEN location_type = 'volcano' THEN 'mountain'
    WHEN location_type = 'hot_spring' THEN 'thermal'
    WHEN location_type IN ('bay', 'river') THEN 'water'
    ELSE 'forest'
  END,
  CASE
    WHEN location_type = 'volcano' THEN ARRAY['avalanche', 'rockfall', 'thermal', 'altitude']::TEXT[]
    WHEN location_type = 'hot_spring' THEN ARRAY['thermal', 'chemical']::TEXT[]
    WHEN location_type = 'river' THEN ARRAY['water', 'rapids']::TEXT[]
    WHEN activity_type = 'fishing' THEN ARRAY['wildlife', 'weather']::TEXT[]
    ELSE ARRAY['wildlife', 'weather']::TEXT[]
  END
FROM agent_route_knowledge ark
WHERE NOT EXISTS (SELECT 1 FROM location_safety_profile lsp WHERE lsp.agent_route_id = ark.id)
ON CONFLICT DO NOTHING;

-- SEED: Populate location_real_time_status для всех маршрутов
INSERT INTO location_real_time_status (agent_route_id, recommender_status)
SELECT DISTINCT id, 'green'
FROM agent_route_knowledge
WHERE NOT EXISTS (SELECT 1 FROM location_real_time_status lrs WHERE lrs.agent_route_id = agent_route_knowledge.id)
ON CONFLICT (agent_route_id) DO NOTHING;
