-- Migration 119: create agent_experiments table
-- Referenced by ExperimentTracker in lib/agents/learning/experiment-tracker.ts

CREATE TABLE IF NOT EXISTS agent_experiments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  intent      TEXT,
  variant_a   JSONB       NOT NULL DEFAULT '{}',
  variant_b   JSONB       NOT NULL DEFAULT '{}',
  metric      TEXT        NOT NULL DEFAULT 'success_rate',
  status      TEXT        NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'paused', 'completed')),
  winner      TEXT        CHECK (winner IN ('a', 'b', 'tie')),
  results     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_experiments_status_idx  ON agent_experiments(status);
CREATE INDEX IF NOT EXISTS agent_experiments_intent_idx  ON agent_experiments(intent);
CREATE INDEX IF NOT EXISTS agent_experiments_created_idx ON agent_experiments(created_at DESC);

-- Seed: 3 стартовых A/B эксперимента (classic vs SDK-агент)
INSERT INTO agent_experiments (name, description, intent, variant_a, variant_b, metric, status)
VALUES
  (
    'evo: classic vs SDK-агент',
    'Сравнение: детерминированный evo_optimize (A) против автономного Claude tool-loop (B). Метрика — качество инсайтов по оценке board.',
    'evo_optimize',
    '{"runner": "classic", "description": "switch+SQL+callAI, один LLM-вызов"}',
    '{"runner": "sdk",     "description": "agentic loop: Claude сам выбирает инструменты"}',
    'insight_quality',
    'running'
  ),
  (
    'rescue: classic vs SDK-агент',
    'SOS-мониторинг: детерминированный (A) против агентного rescue с автономным reasoning по погоде и активным турам (B).',
    'rescue_weather_risk',
    '{"runner": "classic", "description": "SQL + callAI, один вызов"}',
    '{"runner": "sdk",     "description": "agentic loop: сам запрашивает данные по необходимости"}',
    'alert_accuracy',
    'running'
  ),
  (
    'hacker: classic vs SDK-агент',
    'Growth-анализ: классический hack_growth (A) против агентного с автономным drill-down в воронку (B).',
    'hack_growth',
    '{"runner": "classic", "description": "SQL + callAI, один вызов"}',
    '{"runner": "sdk",     "description": "agentic loop: Claude сам копает данные"}',
    'actionability_score',
    'running'
  );
