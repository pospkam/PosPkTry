-- Migration 066: Board Meeting — повестка + исполнитель + контроль исполнения
-- Date: 2026-03-21
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- 1. Добавляем поддержку повестки к agent_approvals
ALTER TABLE agent_approvals
  ADD COLUMN IF NOT EXISTS topic              TEXT,
  ADD COLUMN IF NOT EXISTS executor_agent_id VARCHAR(50),   -- id агента-исполнителя (admin/legal/rescue/...)
  ADD COLUMN IF NOT EXISTS executor_name     VARCHAR(100),  -- человекочитаемое имя
  ADD COLUMN IF NOT EXISTS execution_status  VARCHAR(20)
    NOT NULL DEFAULT 'pending'
    CHECK (execution_status IN ('pending','assigned','in_progress','done','failed')),
  ADD COLUMN IF NOT EXISTS execution_notes   TEXT,
  ADD COLUMN IF NOT EXISTS due_date          DATE,
  ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ;

-- 2. Таблица лога исполнения (аудит по каждому шагу)
CREATE TABLE IF NOT EXISTS approval_execution_log (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id   UUID         NOT NULL REFERENCES agent_approvals(id) ON DELETE CASCADE,
  actor         VARCHAR(100) NOT NULL,  -- 'admin' | agent_id | 'system'
  event_type    VARCHAR(50)  NOT NULL,  -- 'assigned' | 'started' | 'progress' | 'completed' | 'failed'
  message       TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exec_log_approval
  ON approval_execution_log(approval_id, created_at DESC);

-- 3. Таблица повесток совещаний (история)
CREATE TABLE IF NOT EXISTS board_meeting_sessions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT,                   -- вопрос вынесенный администратором
  initiated_by  INTEGER      REFERENCES users(id),
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  consensus     TEXT,                   -- итоговый консенсус
  proposals_count INTEGER    NOT NULL DEFAULT 0,
  approved_count  INTEGER    NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_board_sessions_started
  ON board_meeting_sessions(started_at DESC);

COMMIT;
