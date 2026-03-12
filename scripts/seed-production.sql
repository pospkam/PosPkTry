-- ============================================================
-- Production seed: create admin user + verify fishingkam partner
-- Run once: psql $DATABASE_URL -f scripts/seed-production.sql
-- ============================================================

-- 1. Create admin user (pospk@mail.ru) if not exists
INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
VALUES (
  'pospk@mail.ru',
  '$2b$12$NgU7jHIXXp1ttSfTxqHe1.UqDvrHYgeG8QVXWbsWmL5FB9N/UQ0Re',  -- Gr96Ww32@
  'Администратор',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET role = 'admin',
      password_hash = '$2b$12$NgU7jHIXXp1ttSfTxqHe1.UqDvrHYgeG8QVXWbsWmL5FB9N/UQ0Re',
      updated_at = NOW();

-- 2. Make fishingkam@yandex.ru an operator (if user exists, update role)
UPDATE users SET role = 'operator', updated_at = NOW()
WHERE email = 'fishingkam@yandex.ru';

-- 3. Verify ALL operator partners owned by fishingkam
UPDATE partners SET is_verified = true, updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'fishingkam@yandex.ru'
);

-- 4. Verify any auto-created unverified operator partners
--    only if they have tours linked to them (real partners, not stray auto-creates)
UPDATE partners p SET is_verified = true, updated_at = NOW()
WHERE p.category = 'operator'
  AND p.is_verified = false
  AND EXISTS (
    SELECT 1 FROM tours t WHERE t.operator_id = p.id
  );

-- 5. Report current state
SELECT u.email, u.role, p.name as partner_name, p.is_verified, p.category
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email IN ('pospk@mail.ru', 'fishingkam@yandex.ru')
ORDER BY u.email;
