-- Migration 023: Add route_id FK to tours
-- Маршрут = постоянная сущность (geography), Тур = динамическая (цена, даты, оператор)
-- Тур ссылается на маршрут как на основу

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS route_id UUID
    REFERENCES kamchatka_routes(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tours_route_id ON tours(route_id);

COMMENT ON COLUMN tours.route_id IS
  'FK to kamchatka_routes. NULL = тур без привязки к маршруту.';
