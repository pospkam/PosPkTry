-- Migration 078: Support tickets
-- Система тикетов поддержки — от обращения до решения
-- Маршрутизация: Кузьмич → категория → Резидент → эскалация → Владелец

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       VARCHAR(20)  NOT NULL DEFAULT 'telegram'
                  CHECK (channel IN ('telegram', 'web', 'email')),
  category      VARCHAR(30)  NOT NULL DEFAULT 'other'
                  CHECK (category IN ('billing', 'booking', 'safety', 'content', 'technical', 'refund', 'operator', 'other')),
  subject       TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'escalated', 'closed')),
  assigned_agent VARCHAR(30) DEFAULT NULL,  -- имя Резидента (Admin/Quality/Legal/...)
  messages      JSONB        NOT NULL DEFAULT '[]',  -- [{role, text, ts}]
  resolution    TEXT         DEFAULT NULL,
  escalated_at  TIMESTAMPTZ  DEFAULT NULL,
  resolved_at   TIMESTAMPTZ  DEFAULT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id   ON support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status    ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category  ON support_tickets (category, status);

COMMENT ON TABLE support_tickets IS
  'Тикеты поддержки: Telegram-бот → категория → агент-Резидент → решение';
