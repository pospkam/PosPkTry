-- Migration 064: Sales & Operator Outreach Tracking
-- Purpose: Track operator acquisition campaign

CREATE TABLE IF NOT EXISTS sales_campaigns (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, paused
  batch_size INT NOT NULL,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  interested_count INT DEFAULT 0,
  signed_count INT DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_outreach_log (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES sales_campaigns(id),
  operator_telegram VARCHAR(255) UNIQUE NOT NULL,
  operator_name VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, read, responded, interested, signed, rejected
  response_text TEXT,
  response_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_status (status),
  INDEX idx_telegram (operator_telegram)
);

CREATE TABLE IF NOT EXISTS operator_signups (
  id SERIAL PRIMARY KEY,
  partner_id INT REFERENCES partners(id),
  telegram_handle VARCHAR(255),
  first_tour_created_at TIMESTAMP,
  first_booking_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new', -- new, active, churned
  acquisition_source VARCHAR(255) DEFAULT 'sales_bot',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_operator_campaigns ON sales_campaigns(status, started_at DESC);
CREATE INDEX idx_outreach_status ON sales_outreach_log(status, created_at DESC);
