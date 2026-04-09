-- Migration 140: Multi-day booking support
-- Adds end_date + duration_days to operator_bookings
-- Creates v_tour_daily_occupancy view for conflict detection

-- 1. Добавляем колонки
ALTER TABLE operator_bookings
  ADD COLUMN IF NOT EXISTS end_date      DATE,
  ADD COLUMN IF NOT EXISTS duration_days INT;

-- 2. Бэкфилл: существующие бронирования = 1 день
UPDATE operator_bookings
SET end_date      = booking_date,
    duration_days = 1
WHERE end_date IS NULL;

-- 3. View: разворачивает каждое бронирование в построчные дни
CREATE OR REPLACE VIEW v_tour_daily_occupancy AS
SELECT
  b.operator_tour_id,
  d.day::date AS date,
  SUM(b.participants) AS occupied
FROM operator_bookings b
CROSS JOIN LATERAL generate_series(
  b.booking_date::timestamp,
  COALESCE(b.end_date, b.booking_date)::timestamp,
  '1 day'
) AS d(day)
WHERE b.booking_status IN ('new', 'confirmed')
  AND b.deleted_at IS NULL
GROUP BY b.operator_tour_id, d.day::date;

-- 4. Индекс для range-запросов
CREATE INDEX IF NOT EXISTS idx_operator_bookings_tour_daterange
  ON operator_bookings (operator_tour_id, booking_date, end_date);
