/**
 * Migration 084: Operator Commission Ledger
 *
 * Фиксирует комиссию платформы (12%) с каждого успешного платежа.
 * Idempotent вставка по invoice_id (ON CONFLICT DO NOTHING).
 */

CREATE TABLE IF NOT EXISTS operator_commissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID NOT NULL,
  booking_id    UUID,                          -- operator_bookings.id (nullable — для совместимости)
  invoice_id    TEXT NOT NULL UNIQUE,          -- CloudPayments InvoiceId (idempotency key)
  amount        NUMERIC(12,2) NOT NULL,        -- сумма комиссии в рублях
  rate          NUMERIC(5,4) NOT NULL DEFAULT 0.12,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at       TIMESTAMP,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_op_commissions_operator ON operator_commissions(operator_id);
CREATE INDEX IF NOT EXISTS idx_op_commissions_booking  ON operator_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_op_commissions_status   ON operator_commissions(status);
CREATE INDEX IF NOT EXISTS idx_op_commissions_created  ON operator_commissions(created_at DESC);
