-- Migration 115: Operator Outreach Queue
-- Автономный поиск и контакт с операторами агентом Intelligence
-- IDEMPOTENT

BEGIN;

CREATE TABLE IF NOT EXISTS outreach_queue (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(200),
  email         VARCHAR(300),
  phone         VARCHAR(50),
  website       VARCHAR(500),
  source        VARCHAR(200),             -- где найден (rata-news, tourprom, etc)
  source_url    VARCHAR(1000),
  status        VARCHAR(30)  NOT NULL DEFAULT 'found'
                  CHECK (status IN ('found','contacted','replied','registered','declined')),
  outreach_text TEXT,                     -- текст отправленного письма
  notes         TEXT,
  contacted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON outreach_queue(status);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_email  ON outreach_queue(email) WHERE email IS NOT NULL;

COMMIT;
