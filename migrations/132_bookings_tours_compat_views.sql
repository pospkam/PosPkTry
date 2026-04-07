-- Migration 132: Compatibility views for legacy bookings/tours references
-- These views bridge legacy API code (FROM bookings / FROM tours) to the
-- canonical tables (operator_bookings / operator_tours).
-- Allows 60+ legacy API routes to function without mass rewrite.

BEGIN;

-- 1. Add user_id to operator_bookings for tourist-linked bookings
ALTER TABLE operator_bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operator_bookings_user_id
  ON operator_bookings(user_id) WHERE user_id IS NOT NULL;

-- 2. Compatibility view: bookings → operator_bookings
DROP VIEW IF EXISTS bookings CASCADE;
CREATE VIEW bookings AS
  SELECT
    id,
    tour_id,                                -- INT added in migration 065
    operator_tour_id,
    user_id,                                -- nullable, newly added column
    tourist_name,
    tourist_email,
    tourist_phone,
    booking_date      AS date,              -- main booking date alias
    booking_date      AS start_date,        -- older alias
    participants,
    participants      AS guests_count,      -- older alias
    COALESCE(final_price, base_total_price) AS total_price,
    final_price,
    base_total_price,
    booking_status    AS status,            -- main status alias
    booking_status,
    payment_status,
    payment_method,
    payment_id,
    special_requests,
    special_requests  AS special_requirements,  -- older alias
    notes,
    metadata,
    created_via,
    weather_dependent,
    weather_alert_triggered,
    confirmation_sent,
    reminder_sent_24h,
    cancellation_reason,
    cancelled_at,
    deleted_at,
    created_at,
    updated_at
  FROM operator_bookings
  WHERE deleted_at IS NULL;

-- 3. Compatibility view: tours → operator_tours
DROP VIEW IF EXISTS tours CASCADE;
CREATE VIEW tours AS
  SELECT
    id,
    title             AS name,             -- old column was "name"
    title,
    description,
    short_description,
    base_price        AS price,            -- old column was "price"
    base_price,
    price_old,
    price_unit,
    activity_type     AS category,         -- old "category" maps to activity_type
    activity_type,
    location_type,
    location_name     AS location,
    location_name,
    latitude,
    longitude,
    difficulty,
    duration_hours    AS duration,         -- old "duration"
    duration_hours,
    multi_day_count   AS duration_days,    -- old "duration_days"
    duration_type,
    max_participants,
    min_participants,
    tour_image,
    photos,
    included,
    not_included,
    what_to_bring,
    rating,
    review_count,
    operator_id,
    is_active,
    season_start,
    season_end,
    seasonal_only,
    weather_dependent,
    deleted_at,
    created_at,
    updated_at
  FROM operator_tours
  WHERE deleted_at IS NULL;

COMMIT;
