-- Migration 026: Add phone column to users table
-- Description: Adds optional phone field to support user contact information

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Add comment
COMMENT ON COLUMN users.phone IS 'User phone number in E.164 format or any international format';
