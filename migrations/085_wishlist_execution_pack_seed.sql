-- Migration 085: Seed 5 wishlist initiatives into agent_approvals
-- Source: Owner backlog (post-Molmo wishlist)
-- Date: 2026-04-05
-- IDEMPOTENT: inserts guarded by action_type + description in last 30 days

BEGIN;

-- 1) Intent routing v2 (latency/cost/quality)
INSERT INTO agent_approvals (
  action_type,
  description,
  context,
  status,
  requested_by,
  expires_at,
  executor_agent_id,
  executor_name,
  execution_status,
  due_date,
  topic
)
SELECT
  'prompt_optimize',
  'Intent routing v2: class-based policies for critical intents',
  jsonb_build_object(
    'from_agent', 'evo',
    'priority', 'high',
    'confidence', 'high',
    'domain', 'ai_routing',
    'source', 'Wishlist 2026-04-05',
    'kpi_target', 'p95 intents -20% за 14 дней',
    'definition_of_done', 'Для critical intents внедрены class-based routing policies; p95 подтверждённо ниже baseline',
    'rollback_condition', 'p95 вырос >10% от baseline 48ч подряд',
    'affected_files', jsonb_build_array('lib/ai/providers.ts', 'lib/ai/provider-config.ts')
  ),
  'pending',
  'agent_evo',
  NOW() + INTERVAL '72 hours',
  'evo',
  'AI Эволюция',
  'assigned',
  CURRENT_DATE + INTERVAL '7 days',
  'Wishlist #1 — Intent routing v2'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'prompt_optimize'
    AND description = 'Intent routing v2: class-based policies for critical intents'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- 2) Graceful degradation + fallback
INSERT INTO agent_approvals (
  action_type,
  description,
  context,
  status,
  requested_by,
  expires_at,
  executor_agent_id,
  executor_name,
  execution_status,
  due_date,
  topic
)
SELECT
  'schedule_suggest',
  'Graceful degradation v2: fallback + bounded retry for AI timeouts',
  jsonb_build_object(
    'from_agent', 'rescue',
    'priority', 'high',
    'confidence', 'high',
    'domain', 'ai_reliability',
    'source', 'Wishlist 2026-04-05',
    'kpi_target', 'hard-fail < 1% запросов',
    'definition_of_done', 'При timeout пользователь получает safe fallback; bounded retry включён; hard-fail < 1%',
    'rollback_condition', 'fallback error-rate > 0.5% за 24ч',
    'affected_files', jsonb_build_array('lib/ai/providers.ts', 'app/api/ai/chat/route.ts')
  ),
  'pending',
  'agent_rescue',
  NOW() + INTERVAL '72 hours',
  'rescue',
  'AI Спасатель',
  'assigned',
  CURRENT_DATE + INTERVAL '7 days',
  'Wishlist #2 — Graceful degradation'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'schedule_suggest'
    AND description = 'Graceful degradation v2: fallback + bounded retry for AI timeouts'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- 3) Auto-retry failed initiatives
INSERT INTO agent_approvals (
  action_type,
  description,
  context,
  status,
  requested_by,
  expires_at,
  executor_agent_id,
  executor_name,
  execution_status,
  due_date,
  topic
)
SELECT
  'code_change',
  'Add auto-retry policy for failed initiatives (max 2 attempts)',
  jsonb_build_object(
    'from_agent', 'vibe_coder',
    'priority', 'high',
    'confidence', 'high',
    'domain', 'execution_platform',
    'source', 'Wishlist 2026-04-05',
    'kpi_target', 'retry-recovered initiatives >= 30%',
    'definition_of_done', 'Для failed инициатив работает ограниченный auto-retry с backoff и аудит-логом',
    'rollback_condition', 'доля повторных фейлов > 70% за 7 дней',
    'affected_files', jsonb_build_array('app/api/cron/initiatives-execute/route.ts', 'lib/agents/execution/initiative-executor.ts')
  ),
  'pending',
  'agent_admin',
  NOW() + INTERVAL '72 hours',
  'vibe_coder',
  'AI Разработчик',
  'assigned',
  CURRENT_DATE + INTERVAL '10 days',
  'Wishlist #3 — Auto-retry initiatives'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'code_change'
    AND description = 'Add auto-retry policy for failed initiatives (max 2 attempts)'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- 4) Retry/Rollback standardization
INSERT INTO agent_approvals (
  action_type,
  description,
  context,
  status,
  requested_by,
  expires_at,
  executor_agent_id,
  executor_name,
  execution_status,
  due_date,
  topic
)
SELECT
  'sql_query_fix',
  'Standardize executor retry/rollback policy and execution log schema',
  jsonb_build_object(
    'from_agent', 'evo',
    'priority', 'medium',
    'confidence', 'high',
    'domain', 'execution_observability',
    'source', 'Wishlist 2026-04-05',
    'kpi_target', 'mean time to diagnose failure < 10 min',
    'definition_of_done', 'Все executors пишут единый retry/rollback статус и структурированный execution log',
    'rollback_condition', 'объём ложных алертов вырос >20%',
    'affected_files', jsonb_build_array('lib/agents/execution/initiative-executor.ts', 'app/api/agents/execute/[approvalId]/route.ts')
  ),
  'pending',
  'agent_evo',
  NOW() + INTERVAL '72 hours',
  'evo',
  'AI Эволюция',
  'assigned',
  CURRENT_DATE + INTERVAL '10 days',
  'Wishlist #4 — Retry/Rollback standard'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'sql_query_fix'
    AND description = 'Standardize executor retry/rollback policy and execution log schema'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- 5) Owner digest (execution summary)
INSERT INTO agent_approvals (
  action_type,
  description,
  context,
  status,
  requested_by,
  expires_at,
  executor_agent_id,
  executor_name,
  execution_status,
  due_date,
  topic
)
SELECT
  'bulk_notify',
  'Owner digest twice daily: done/failed/stuck initiatives with risks',
  jsonb_build_object(
    'from_agent', 'admin',
    'priority', 'medium',
    'confidence', 'high',
    'domain', 'ops_visibility',
    'source', 'Wishlist 2026-04-05',
    'kpi_target', 'owner decision lag < 4h',
    'definition_of_done', 'Telegram digest 2 раза/день с done/failed/stuck и критичными рисками',
    'rollback_condition', 'alert fatigue: mute rate > 30%',
    'affected_files', jsonb_build_array('app/api/cron/digest/route.ts', 'lib/notifications/lead-notify.ts')
  ),
  'pending',
  'agent_admin',
  NOW() + INTERVAL '72 hours',
  'admin',
  'AI Администратор',
  'assigned',
  CURRENT_DATE + INTERVAL '7 days',
  'Wishlist #5 — Owner digest'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'bulk_notify'
    AND description = 'Owner digest twice daily: done/failed/stuck initiatives with risks'
    AND created_at >= NOW() - INTERVAL '30 days'
);

COMMIT;
