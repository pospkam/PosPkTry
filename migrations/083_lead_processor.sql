/**
 * Migration 083: AI Lead Processor
 *
 * 1. Расширяем таблицу leads:
 *    - ai_score        — оценка качества лида (0–100)
 *    - ai_summary      — краткое резюме от AI
 *    - ai_intent       — намерение: тип активности, бюджет, даты
 *    - matched_tour_ids — подобранные туры (массив)
 *    - proposal_id     — ссылка на сформированное предложение
 *    - operator_id     — к какому оператору относится
 *    - processed_at    — когда AI обработал
 *
 * 2. Новые статусы лида:
 *    new → ai_processing → ai_qualified → proposal_sent → awaiting_confirm → converted / lost
 *
 * 3. Таблица lead_proposals — персональные предложения
 *
 * 4. Расширяем booking status machine до 10 состояний
 */

-- ── 1. Расширяем leads ────────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_score        SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ai_summary      TEXT,
  ADD COLUMN IF NOT EXISTS ai_intent       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matched_tour_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS operator_id     UUID REFERENCES partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS group_size      SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS budget_rub      INTEGER,
  ADD COLUMN IF NOT EXISTS desired_dates   TEXT;

-- Расширяем ENUM статусов лида
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new',
    'ai_processing',
    'ai_qualified',
    'proposal_sent',
    'awaiting_confirm',
    'contacted',
    'qualified',
    'converted',
    'lost'
  ));

-- ── 2. lead_proposals ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  operator_id     UUID REFERENCES partners(id) ON DELETE SET NULL,

  -- Подобранные туры (первый — главный)
  primary_tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  alt_tour_ids    UUID[] DEFAULT '{}',

  -- Контент предложения
  headline        VARCHAR(255) NOT NULL,
  summary         TEXT NOT NULL,
  highlights      JSONB DEFAULT '[]',      -- массив строк ["Вулкан Авача", "Долина гейзеров"]
  price_from      INTEGER,                  -- минимальная цена в рублях
  price_to        INTEGER,
  duration_days   SMALLINT,

  -- Метаданные
  ai_model        VARCHAR(100),
  generation_ms   INTEGER,                  -- время генерации
  pdf_url         TEXT,                     -- ссылка на скачивание PDF

  -- Статус
  status          VARCHAR(30) DEFAULT 'draft'
                  CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),

  sent_at         TIMESTAMP,
  accepted_at     TIMESTAMP,
  expires_at      TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_proposals_lead ON lead_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_proposals_operator ON lead_proposals(operator_id);
CREATE INDEX IF NOT EXISTS idx_lead_proposals_status ON lead_proposals(status);

-- Добавляем внешний ключ из leads на proposals (nullable)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES lead_proposals(id) ON DELETE SET NULL;

-- ── 3. Расширяем booking statuses до 10 ──────────────────────────────────────

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'awaiting_payment',
    'deposit_paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'cancelled_by_tourist',
    'cancelled_by_operator',
    'refunded'
  ));

-- ── 4. Таблица lead_activity_log ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_activity_log (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor       VARCHAR(50) NOT NULL DEFAULT 'system',  -- 'ai', 'operator', 'tourist', 'system'
  action      VARCHAR(100) NOT NULL,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_lead ON lead_activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_created ON lead_activity_log(created_at DESC);

-- ── 5. Indexes на leads для AI-поиска ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_operator ON leads(operator_id);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
