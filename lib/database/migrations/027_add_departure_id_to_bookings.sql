-- 027_add_departure_id_to_bookings.sql
-- Привязка бронирования к конкретному заезду (tour_departures)
-- Маршрут → Тур → Заезд → Бронирование

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS departure_id UUID
    REFERENCES tour_departures(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_departure_id
  ON bookings(departure_id);

COMMENT ON COLUMN bookings.departure_id IS
  'FK to tour_departures. NULL = бронь без привязки к конкретному заезду (legacy).';
