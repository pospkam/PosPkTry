-- Migration 043: add status + notes to leads table
-- Статусы лида: new → contacted → qualified → converted / lost

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Индекс для фильтрации по статусу в CRM-списке
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at DESC);
