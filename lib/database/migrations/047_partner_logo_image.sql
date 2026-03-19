-- Migration 046: add logo_image column to partners
-- Stores S3 URL directly, simpler than logo_asset_id join

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS logo_image VARCHAR(500);
