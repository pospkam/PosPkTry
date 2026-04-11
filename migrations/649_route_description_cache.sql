-- route_description_cache: AI-сгенерированные описания туров
-- Используется Editor agent для хранения улучшенных описаний

BEGIN;

CREATE TABLE IF NOT EXISTS route_description_cache (
  route_id      INTEGER PRIMARY KEY REFERENCES operator_tours(id) ON DELETE CASCADE,
  description   TEXT    NOT NULL,
  model         TEXT    NOT NULL DEFAULT 'editor-agent',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rdc_generated ON route_description_cache(generated_at DESC);

COMMIT;
