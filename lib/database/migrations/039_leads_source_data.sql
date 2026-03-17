-- Migration 039: add source_data column to leads
-- source_data хранит UTM-метки, referrer и произвольные данные из формы

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_data JSONB;
