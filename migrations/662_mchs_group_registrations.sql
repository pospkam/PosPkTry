-- migrations/662_mchs_group_registrations.sql
-- МЧС-регистрации туристических групп (расширенная таблица)
-- Используется /api/operator/mchs-registrations

CREATE TABLE IF NOT EXISTS mchs_group_registrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_partner_id UUID      REFERENCES partners(id),
  operator_user_id  UUID        REFERENCES users(id),
  group_name        TEXT        NOT NULL,
  group_members     JSONB       NOT NULL DEFAULT '[]',
  route_description TEXT        NOT NULL,
  route_region      TEXT,
  start_date        DATE        NOT NULL,
  end_date          DATE        NOT NULL,
  guide_contact     JSONB       NOT NULL DEFAULT '{}',
  emergency_contacts JSONB      NOT NULL DEFAULT '[]',
  participant_count INT         NOT NULL DEFAULT 1,
  status            VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'registered', 'rejected', 'failed')),
  mchs_request_id   TEXT,
  mchs_response     JSONB,
  last_error        TEXT,
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mchs_group_reg_operator_user
  ON mchs_group_registrations(operator_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mchs_group_reg_operator_partner
  ON mchs_group_registrations(operator_partner_id);

CREATE INDEX IF NOT EXISTS idx_mchs_group_reg_status
  ON mchs_group_registrations(status);
