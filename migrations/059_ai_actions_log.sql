-- Migration 059: ai_actions_log — журнал всех AI-действий
-- Date: 2026-03-21
--
-- Цель:
--   - прозрачность расходов AI (токены, провайдер, стоимость)
--   - защита от повторных постов (kuzmich_post.metadata->>'route_id')
--   - основа для AI governance (approval gates, alerts)
--
-- IDEMPOTENT: safe to run multiple times

BEGIN;

CREATE TABLE IF NOT EXISTS ai_actions_log (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL,       -- kuzmich_post, kuzmich_tip, trip_recommend, ...
  provider    VARCHAR(50),                 -- openrouter, anthropic, xai, minimax
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    NUMERIC(10,6),
  metadata    JSONB        NOT NULL DEFAULT '{}',  -- route_id, topic, post_type, etc.
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_actions_log IS 'Журнал AI-действий: расходы, контент-посты, рекомендации';

CREATE INDEX IF NOT EXISTS idx_ai_actions_log_type_time
  ON ai_actions_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_actions_log_route
  ON ai_actions_log((metadata->>'route_id'))
  WHERE action_type = 'kuzmich_post';

COMMIT;
