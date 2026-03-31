/**
 * Migration: Create affiliate earnings tracking tables
 */

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner VARCHAR(50) NOT NULL,           -- 'aviasales', 'hotellook', etc
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending',   -- pending, approved, paid, declined
  tp_click_id VARCHAR(100),                -- TravelPayouts click ID for reconciliation
  received_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affiliate_payouts_partner_date ON affiliate_payouts(partner, received_at);
CREATE INDEX idx_affiliate_payouts_status ON affiliate_payouts(status);

COMMENT ON TABLE affiliate_payouts IS 'Tracks affiliate commissions from partners like TravelPayouts';
