-- Migration 032: 152-ФЗ compliance — фиксация согласия на обработку ПДн
-- При регистрации сохраняем момент и IP получения согласия (ст. 9 152-ФЗ)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pd_consent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pd_consent_ip  VARCHAR(45);

COMMENT ON COLUMN users.pd_consent_at IS '152-ФЗ ст.9: момент получения согласия на обработку ПДн';
COMMENT ON COLUMN users.pd_consent_ip  IS '152-ФЗ ст.9: IP субъекта при выражении согласия';
