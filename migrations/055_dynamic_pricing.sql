-- Migration 055: Dynamic Pricing
-- Правила ценообразования для туров + агентские реф. ссылки

BEGIN;

-- 1. Правила динамического ценообразования
CREATE TABLE IF NOT EXISTS tour_pricing_rules (
  id              BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  rule_type       VARCHAR(30) NOT NULL
                    CHECK (rule_type IN (
                      'season_peak',    -- пик сезона: +%
                      'season_low',     -- низкий сезон: -%
                      'early_bird',     -- раннее бронирование: -%
                      'last_minute',    -- горящий тур: +/-%
                      'occupancy_high', -- высокая загрузка: +%
                      'group_discount', -- скидка за группу: -%
                      'weekend'         -- выходные: +%
                    )),
  -- условия применения
  date_from       DATE,          -- для season rules
  date_to         DATE,          -- для season rules
  days_before_min INT,           -- для early_bird / last_minute (мин дней до тура)
  days_before_max INT,           -- для early_bird / last_minute (макс дней до тура)
  occupancy_min   INT,           -- для occupancy_high (% загрузки, например 70)
  guests_min      INT,           -- для group_discount
  -- результат
  multiplier      DECIMAL(5,3) NOT NULL, -- 1.20 = +20%, 0.90 = -10%
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_tour
  ON tour_pricing_rules(operator_tour_id) WHERE is_active = TRUE;

-- 2. Агентские реферальные ссылки
CREATE TABLE IF NOT EXISTS agent_referral_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES users(id),
  tour_id     BIGINT REFERENCES operator_tours(id),  -- NULL = общая ссылка платформы
  code        VARCHAR(32) NOT NULL UNIQUE,            -- уникальный код (KH-AGT-XXXX)
  clicks      INT DEFAULT 0,
  conversions INT DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 10,            -- % агентской комиссии
  expires_at  TIMESTAMP,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_agent ON agent_referral_links(agent_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code  ON agent_referral_links(code) WHERE is_active = TRUE;

-- 3. Клики и конверсии реф. ссылок
CREATE TABLE IF NOT EXISTS agent_referral_events (
  id          BIGSERIAL PRIMARY KEY,
  link_id     UUID NOT NULL REFERENCES agent_referral_links(id),
  event_type  VARCHAR(20) NOT NULL CHECK (event_type IN ('click', 'booking')),
  booking_id  BIGINT REFERENCES operator_bookings(id), -- NULL для click
  ip          VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_link ON agent_referral_events(link_id, event_type);

COMMIT;
