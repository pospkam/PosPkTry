-- Add widget configuration columns to partners table
-- Supports embedding chat widget on partner websites

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS widget_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{"greeting":"Привет!","accentColor":"#D44A0C","buttonText":"Чат","position":"right"}'::JSONB;

-- Index for quick lookup of enabled widgets
CREATE INDEX IF NOT EXISTS idx_partners_widget_enabled
ON partners(id)
WHERE widget_enabled = TRUE;
