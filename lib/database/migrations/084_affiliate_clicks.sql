/**
 * Migration: Create affiliate_clicks table for revenue tracking
 */

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner VARCHAR(50) NOT NULL,           -- 'aviasales', 'hotellook', 'tripster', etc
  source VARCHAR(100) NOT NULL,            -- 'homepage', 'route-detail', 'operator-page'
  sub_id VARCHAR(100),
  referrer VARCHAR(500),
  ip_addr VARCHAR(45),                     -- IPv4 or IPv6
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_partner_date (partner, clicked_at),
  INDEX idx_source_date (source, clicked_at)
);

COMMENT ON TABLE affiliate_clicks IS 'Tracks affiliate link clicks for revenue analytics and optimization';
