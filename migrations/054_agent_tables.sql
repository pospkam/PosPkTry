-- Migration 054: Agent CRM tables
-- agent_clients, agent_bookings, agent_commissions, commission_payouts

BEGIN;

-- 1. Клиентская база агента
CREATE TABLE IF NOT EXISTS agent_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  company         VARCHAR(255),
  total_bookings  INT DEFAULT 0,
  total_spent     DECIMAL(12,2) DEFAULT 0,
  last_booking    TIMESTAMP,
  status          VARCHAR(20) NOT NULL DEFAULT 'prospect'
                    CHECK (status IN ('active','inactive','prospect')),
  notes           TEXT,
  tags            JSONB DEFAULT '[]'::jsonb,
  source          VARCHAR(50) DEFAULT 'direct',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_clients_agent  ON agent_clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_clients_status ON agent_clients(agent_id, status);

-- 2. Бронирования через агента (ссылка на operator_tours)
CREATE TABLE IF NOT EXISTS agent_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID NOT NULL REFERENCES users(id),
  client_id           UUID NOT NULL REFERENCES agent_clients(id),
  tour_id             BIGINT NOT NULL REFERENCES operator_tours(id),
  booking_date        TIMESTAMP DEFAULT NOW(),
  tour_date           DATE NOT NULL,
  guests_count        INT DEFAULT 1,
  total_price         DECIMAL(12,2) DEFAULT 0,
  agent_commission    DECIMAL(12,2) DEFAULT 0,
  commission_rate     DECIMAL(5,2) DEFAULT 10,
  commission_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (commission_status IN ('pending','paid','cancelled')),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','completed','cancelled')),
  payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','failed')),
  special_requests    TEXT,
  voucher_code        VARCHAR(50),
  discount_amount     DECIMAL(12,2) DEFAULT 0,
  notes               TEXT,
  created_via         VARCHAR(50) DEFAULT 'agent_hub',
  deleted_at          TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_bookings_agent  ON agent_bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_bookings_client ON agent_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_bookings_tour   ON agent_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_agent_bookings_status ON agent_bookings(agent_id, status);

-- 3. Записи комиссий (одна запись = одно бронирование)
CREATE TABLE IF NOT EXISTS agent_commissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID NOT NULL REFERENCES users(id),
  booking_id       UUID NOT NULL REFERENCES agent_bookings(id),
  amount           DECIMAL(12,2) NOT NULL,
  rate             DECIMAL(5,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','cancelled')),
  paid_at          TIMESTAMP,
  payout_reference VARCHAR(255),
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent   ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_booking ON agent_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status  ON agent_commissions(agent_id, status);

-- 4. Пакетные выплаты агентам
CREATE TABLE IF NOT EXISTS commission_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES users(id),
  total_amount    DECIMAL(12,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','paid','failed')),
  payment_method  VARCHAR(50),
  payout_date     TIMESTAMP,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_agent  ON commission_payouts(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_status ON commission_payouts(agent_id, status);

COMMIT;
