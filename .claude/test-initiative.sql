-- Тестовая инициатива для архивации SOS
INSERT INTO agent_approvals (
  action_type,
  description,
  status,
  execution_status,
  requested_by,
  context
) VALUES (
  'archive_sos',
  'Архивировать SOS-события старше 24 часов (тестовый запуск)',
  'approved',
  'assigned',
  'rescue',
  jsonb_build_object(
    'reason', 'Автоматическая архивация зависших SOS',
    'test', true
  )
)
RETURNING id, action_type, status, execution_status, created_at;
