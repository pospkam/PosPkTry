-- 131_agent_approvals_execution.sql
-- Добавляет колонки исполнения инициатив в agent_approvals.
-- Без этих колонок cron/initiatives-execute не видит задачи.

BEGIN;

ALTER TABLE agent_approvals
  ADD COLUMN IF NOT EXISTS executor_agent_id  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS executor_name      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS execution_status   VARCHAR(20)
    CHECK (execution_status IN ('assigned','in_progress','done','failed')),
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date           DATE;

-- Индекс для быстрой выборки cron-исполнителем
CREATE INDEX IF NOT EXISTS idx_agent_approvals_execution
  ON agent_approvals(status, execution_status, executor_agent_id)
  WHERE status = 'approved' AND execution_status = 'assigned';

-- Заполнить execution_status для уже одобренных без исполнителя
-- (чтобы старые инициативы не зависли)
UPDATE agent_approvals
SET execution_status = 'assigned'
WHERE status = 'approved'
  AND execution_status IS NULL
  AND executor_agent_id IS NOT NULL;

COMMIT;
