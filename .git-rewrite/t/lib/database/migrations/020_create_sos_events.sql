-- 020_create_sos_events.sql
-- Лог SOS-сигналов от туристов (геолокация, время, пользователь)

CREATE TABLE IF NOT EXISTS sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(11, 7),
  accuracy DECIMAL(10, 2),
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'acknowledged', 'resolved', 'false_alarm')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_events_user_id
  ON sos_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sos_events_created_at
  ON sos_events(created_at DESC);
