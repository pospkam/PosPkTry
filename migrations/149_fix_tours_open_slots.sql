-- 149_fix_tours_open_slots.sql
-- Комбинированная миграция:
--   1. Применяем поля из 147 (user_ai_memory enriched)
--   2. Применяем таблицу из 148 (kuzmich_engagement_signals)
--   3. Открываем все слоты во всех опубликованных турах

-- ── 147: расширенная память пользователя ─────────────────────────
ALTER TABLE user_ai_memory
  ADD COLUMN IF NOT EXISTS budget_max        INT,
  ADD COLUMN IF NOT EXISTS group_size_num    INT,
  ADD COLUMN IF NOT EXISTS preferred_months  INT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS viewed_tour_ids   INT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_intent       TEXT;

-- ── 148: сигналы реэнгейджмента ──────────────────────────────────
CREATE TABLE IF NOT EXISTS kuzmich_engagement_signals (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tour_id      BIGINT       NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  session_id   TEXT,
  signal_type  TEXT         NOT NULL DEFAULT 'viewed',
  pushed_at    TIMESTAMP,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_user     ON kuzmich_engagement_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_tour     ON kuzmich_engagement_signals(tour_id);
CREATE INDEX IF NOT EXISTS idx_engagement_unpushed ON kuzmich_engagement_signals(created_at)
  WHERE pushed_at IS NULL;

-- ── Открыть все слоты во всех опубликованных турах ───────────────
-- available_slots = max_participants (все места свободны)
-- next_available_date = ближайшая рабочая дата:
--   - если сезон ещё не начался → season_start
--   - если сейчас в сезоне → сегодня + 3 дня (ближайшие выходные)
--   - если сезон прошёл (и есть season_end < today) → следующий год season_start
UPDATE operator_tours
SET
  available_slots = max_participants,
  next_available_date = CASE
    WHEN season_start IS NOT NULL AND season_start::date > CURRENT_DATE
      THEN season_start::date
    WHEN season_end IS NOT NULL AND season_end::date < CURRENT_DATE
      THEN (season_start + INTERVAL '1 year')::date
    ELSE (CURRENT_DATE + INTERVAL '3 days')::date
  END,
  updated_at = NOW()
WHERE is_published = true
  AND is_active = true;

-- Итог
SELECT
  COUNT(*) as updated_tours,
  SUM(available_slots) as total_slots_opened,
  MIN(next_available_date) as earliest_date,
  MAX(next_available_date) as latest_date
FROM operator_tours
WHERE is_published = true AND is_active = true;
