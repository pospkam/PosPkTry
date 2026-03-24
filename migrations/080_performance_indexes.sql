-- Migration 080: Performance indexes on foreign keys and hot query columns
-- Fixes: full table scans on bookings, operator_bookings, tour_payments

-- operator_bookings (главная таблица бронирований операторов)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_bookings_tour_id
  ON operator_bookings(tour_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_bookings_partner_id
  ON operator_bookings(partner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_bookings_status
  ON operator_bookings(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_bookings_booking_date
  ON operator_bookings(booking_date);

-- tour_payments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tour_payments_booking_id
  ON tour_payments(booking_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tour_payments_status
  ON tour_payments(payment_status);

-- operator_tours (marketplace queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_tours_partner_id
  ON operator_tours(partner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_tours_activity_type
  ON operator_tours(activity_type) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_tours_active
  ON operator_tours(is_active, deleted_at);

-- bookings (tourist hub)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tour_id
  ON bookings(tour_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tour_date
  ON bookings(tour_date) WHERE status = 'confirmed';

-- agent_route_knowledge (RAG full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ark_fts
  ON agent_route_knowledge USING gin(
    to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- chat_sessions (AI chat lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions(user_id) WHERE user_id IS NOT NULL;

-- users (auth lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id
  ON users(telegram_id) WHERE telegram_id IS NOT NULL;
