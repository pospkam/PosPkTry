-- Migration 053: OCTO Notifications — webhook support
-- Adds webhook_url to octo_api_keys + webhook_logs table

BEGIN;

-- 1. webhook_url на ключ (OTA указывает свой эндпоинт для нотификаций)
ALTER TABLE octo_api_keys
  ADD COLUMN IF NOT EXISTS webhook_url    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(128);

-- 2. Лог вебхуков (для debugging и retry)
CREATE TABLE IF NOT EXISTS octo_webhook_log (
  id          BIGSERIAL PRIMARY KEY,
  api_key_id  UUID        NOT NULL REFERENCES octo_api_keys(id),
  booking_id  BIGINT      REFERENCES operator_bookings(id),
  event       VARCHAR(50) NOT NULL,  -- BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED
  url         VARCHAR(500) NOT NULL,
  status_code INT,
  success     BOOLEAN NOT NULL DEFAULT FALSE,
  request_body  JSONB,
  response_body TEXT,
  duration_ms   INT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_octo_webhook_log_key
  ON octo_webhook_log(api_key_id, created_at DESC);

COMMIT;
