-- 087: operator_signups таблица + патч partners для существующих операторов

-- 1. Создаём таблицу operator_signups
CREATE TABLE IF NOT EXISTS operator_signups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id      UUID REFERENCES partners(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  telegram_handle VARCHAR(100),
  acquisition_source VARCHAR(50) DEFAULT 'direct_register',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_signups_partner ON operator_signups(partner_id);
CREATE INDEX IF NOT EXISTS idx_operator_signups_user   ON operator_signups(user_id);

-- 2. Патч: создаём partners для users с ролью operator, у которых нет partners-записи
INSERT INTO partners (
  user_id, name, category, contact,
  commission_rate, profile_status, onboarding_completed,
  is_public, slug, created_at, updated_at
)
SELECT
  u.id,
  u.name,
  'tour_operator',
  '{}'::jsonb,
  0.15,
  'draft',
  false,
  false,
  LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Zа-яА-Я0-9]', '-', 'g'))
    || '-' || LEFT(u.id::text, 8),
  NOW(),
  NOW()
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.role = 'operator' AND p.id IS NULL
ON CONFLICT DO NOTHING;
