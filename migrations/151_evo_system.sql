-- Migration 151: Evo System — Growth Agent + Evolution Loop + Feedback
-- Живая система: сканирует → находит → предлагает → учится

BEGIN;

-- Результаты сканирования Growth Agent
CREATE TABLE IF NOT EXISTS evo_growth_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type VARCHAR(50) NOT NULL DEFAULT 'full',  -- full, code, db, security
  status VARCHAR(20) NOT NULL DEFAULT 'running',   -- running, complete, failed
  issues_found INT NOT NULL DEFAULT 0,
  issues_fixed INT NOT NULL DEFAULT 0,
  duration_ms INT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Найденные проблемы
CREATE TABLE IF NOT EXISTS evo_growth_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES evo_growth_scans(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,  -- dead_code, security, performance, bug, tech_debt, ux
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',  -- critical, high, medium, low
  file_path TEXT,
  line_number INT,
  title TEXT NOT NULL,
  description TEXT,
  suggestion TEXT,              -- что AI предлагает сделать
  ai_proposed_diff TEXT,        -- предложенный diff
  status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, accepted, rejected, fixed, ignored
  fixed_commit TEXT,            -- хэш коммита если исправлено
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evo_issues_status ON evo_growth_issues(status, severity);
CREATE INDEX IF NOT EXISTS idx_evo_issues_category ON evo_growth_issues(category);

-- Evolution Loop: журнал эволюционных изменений
CREATE TABLE IF NOT EXISTS evo_evolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES evo_growth_issues(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,  -- fix_bug, remove_dead_code, optimize_query, add_test, refactor
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, in_progress, merged, rejected
  pr_url TEXT,
  commit_hash TEXT,
  diff_summary TEXT,
  review_notes TEXT,            -- заметки ревьюера (человека)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Feedback Loop: что сработало, что нет
CREATE TABLE IF NOT EXISTS evo_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_id UUID REFERENCES evo_evolution_log(id) ON DELETE SET NULL,
  outcome VARCHAR(20) NOT NULL,  -- success, partial, failure, regression
  impact_score INT,             -- -100 до +100: как повлияло на проект
  human_notes TEXT,             -- комментарий человека
  ai_learning TEXT,             -- что AI извлёк для следующего цикла
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evo Agent: контекст и память между циклами
CREATE TABLE IF NOT EXISTS evo_agent_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: начальное состояние
INSERT INTO evo_agent_state (key, value) VALUES
  ('cycle_count', '0'),
  ('last_scan_at', 'null'),
  ('total_issues_found', '0'),
  ('total_issues_fixed', '0'),
  ('learning_summary', '"Начальное состояние. Ещё не запускался."')
ON CONFLICT (key) DO NOTHING;

COMMIT;
