-- Migration 139: Unified Calendar Views
-- Платформенные агрегированные представления для календаря бронирований.
-- Используются в: admin-календаре, аналитике операторов, revenue management.

-- ────────────────────────────────────────────────────────────────────────────
-- VIEW: v_calendar_operator_summary
-- Дневная сводка бронирований по каждому оператору.
-- Источники: operator_bookings + operator_tours
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_calendar_operator_summary AS
SELECT
  t.operator_id,
  b.booking_date                                                                   AS date,
  COUNT(b.id)                                                                      AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'new')                             AS new_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'confirmed')                       AS confirmed_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'completed')                       AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled')                       AS cancelled_bookings,
  COALESCE(
    SUM(b.final_price) FILTER (WHERE b.booking_status NOT IN ('cancelled')), 0
  )                                                                                AS revenue,
  COALESCE(
    SUM(b.participants) FILTER (WHERE b.booking_status IN ('new', 'confirmed')), 0
  )                                                                                AS booked_participants
FROM operator_bookings b
JOIN operator_tours t ON b.operator_tour_id = t.id
WHERE b.deleted_at IS NULL
GROUP BY t.operator_id, b.booking_date;

COMMENT ON VIEW v_calendar_operator_summary IS
  'Дневная сводка бронирований по каждому оператору. Для revenue heatmap оператора.';

-- ────────────────────────────────────────────────────────────────────────────
-- VIEW: v_calendar_platform_summary
-- Платформенная ежедневная агрегация для admin-календаря.
-- Включает: все операторы, выручка, загрузка, аномалии (отмены).
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_calendar_platform_summary AS
SELECT
  b.booking_date                                                                   AS date,
  COUNT(b.id)                                                                      AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'new')                             AS new_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'confirmed')                       AS confirmed_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled')                       AS cancelled_bookings,
  COUNT(b.id) FILTER (WHERE b.booking_status = 'completed')                       AS completed_bookings,
  COALESCE(
    SUM(b.final_price) FILTER (WHERE b.booking_status NOT IN ('cancelled')), 0
  )                                                                                AS revenue,
  COUNT(DISTINCT t.operator_id)                                                    AS active_operators,
  COUNT(DISTINCT b.operator_tour_id)                                               AS active_tours,
  COALESCE(
    SUM(b.participants) FILTER (WHERE b.booking_status IN ('new', 'confirmed')), 0
  )                                                                                AS booked_participants,
  -- Коэффициент отмен (0.0 – 1.0). NULL если 0 бронирований.
  CASE
    WHEN COUNT(b.id) > 0
    THEN ROUND(
      COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled')::numeric
      / COUNT(b.id)::numeric, 2
    )
    ELSE NULL
  END                                                                              AS cancellation_rate
FROM operator_bookings b
JOIN operator_tours t ON b.operator_tour_id = t.id
WHERE b.deleted_at IS NULL
GROUP BY b.booking_date;

COMMENT ON VIEW v_calendar_platform_summary IS
  'Платформенная дневная сводка для admin-календаря: revenue heatmap, demand, аномалии.';

-- ────────────────────────────────────────────────────────────────────────────
-- INDEXES (для быстрой фильтрации по диапазонам)
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_op_bookings_booking_date ON operator_bookings (booking_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_op_bookings_operator_date
  ON operator_bookings (booking_date)
  INCLUDE (operator_tour_id, booking_status, final_price, participants)
  WHERE deleted_at IS NULL;
