-- Migration 052: Operator onboarding & registration
-- Adds profile lifecycle fields, company_name alias, operator_applications table

BEGIN;

-- 1. company_name — алиас для name (code uses company_name, DB has name)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

UPDATE partners SET company_name = name WHERE company_name IS NULL;

-- Sync trigger: company_name всегда = name
CREATE OR REPLACE FUNCTION sync_partner_company_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.company_name := NEW.name;
  END IF;
  IF NEW.company_name IS DISTINCT FROM OLD.company_name THEN
    NEW.name := NEW.company_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_company_name ON partners;
CREATE TRIGGER trg_sync_partner_company_name
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION sync_partner_company_name();

-- 2. Поля онбординга
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS profile_status        TEXT NOT NULL DEFAULT 'none'
    CHECK (profile_status IN ('none','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS profile_draft         JSONB,
  ADD COLUMN IF NOT EXISTS profile_review_comment TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS applied_at            TIMESTAMP;

-- 3. Таблица заявок операторов (audit trail)
CREATE TABLE IF NOT EXISTS operator_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  company_name    VARCHAR(255) NOT NULL,
  contact_phone   VARCHAR(50),
  contact_email   VARCHAR(255),
  description     TEXT,
  inn             VARCHAR(12),
  review_comment  TEXT,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_applications_status
  ON operator_applications(status);
CREATE INDEX IF NOT EXISTS idx_operator_applications_partner
  ON operator_applications(partner_id);

-- 4. users: добавляем pending_role для заявок
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pending_role TEXT,
  ADD COLUMN IF NOT EXISTS role_applied_at TIMESTAMP;

COMMIT;
