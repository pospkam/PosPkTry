-- Migration 079: Channel Manager — внешние маркетплейсы
-- Добавляет идентификаторы туров на внешних платформах

ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS tripster_experience_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avito_listing_id        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sputnik8_product_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS channel_sync_at         TIMESTAMP;

COMMENT ON COLUMN operator_tours.tripster_experience_id IS 'ID экскурсии на Tripster (experience slug/id из их дашборда)';
COMMENT ON COLUMN operator_tours.avito_listing_id        IS 'ID объявления на Авито';
COMMENT ON COLUMN operator_tours.sputnik8_product_id     IS 'ID продукта на Sputnik8';
COMMENT ON COLUMN operator_tours.channel_sync_at         IS 'Время последней синхронизации с внешними каналами';

-- Таблица для хранения входящих заказов с внешних платформ
CREATE TABLE IF NOT EXISTS channel_orders (
  id            BIGSERIAL PRIMARY KEY,
  channel       VARCHAR(30)  NOT NULL,  -- 'tripster' | 'avito' | 'sputnik8'
  external_id   VARCHAR(255) NOT NULL,  -- ID заказа на внешней платформе
  tour_id       BIGINT REFERENCES operator_tours(id) ON DELETE SET NULL,
  status        VARCHAR(30)  NOT NULL DEFAULT 'new',  -- new | confirmed | cancelled
  tourist_name  VARCHAR(255),
  tourist_email VARCHAR(255),
  tourist_phone VARCHAR(30),
  participants  INT          NOT NULL DEFAULT 1,
  booking_date  DATE,
  amount        DECIMAL(10,2),
  raw_payload   JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE(channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_orders_tour    ON channel_orders(tour_id);
CREATE INDEX IF NOT EXISTS idx_channel_orders_channel ON channel_orders(channel, status);
CREATE INDEX IF NOT EXISTS idx_channel_orders_created ON channel_orders(created_at DESC);
