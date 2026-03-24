-- Migration 080: Stakeholder workspace — рабочее место Артёма
-- Задачи, обратная связь, переписка со стейкхолдерами

CREATE TABLE IF NOT EXISTS stakeholder_wishes (
  id           BIGSERIAL PRIMARY KEY,
  stakeholder  VARCHAR(100)  NOT NULL DEFAULT 'artem',
  message      TEXT          NOT NULL,
  category     VARCHAR(30)   NOT NULL DEFAULT 'general',
  priority     VARCHAR(10)   NOT NULL DEFAULT 'medium',
  status       VARCHAR(20)   NOT NULL DEFAULT 'new',
  admin_reply  TEXT,
  created_by   UUID,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishes_stakeholder ON stakeholder_wishes(stakeholder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_status      ON stakeholder_wishes(status);
