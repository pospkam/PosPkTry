-- 147_user_memory_enriched.sql
-- Расширяем user_ai_memory: числовой бюджет, размер группы, месяцы, просмотренные туры.
-- Эти поля позволяют Kuzmich давать точные рекомендации без переспрашивания.

ALTER TABLE user_ai_memory
  ADD COLUMN IF NOT EXISTS budget_max        INT,
  ADD COLUMN IF NOT EXISTS group_size_num    INT,
  ADD COLUMN IF NOT EXISTS preferred_months  INT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS viewed_tour_ids   INT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_intent       TEXT;

COMMENT ON COLUMN user_ai_memory.budget_max       IS 'Максимальный бюджет в рублях, извлечённый из сообщений';
COMMENT ON COLUMN user_ai_memory.group_size_num   IS 'Числовой размер группы (1, 2, 4...)';
COMMENT ON COLUMN user_ai_memory.preferred_months IS 'Предпочтительные месяцы поездки (1-12)';
COMMENT ON COLUMN user_ai_memory.viewed_tour_ids  IS 'ID туров, которыми турист интересовался';
COMMENT ON COLUMN user_ai_memory.last_intent      IS 'Последнее намерение: booking, exploring, comparing...';

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_viewed_tours ON user_ai_memory USING GIN (viewed_tour_ids);
