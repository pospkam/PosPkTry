-- 065_safety_alerts.sql
-- МЧС / Safety alerts for trip planner
-- Admins create alerts per zone; planner surfaces them in recommendations

BEGIN;

CREATE TABLE IF NOT EXISTS safety_alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone         VARCHAR(20) NOT NULL
                 CHECK (zone IN ('avachinsky', 'western', 'eastern', 'northern', 'all')),
  severity     VARCHAR(10) NOT NULL
                 CHECK (severity IN ('critical', 'important', 'info')),
  title        VARCHAR(200) NOT NULL,
  message      TEXT        NOT NULL,
  source       VARCHAR(100) NOT NULL DEFAULT 'МЧС Камчатка',
  active_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until TIMESTAMPTZ,             -- NULL = active until manually deactivated
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_active
  ON safety_alerts(is_active, active_from, active_until)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_safety_alerts_zone
  ON safety_alerts(zone)
  WHERE is_active = TRUE;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_safety_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_safety_alerts_updated_at ON safety_alerts;
CREATE TRIGGER trg_safety_alerts_updated_at
  BEFORE UPDATE ON safety_alerts
  FOR EACH ROW EXECUTE FUNCTION update_safety_alerts_updated_at();

COMMENT ON TABLE safety_alerts IS
  'МЧС и safety-предупреждения по зонам Камчатки. Показываются в планировщике маршрутов.';
COMMENT ON COLUMN safety_alerts.zone IS
  '''all'' = applies to all zones';
COMMENT ON COLUMN safety_alerts.active_until IS
  'NULL = manual deactivation only; set date to auto-expire';

COMMIT;
