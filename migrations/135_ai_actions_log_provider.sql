-- Migration 135: AI Actions Log — добавляем provider и user_id
-- provider нужен для webhook Точки и аналитики по провайдерам

ALTER TABLE ai_actions_log
  ADD COLUMN IF NOT EXISTS provider   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Индекс для аналитики по типам и провайдерам
CREATE INDEX IF NOT EXISTS idx_ai_actions_log_action_type
  ON ai_actions_log (action_type);

CREATE INDEX IF NOT EXISTS idx_ai_actions_log_created_at
  ON ai_actions_log (created_at DESC);

COMMENT ON COLUMN ai_actions_log.provider IS 'Провайдер: tochka_sbp, openrouter, deepseek и т.д.';
COMMENT ON COLUMN ai_actions_log.user_id  IS 'Пользователь, инициировавший действие (если авторизован)';
