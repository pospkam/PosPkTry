-- Migration 051: Financial tables — tour payments, operator payouts, payout details
-- Implements: platform-as-acquirer model (tourist pays TourHub, TourHub pays operator net)
-- CloudPayments Payouts API used for disbursements
-- Hold period: 36 hours after tour end before releasing to operator

BEGIN;

-- 1. Payout details on partners (how operator receives money)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS payout_method    VARCHAR(20),    -- sbp | card | bank
  ADD COLUMN IF NOT EXISTS payout_details   JSONB,          -- encrypted by app layer
  ADD COLUMN IF NOT EXISTS payout_verified  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payout_verified_at TIMESTAMP,
  -- commission fields (from commercial model, migration 038 was never applied)
  ADD COLUMN IF NOT EXISTS commission_start   NUMERIC(4,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS commission_current NUMERIC(4,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS is_verified        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verified_by        UUID REFERENCES users(id);

-- 2. Individual tourist payments (one per booking)
CREATE TABLE IF NOT EXISTS tour_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          BIGINT NOT NULL REFERENCES operator_bookings(id) ON DELETE RESTRICT,
  operator_id         UUID NOT NULL REFERENCES partners(id),

  -- amounts in RUB (DECIMAL, not kopecks — kopecks only for OCTO API layer)
  retail_amount       NUMERIC(10,2) NOT NULL,   -- what tourist paid
  net_amount          NUMERIC(10,2) NOT NULL,   -- what operator receives
  commission_amount   NUMERIC(10,2) NOT NULL,   -- platform keeps
  commission_rate     NUMERIC(4,2)  NOT NULL,   -- rate at time of payment (snapshot)
  currency            VARCHAR(3)    NOT NULL DEFAULT 'RUB',

  -- CloudPayments
  cp_transaction_id   VARCHAR(128),             -- CloudPayments TransactionId
  cp_invoice_id       VARCHAR(128),             -- CloudPayments InvoiceId
  cp_payment_method   VARCHAR(50),              -- card | sbp | etc

  -- status lifecycle
  status              VARCHAR(20) NOT NULL DEFAULT 'HELD'
                        CHECK (status IN ('PENDING','HELD','RELEASED','REFUNDED','DISPUTED','FAILED')),
  -- timestamps
  paid_at             TIMESTAMP,                -- when CloudPayments confirmed
  release_after       TIMESTAMP,               -- tour_end + 36h, calculated on HELD
  released_at         TIMESTAMP,
  refunded_at         TIMESTAMP,
  refund_amount       NUMERIC(10,2),            -- actual refund (partial possible)
  refund_reason       TEXT,

  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_payments_booking    ON tour_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_payments_operator   ON tour_payments(operator_id);
CREATE INDEX IF NOT EXISTS idx_tour_payments_status     ON tour_payments(status);
CREATE INDEX IF NOT EXISTS idx_tour_payments_release    ON tour_payments(release_after)
  WHERE status = 'HELD';
CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_payments_cp_tx
  ON tour_payments(cp_transaction_id) WHERE cp_transaction_id IS NOT NULL;

-- 3. Operator payout batches (periodic settlement runs)
CREATE TABLE IF NOT EXISTS operator_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         UUID NOT NULL REFERENCES partners(id),

  -- what's being paid
  total_net           NUMERIC(10,2) NOT NULL,   -- sum of net_amount for included payments
  booking_count       INT NOT NULL DEFAULT 0,
  currency            VARCHAR(3) NOT NULL DEFAULT 'RUB',
  payment_ids         UUID[]    NOT NULL DEFAULT '{}', -- tour_payments included in this batch

  -- CloudPayments Payouts
  cp_payout_id        VARCHAR(128),             -- CP Payout ID when submitted
  payout_method       VARCHAR(20),              -- snapshot from partners.payout_method
  payout_details      JSONB,                    -- snapshot (encrypted) at time of payout

  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED')),
  failure_reason      TEXT,

  -- period this batch covers
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,

  paid_at             TIMESTAMP,
  payment_reference   VARCHAR(255),             -- bank/CP reference number
  created_at          TIMESTAMP DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) -- admin who triggered payout
);

CREATE INDEX IF NOT EXISTS idx_operator_payouts_operator ON operator_payouts(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_payouts_status   ON operator_payouts(status);

-- 4. Helper: update commission_current based on booking count (sliding scale)
-- Called after each completed tour payment
CREATE OR REPLACE FUNCTION recalculate_commission(p_operator_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_booking_count INT;
  v_start_rate    NUMERIC(4,2);
  v_new_rate      NUMERIC(4,2);
BEGIN
  SELECT COUNT(*) INTO v_booking_count
  FROM operator_bookings ob
  JOIN operator_tours ot ON ot.id = ob.operator_tour_id
  WHERE ot.operator_id = p_operator_id
    AND ob.booking_status = 'completed'
    AND ob.deleted_at IS NULL;

  SELECT commission_start INTO v_start_rate
  FROM partners WHERE id = p_operator_id;

  v_new_rate := CASE
    WHEN v_booking_count >= 200 THEN GREATEST(5.00, v_start_rate - 8.00)
    WHEN v_booking_count >= 100 THEN GREATEST(5.00, v_start_rate - 6.00) -- was -8 at 200+
    WHEN v_booking_count >=  50 THEN GREATEST(5.00, v_start_rate - 6.00)
    WHEN v_booking_count >=  10 THEN GREATEST(5.00, v_start_rate - 3.00)
    ELSE v_start_rate
  END;

  UPDATE partners
  SET commission_current = v_new_rate, updated_at = NOW()
  WHERE id = p_operator_id;
END;
$$;

COMMIT;
