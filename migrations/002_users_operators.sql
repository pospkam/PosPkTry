/**
 * Migration 002: Users and Operators
 * Base auth tables for tourists and operators
 */

-- ─────────────────────────────────────────────────────
-- Users table (base auth)
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'tourist',
  telegram_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─────────────────────────────────────────────────────
-- Operators table (extends users)
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operators (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  phone VARCHAR(20),
  telegram_chat_id BIGINT,
  bio TEXT,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_bookings INT DEFAULT 0,
  response_time_hours INT DEFAULT 24,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_operators_user_id ON operators(user_id);
CREATE INDEX idx_operators_company ON operators(company_name);
