-- migrations/114_operator_tours_content.sql
-- Добавляет поля includes/excludes/itinerary в таблицы туров.
-- includes  — что включено в тур (список строк)
-- excludes  — что НЕ включено (список строк)
-- itinerary — программа по дням JSONB: [{day, title, description}]

ALTER TABLE tours ADD COLUMN IF NOT EXISTS includes  TEXT[] DEFAULT '{}';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS excludes  TEXT[] DEFAULT '{}';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS itinerary JSONB  DEFAULT '[]';

ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS includes  TEXT[] DEFAULT '{}';
ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS excludes  TEXT[] DEFAULT '{}';
ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS itinerary JSONB  DEFAULT '[]';
