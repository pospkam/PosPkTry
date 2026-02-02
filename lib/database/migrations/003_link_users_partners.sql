-- Migration: Link users and partners tables
-- Date: 2025-11-10
-- Purpose: Fix critical architecture issue - add user_id to partners

-- Step 1: Add user_id column to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE partners 
  ADD CONSTRAINT fk_partners_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- Step 4: Migrate existing data (link partners to users by email)
UPDATE partners p
SET user_id = u.id
FROM users u
WHERE p.contact->>'email' = u.email
  AND p.user_id IS NULL
  AND u.role IN ('operator', 'guide', 'transfer', 'agent');

-- Step 5: Auto-create partner records for operators without one
INSERT INTO partners (user_id, name, category, contact, is_verified, rating, review_count)
SELECT 
  u.id,
  u.name,
  CASE 
    WHEN u.role = 'operator' THEN 'operator'
    WHEN u.role = 'guide' THEN 'guide'
    WHEN u.role = 'transfer' THEN 'transfer'
    ELSE 'operator'
  END,
  jsonb_build_object('email', u.email, 'phone', ''),
  false,
  0.0,
  0
FROM users u
WHERE u.role IN ('operator', 'guide', 'transfer')
  AND NOT EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = u.id
  );

-- Step 6: Add unique constraint to prevent duplicate user_id per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_category 
  ON partners(user_id, category);

COMMENT ON COLUMN partners.user_id IS 'Foreign key to users table - links partner to user account';
