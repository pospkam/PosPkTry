-- Migration 133: Точка СБП — колонки для QR-платежей в operator_bookings
-- Добавляем поля для хранения QR ID и статуса оплаты

ALTER TABLE operator_bookings
  ADD COLUMN IF NOT EXISTS tochka_qr_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_amount   NUMERIC(12,2);

-- Индекс для быстрого поиска брони по QR ID в webhook
CREATE INDEX IF NOT EXISTS idx_operator_bookings_tochka_qr
  ON operator_bookings (tochka_qr_id)
  WHERE tochka_qr_id IS NOT NULL;

-- Добавляем статус pending_payment в допустимые значения
-- (если booking_status — constraint, иначе просто комментарий)
COMMENT ON COLUMN operator_bookings.tochka_qr_id IS 'ID QR-кода СБП Точки для сопоставления webhook';
COMMENT ON COLUMN operator_bookings.paid_at IS 'Время подтверждения оплаты через СБП';
COMMENT ON COLUMN operator_bookings.paid_amount IS 'Фактически оплаченная сумма (руб)';
