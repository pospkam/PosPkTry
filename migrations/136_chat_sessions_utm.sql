-- Migration 136: UTM и реферрер в chat_sessions
-- Отслеживаем источники трафика в AI-чат Кузьмича

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS referrer_source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS utm_source      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign    VARCHAR(100);

COMMENT ON COLUMN chat_sessions.referrer_source IS 'document.referrer при первом сообщении';
COMMENT ON COLUMN chat_sessions.utm_source      IS 'UTM-источник (google, telegram и т.д.)';
COMMENT ON COLUMN chat_sessions.utm_medium      IS 'UTM-канал (cpc, organic, social)';
COMMENT ON COLUMN chat_sessions.utm_campaign    IS 'UTM-кампания';
