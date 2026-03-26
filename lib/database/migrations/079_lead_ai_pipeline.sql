-- Migration 079: Lead AI Pipeline
-- Таблицы для AI-обработки лидов: lead_proposals, lead_activity_log
-- + AI-колонки на leads (score, intent, proposal link)

-- ── 1. AI-колонки на leads ────────────────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS email          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS group_size     INTEGER,
  ADD COLUMN IF NOT EXISTS budget_rub     INTEGER,
  ADD COLUMN IF NOT EXISTS desired_dates  TEXT,
  ADD COLUMN IF NOT EXISTS ai_score       INTEGER,
  ADD COLUMN IF NOT EXISTS ai_summary     TEXT,
  ADD COLUMN IF NOT EXISTS ai_intent      JSONB,
  ADD COLUMN IF NOT EXISTS matched_tour_ids UUID[],
  ADD COLUMN IF NOT EXISTS proposal_id    UUID,
  ADD COLUMN IF NOT EXISTS processed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operator_id    UUID;

-- Индексы для фильтрации
CREATE INDEX IF NOT EXISTS idx_leads_ai_score    ON leads (ai_score DESC) WHERE ai_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_processed   ON leads (processed_at)  WHERE processed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_operator    ON leads (operator_id)   WHERE operator_id IS NOT NULL;

-- ── 2. Таблица предложений ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_proposals (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  primary_tour_id UUID,
  alt_tour_ids    UUID[]       NOT NULL DEFAULT '{}',
  headline        VARCHAR(200) NOT NULL,
  summary         TEXT         NOT NULL,
  highlights      JSONB        NOT NULL DEFAULT '[]',
  price_from      INTEGER,
  price_to        INTEGER,
  duration_days   INTEGER,
  generation_ms   INTEGER,
  status          VARCHAR(30)  NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','sent','viewed','accepted','rejected')),
  sent_at         TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_proposals_lead    ON lead_proposals (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_proposals_status  ON lead_proposals (status, created_at DESC);

-- ── 3. Лог активности по лиду ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activity_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor      VARCHAR(50)  NOT NULL,  -- 'ai' | 'admin' | 'operator' | 'tourist' | 'system'
  action     VARCHAR(100) NOT NULL,
  details    JSONB        NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activity_log (lead_id, created_at DESC);

-- ── 4. Таблица follow-up очереди ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_followups (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID         NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  followup_type VARCHAR(50) NOT NULL,  -- 'day1' | 'day2' | 'day5' | 'custom'
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','sent','skipped','cancelled')),
  message_text TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_scheduled ON lead_followups (scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead      ON lead_followups (lead_id);
