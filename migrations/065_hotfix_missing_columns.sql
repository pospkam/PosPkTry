-- Hotfix: Add missing columns to operator_bookings table
-- These columns were referenced but missing, causing agent failures

ALTER TABLE operator_bookings ADD COLUMN IF NOT EXISTS tour_id INT REFERENCES operator_tours(id);
ALTER TABLE operator_bookings ADD COLUMN IF NOT EXISTS total_amount INT; -- in kopecks

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_operator_bookings_tour ON operator_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_operator_bookings_amount ON operator_bookings(total_amount);

-- Ensure tour_payments has matching structure
ALTER TABLE tour_payments ADD COLUMN IF NOT EXISTS amount_kopecks INT NOT NULL DEFAULT 0;
ALTER TABLE tour_payments ADD COLUMN IF NOT EXISTS booking_id INT REFERENCES operator_bookings(id);

-- Log this fix
INSERT INTO ai_actions_log (agent_id, action_type, status, metadata, created_at)
SELECT 'admin', 'hotfix:db_schema', 'completed',
  jsonb_build_object('columns_added', array['tour_id', 'total_amount', 'amount_kopecks']),
  NOW();
