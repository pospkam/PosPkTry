-- Migration 038: Page views tracking
-- Lightweight table for internal analytics (complements Yandex Metrica)

CREATE TABLE IF NOT EXISTS page_views (
  id          BIGSERIAL PRIMARY KEY,
  path        VARCHAR(500) NOT NULL,
  referrer    VARCHAR(500),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path        ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at  ON page_views(created_at);

COMMENT ON TABLE page_views IS 'Internal page view tracking. Each row = one page visit.';
