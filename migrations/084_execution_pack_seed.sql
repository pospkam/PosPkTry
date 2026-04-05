-- Migration 084: Seed 3 Execution Pack initiatives into agent_approvals
-- Source: docs/AI_INDUSTRY_SIGNALS_APR_2026.md § Execution Pack — Top-3 по приоритету
-- Date: 2026-04-04
-- Author: board meeting → owner approved
-- IDEMPOTENT: uses INSERT WHERE NOT EXISTS by (action_type, description) guard

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Intent-level routing (Initiative #3)
--    owner: evo | executor: evo | action_type: prompt_optimize
--    KPI: p95 critical intents -25% за 2 недели
--    Due: 2026-04-11
-- ─────────────────────────────────────────────────────────────────────────────
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
  'Intent-level routing: latency/cost/quality policy per class',
  jsonb_build_object(
    'from_agent',       'evo',
    'full_description', 'Настроить раздельные policy rules для intent-классов mtg_*, tourist_recommend и lead-qualification: выбор модели по latency/cost/quality. Сейчас p95 критичных функций достигает 85 секунд. Цель: снижение p95 на 25% за 2 недели.',
    'priority',         'high',
    'confidence',       'high',
    'domain',           'ai_routing',
    'source',           'AI_INDUSTRY_SIGNALS_APR_2026 Execution Pack #3',
    'kpi_target',       'p95 critical intents -25% за 2 недели',
    'definition_of_done', 'Для mtg_*, tourist_recommend, lead-qualification заданы отдельные routing rules; p95 измеримо снизился',
    'rollback_condition', 'p95 вырос >10% от baseline 3 дня подряд',
    'affected_files',   jsonb_build_array('lib/ai/providers.ts', 'lib/ai/provider-config.ts')
  ),
  'pending',
  'agent_evo',
  NOW() + INTERVAL '48 hours',
  'evo',
  'AI Эволюция',
  'assigned',
  '2026-04-11',
  'Execution Pack #3 — Intent-level routing'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'prompt_optimize'
    AND description = 'Intent-level routing: latency/cost/quality policy per class'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Graceful degradation (Initiative #4)
--    owner: rescue | executor: rescue | action_type: schedule_suggest
--    KPI: hard-fail < 1% запросов
--    Due: 2026-04-14
-- ─────────────────────────────────────────────────────────────────────────────
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
  'Graceful degradation для mtg_* и tourist_recommend: fallback + retry',
  jsonb_build_object(
    'from_agent',       'rescue',
    'full_description', 'При provider timeout пользователь получает безопасный короткий ответ (safe fallback), ретрай идёт в фоне. Цель: доля hard-fail снизить ниже 1%. Затрагивает AI waterfall и chat-обработчики.',
    'priority',         'high',
    'confidence',       'high',
    'domain',           'ai_reliability',
    'source',           'AI_INDUSTRY_SIGNALS_APR_2026 Execution Pack #4',
    'kpi_target',       'hard-fail < 1% запросов',
    'definition_of_done', 'При provider timeout пользователь получает safe fallback; фоновый ретрай включён; hard-fail rate < 1%',
    'rollback_condition', 'fallback сам падает более чем в 0.5% запросов',
    'affected_files',   jsonb_build_array('lib/ai/providers.ts', 'app/api/ai/chat/route.ts')
  ),
  'pending',
  'agent_rescue',
  NOW() + INTERVAL '48 hours',
  'rescue',
  'AI Спасатель',
  'assigned',
  '2026-04-14',
  'Execution Pack #4 — Graceful degradation'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'schedule_suggest'
    AND description = 'Graceful degradation для mtg_* и tourist_recommend: fallback + retry'
    AND created_at >= NOW() - INTERVAL '30 days'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SLO + auto alerts (Initiative #5)
--    owner: admin | executor: admin | action_type: bulk_notify
--    KPI: TTD инцидента < 5 минут
--    Due: 2026-04-18
-- ─────────────────────────────────────────────────────────────────────────────
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
  'SLO мониторинг p95 критичных интентов + автоалерты при breach',
  jsonb_build_object(
    'from_agent',       'admin',
    'full_description', 'Ввести SLO порог по p95 для критичных интентов. При breach автоматически создавать alert-запись в лог и Telegram-уведомление. Цель: TTD инцидента < 5 минут вместо текущих часов.',
    'priority',         'medium',
    'confidence',       'high',
    'domain',           'monitoring',
    'source',           'AI_INDUSTRY_SIGNALS_APR_2026 Execution Pack #5',
    'kpi_target',       'TTD инцидента < 5 минут',
    'definition_of_done', 'SLO breach автоматически создаёт alert и запись в лог; Telegram-уведомление отправлено',
    'rollback_condition', 'alert spam > 20% нерелевантных сигналов за 24 часа',
    'affected_files',   jsonb_build_array('app/api/cron/health/route.ts', 'lib/notifications/telegram.ts', 'lib/monitoring.ts')
  ),
  'pending',
  'agent_admin',
  NOW() + INTERVAL '48 hours',
  'admin',
  'AI Администратор',
  'assigned',
  '2026-04-18',
  'Execution Pack #5 — SLO + auto alerts'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_approvals
  WHERE action_type = 'bulk_notify'
    AND description = 'SLO мониторинг p95 критичных интентов + автоалерты при breach'
    AND created_at >= NOW() - INTERVAL '30 days'
);

COMMIT;
