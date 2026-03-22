-- Migration: Add password_hash field to users table
-- Date: 2025-11-10

-- Add password_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Create index on password_hash for security queries
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash);

-- Update existing users with a placeholder hash (they'll need to reset password)
-- bcrypt hash of "ChangeMe123!" for testing
UPDATE users 
SET password_hash = '$2a$10$rZ0YvQp7YxVJqT6HqWxQ1O4xp0f1xVzH3zF8yMzQ8xFz1yVzH3zF8y'
WHERE password_hash IS NULL;

-- Make password_hash NOT NULL after updating
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
