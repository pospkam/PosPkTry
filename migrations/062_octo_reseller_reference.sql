-- Migration 062: Add reseller_reference to operator_bookings for OCTO idempotency
-- This column is required for idempotent booking creation via OTA platforms

ALTER TABLE operator_bookings
ADD COLUMN reseller_reference VARCHAR(255);

-- Create unique index to enforce idempotency per API key
-- reseller_reference must be unique within each API key's scope (not globally)
CREATE UNIQUE INDEX idx_operator_bookings_reseller_reference_per_api_key
ON operator_bookings(reseller_reference, octo_api_key_id)
WHERE reseller_reference IS NOT NULL AND deleted_at IS NULL;

-- Also useful: index on reseller_reference alone for quick lookups
CREATE INDEX idx_operator_bookings_reseller_reference
ON operator_bookings(reseller_reference)
WHERE reseller_reference IS NOT NULL AND deleted_at IS NULL;
