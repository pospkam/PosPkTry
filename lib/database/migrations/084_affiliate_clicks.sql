/**
 * Migration: Create affiliate_clicks table for revenue tracking
 */

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner VARCHAR(50) NOT NULL,
  source VARCHAR(100) NOT NULL,
  sub_id VARCHAR(100),
  referrer VARCHAR(500),
  ip_addr VARCHAR(45),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_partner ON affiliate_clicks(partner, clicked_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_source ON affiliate_clicks(source, clicked_at);

COMMENT ON TABLE affiliate_clicks IS 'Tracks affiliate link clicks for revenue analytics';
