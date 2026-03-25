-- 082: Widget support for partner embedding
-- Adds widget columns to partners table

ALTER TABLE partners ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{}';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS widget_domains TEXT[] DEFAULT '{}';

-- Index for quick widget lookup by slug
CREATE INDEX IF NOT EXISTS idx_partners_widget_slug ON partners(slug) WHERE widget_enabled = true;

COMMENT ON COLUMN partners.widget_enabled IS 'Whether partner can embed AI widget on their site';
COMMENT ON COLUMN partners.widget_config IS 'Widget branding: greeting, theme, color overrides';
COMMENT ON COLUMN partners.widget_domains IS 'Allowed domains for iframe embedding / CORS';
