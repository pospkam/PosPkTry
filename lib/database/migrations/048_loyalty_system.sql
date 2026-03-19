-- Migration 048: Loyalty system tables
-- Creates loyalty_transactions, loyalty_levels, promo_codes, referrals
-- Adds referral_code, referred_by, total_spent to users

-- Таблица транзакций лояльности
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'refund')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  source VARCHAR(30) NOT NULL DEFAULT 'booking',
  description TEXT NOT NULL,
  booking_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lt_user ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lt_type ON loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_lt_source ON loyalty_transactions(source);
CREATE INDEX IF NOT EXISTS idx_lt_expires ON loyalty_transactions(expires_at);

-- Уровни лояльности
CREATE TABLE IF NOT EXISTS loyalty_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  min_spent DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,4) NOT NULL,
  earn_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  benefits TEXT[],
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true
);

INSERT INTO loyalty_levels (name, min_spent, discount_percentage, earn_multiplier, benefits, color) VALUES
('Novichok',  0,      0.00, 1.00, ARRAY['Bazovye uvedomleniya'], '#6B7280'),
('Bronza',    5000,   0.02, 1.20, ARRAY['2% skidka','Prioritetnaya podderzhka'], '#CD7F32'),
('Serebro',   15000,  0.05, 1.50, ARRAY['5% skidka','Ranniy dostup k turam'], '#C0C0C0'),
('Zoloto',    50000,  0.10, 2.00, ARRAY['10% skidka','VIP podderzhka','Personalnyy menedzher'], '#FFD700'),
('Platina',   100000, 0.15, 3.00, ARRAY['15% skidka','Maksimalnyy prioritet','Eksklyuzivnye tury'], '#E5E4E2')
ON CONFLICT DO NOTHING;

-- Промокоды
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Рефералы
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Колонки в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
