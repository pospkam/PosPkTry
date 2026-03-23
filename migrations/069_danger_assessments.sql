-- 069_danger_assessments.sql
-- Аналитические оценки угроз по зонам Камчатки
-- Генерируются AI Аналитиком Опасностей каждые 30 мин

CREATE TABLE IF NOT EXISTS danger_assessments (
  id              BIGSERIAL PRIMARY KEY,
  zone            TEXT NOT NULL,  -- avachinsky|northern|eastern|western
  assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,

  -- Итоговая оценка
  risk_score      INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('low','moderate','high','critical')),

  -- Источники угроз
  threat_types    TEXT[]  NOT NULL DEFAULT '{}',  -- volcanic|seismic|weather|combined
  tourists_at_risk INTEGER NOT NULL DEFAULT 0,
  active_tours_count INTEGER NOT NULL DEFAULT 0,

  -- Детали
  confidence      NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  similar_event   TEXT,       -- "Апрель 2019, ML=5.8"
  recommended_action TEXT,   -- NORMAL|WATCH|EVACUATE_PRIORITY_2|EVACUATE_IMMEDIATE
  analysis_text   TEXT NOT NULL,

  -- Источники данных использованные для оценки
  seismic_events_count INTEGER DEFAULT 0,
  volcanic_alerts_count INTEGER DEFAULT 0,
  max_magnitude   NUMERIC(4,2),
  max_ash_height_m INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_danger_assessments_zone_time
  ON danger_assessments (zone, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_danger_assessments_risk_level
  ON danger_assessments (risk_level, expires_at DESC);

-- Представление: актуальная оценка по каждой зоне
CREATE OR REPLACE VIEW v_current_danger AS
SELECT DISTINCT ON (zone)
  id,
  zone,
  assessed_at,
  expires_at,
  risk_score,
  risk_level,
  threat_types,
  tourists_at_risk,
  active_tours_count,
  confidence,
  recommended_action,
  analysis_text,
  max_magnitude,
  max_ash_height_m
FROM danger_assessments
WHERE expires_at > NOW()
ORDER BY zone, assessed_at DESC;
