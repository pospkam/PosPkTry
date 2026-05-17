-- 667_agent_market.sql
-- HTTP 402 — платный API для внешних AI-агентов
-- GET /api/agent-market/routes?query=...&payment_id=...

CREATE TABLE IF NOT EXISTS agent_market_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  query_type   VARCHAR(50)  NOT NULL DEFAULT 'routes',
  query_params JSONB        NOT NULL DEFAULT '{}',
  price_usdt   NUMERIC(10,4) NOT NULL DEFAULT 0.01,
  wallet_to    TEXT         NOT NULL,
  tx_id        TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending|confirmed|expired
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_market_payment_id ON agent_market_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_status     ON agent_market_payments(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_market_created    ON agent_market_payments(created_at DESC);
