-- Migration 031: Lead capture (no-auth enquiry form)
-- Туристы оставляют заявку с маршрута без регистрации

CREATE TABLE IF NOT EXISTS leads (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120)  NOT NULL,
  phone         VARCHAR(30)   NOT NULL,
  comment       TEXT,
  route_id      UUID,                        -- FK к agent_route_knowledge (nullable — generic lead)
  route_title   VARCHAR(255),                -- денормализовано для удобства
  source_url    VARCHAR(500),                -- откуда пришла заявка
  status        VARCHAR(30)   NOT NULL DEFAULT 'new',  -- new | contacted | closed
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Быстрый поиск по статусу и дате
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_route_id   ON leads(route_id) WHERE route_id IS NOT NULL;

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION fn_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_leads_updated_at();
