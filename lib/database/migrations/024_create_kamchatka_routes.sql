-- 024_create_kamchatka_routes.sql
-- Таблица маршрутов Камчатки (официальные данные из visitkamchatka.ru и др.)

CREATE TABLE IF NOT EXISTS kamchatka_routes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  lat         DECIMAL(10, 7),
  lng         DECIMAL(11, 7),
  source_url  TEXT,
  source_name TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_category
  ON kamchatka_routes (category);

CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_title_tsv
  ON kamchatka_routes USING gin (to_tsvector('russian', title));
