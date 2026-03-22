-- 026_create_tour_departures.sql
-- Заезды (конкретные даты с местами) для туров
-- Маршрут → Тур (программа) → Заезд (дата + слоты) → Бронирование

CREATE TABLE IF NOT EXISTS tour_departures (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id          UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  start_date       DATE NOT NULL,
  end_date         DATE,                          -- NULL для однодневных
  available_slots  INTEGER NOT NULL DEFAULT 10,
  booked_slots     INTEGER NOT NULL DEFAULT 0,
  price_override   DECIMAL(12,2),                 -- NULL = цена из tours
  min_group_size   INTEGER DEFAULT 5,             -- минимум для заезда
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','sold_out','cancelled','archived')),
  notes            TEXT,                          -- "ждём подтверждения 3 человек"
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tour_id, start_date)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tour_departures_tour_id
  ON tour_departures(tour_id);

CREATE INDEX IF NOT EXISTS idx_tour_departures_start_date
  ON tour_departures(start_date);

CREATE INDEX IF NOT EXISTS idx_tour_departures_status
  ON tour_departures(status);

-- Комбинированный индекс для каталога: «активные заезды по дате»
CREATE INDEX IF NOT EXISTS idx_tour_departures_active
  ON tour_departures(tour_id, start_date)
  WHERE status = 'active';

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_tour_departures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tour_departures_updated_at
  BEFORE UPDATE ON tour_departures
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_departures_updated_at();

COMMENT ON TABLE tour_departures IS
  'Конкретные заезды по турам. Один тур может иметь множество заездов с разными датами.';
COMMENT ON COLUMN tour_departures.price_override IS
  'NULL = используется базовая цена из tours.price';
COMMENT ON COLUMN tour_departures.min_group_size IS
  'Минимальная группа для заезда (обычно 5 для рыбалки)';
