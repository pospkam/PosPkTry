-- Migration 068: New Agent Council Members
-- Date: 2026-03-23
-- Purpose: Finance (CFO), Infra (DevOps), Vibe Coder — tool registry
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- Register tools for Finance agent
INSERT INTO agent_tools (agent_id, tool_name, description, permission)
VALUES
  ('finance', 'query_bookings',     'Запрос данных бронирований и выручки',      'auto'),
  ('finance', 'query_commissions',  'Запрос данных комиссий агентов',            'auto'),
  ('finance', 'query_operators',    'Запрос данных операторов и их показателей', 'auto'),
  ('finance', 'generate_report',    'Генерация финансового отчёта через AI',     'auto')
ON CONFLICT (agent_id, tool_name) DO NOTHING;

-- Register tools for Infra agent
INSERT INTO agent_tools (agent_id, tool_name, description, permission)
VALUES
  ('infra', 'query_ai_logs',        'Запрос логов AI-вызовов (ai_actions_log)',  'auto'),
  ('infra', 'query_agent_actions',  'Запрос статуса действий агентов',           'auto'),
  ('infra', 'query_exec_log',       'Запрос лога исполнения инициатив',          'auto'),
  ('infra', 'query_meeting_stats',  'Запрос статистики совещаний',               'auto'),
  ('infra', 'measure_db_latency',   'Измерение времени ответа базы данных',      'auto')
ON CONFLICT (agent_id, tool_name) DO NOTHING;

-- Register tools for Vibe Coder agent
INSERT INTO agent_tools (agent_id, tool_name, description, permission)
VALUES
  ('vibe_coder', 'read_file',         'Чтение файлов кодовой базы (без auth/payments)', 'auto'),
  ('vibe_coder', 'scan_file_sizes',   'Сканирование размеров файлов по директориям',    'auto'),
  ('vibe_coder', 'query_errors',      'Запрос ошибок агентов и провалов исполнения',    'auto'),
  ('vibe_coder', 'propose_change',    'Предложение изменения кода через approval',      'requires_approval'),
  ('vibe_coder', 'generate_patch',    'Генерация инструкции по изменению кода через AI','auto')
ON CONFLICT (agent_id, tool_name) DO NOTHING;

COMMIT;
