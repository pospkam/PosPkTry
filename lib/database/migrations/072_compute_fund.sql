-- Migration 072: Compute Fund — AI токены оплачиваются платформой
-- Каждое успешное бронирование вносит 1% от суммы в фонд токенов.
-- Этот фонд покрывает стоимость AI вычислений (совещания директоров, Кузьмич, etc).

CREATE TABLE IF NOT EXISTS compute_fund_transactions (
  id           SERIAL PRIMARY KEY,
  source_type  VARCHAR(50)    NOT NULL,  -- 'booking_operator', 'booking_tour', 'booking_transfer', 'manual_topup'
  source_id    VARCHAR(255)   NOT NULL,  -- booking ID
  booking_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- полная стоимость бронирования в рублях
  contribution   DECIMAL(10,2) NOT NULL DEFAULT 0, -- 1% → в фонд
  note         TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_cft_source ON compute_fund_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_cft_created ON compute_fund_transactions(created_at);

-- Защита от дублей: одно бронирование — одна запись
CREATE UNIQUE INDEX IF NOT EXISTS idx_cft_unique_booking
  ON compute_fund_transactions(source_type, source_id);

COMMENT ON TABLE compute_fund_transactions IS
  'Фонд оплаты AI-вычислений: 1% от каждого бронирования идёт на токены.';
