/**
 * Agent-to-Model mapping — each agent gets a unique AI model.
 * All models are called via OpenRouter (single API key, single billing).
 *
 * To change an agent's model, edit the map below. No other files need changing.
 */

export type AgentId =
  | 'admin' | 'legal' | 'security' | 'hacker' | 'rescue'
  | 'eco' | 'content' | 'quality' | 'planning' | 'evo'
  | 'finance' | 'infra' | 'vibe_coder'
  | 'kuzmich' | 'planner' | 'operator' | 'router';

/**
 * Map of agent ID to OpenRouter model ID.
 * Every model here is callable via https://openrouter.ai/api/v1/chat/completions.
 */
export const AGENT_MODEL_MAP: Record<AgentId, string> = {
  // Board Directors — быстрые и проверенные модели (апрель 2026)
  admin:      'google/gemini-2.0-flash-001',              // лидер: быстрый, надёжный
  legal:      'openai/gpt-4o-mini',                       // compliance, структурированный
  security:   'mistralai/mistral-small-3.2-24b-instruct', // безопасность: сильный
  hacker:     'deepseek/deepseek-chat-v3-0324',           // рост: аналитика, дешёвый
  rescue:     'meta-llama/llama-3.3-70b-instruct',        // SAR: быстрый, проверенный
  eco:        'google/gemini-2.5-flash-lite',             // эко: 1M context, дешёвый
  content:    'google/gemini-2.0-flash-001',              // аудит: быстрый
  quality:    'openai/gpt-4o-mini',                       // качество: надёжный
  planning:   'anthropic/claude-sonnet-4-6',              // стратегия: максимальное качество анализа
  evo:        'anthropic/claude-sonnet-4-6',              // архитектор: максимальное качество анализа
  finance:    'deepseek/deepseek-chat-v3-0324',           // CFO: аналитика, дешёвый
  infra:      'google/gemini-2.0-flash-001',              // SRE: быстрый
  vibe_coder: 'anthropic/claude-sonnet-4-6',             // кодер: максимальное качество кода
  // Site-wide agents — ultra-cheap
  kuzmich:    'google/gemini-2.0-flash-001',              // Telegram persona
  planner:    'google/gemini-2.0-flash-001',              // trip planning
  operator:   'google/gemini-2.0-flash-001',              // operator chat
  router:     'deepseek/deepseek-chat-v3-0324',           // route recommendations
};

/** Default model for consensus (Round 3 facilitator) */
export const CONSENSUS_MODEL = 'anthropic/claude-sonnet-4-6';

/**
 * Cheaper models for background/cron tasks where quality is less critical.
 * Used by cron jobs, scheduled reports, and non-interactive agent work.
 */
export const CRON_MODEL_MAP: Partial<Record<AgentId, string>> = {
  admin:      'google/gemini-2.0-flash-001',
  legal:      'google/gemini-2.0-flash-001',
  security:   'google/gemini-2.0-flash-001',
  hacker:     'deepseek/deepseek-chat-v3-0324',
  rescue:     'google/gemini-2.0-flash-001',
  eco:        'google/gemini-2.0-flash-001',
  content:    'google/gemini-2.0-flash-001',
  quality:    'google/gemini-2.0-flash-001',
  planning:   'anthropic/claude-sonnet-4-6',
  evo:        'anthropic/claude-sonnet-4-6',
  finance:    'deepseek/deepseek-chat-v3-0324',
  infra:      'google/gemini-2.0-flash-001',
  vibe_coder: 'anthropic/claude-sonnet-4-6',
};

/**
 * Get the preferred OpenRouter model for an agent.
 * @param agentId - agent identifier
 * @param isCron - if true, returns cheaper cron model when available
 * Returns null if agent ID is unknown (fallback to waterfall).
 */
export function getModelForAgent(agentId: string, isCron = false): string | null {
  if (isCron) {
    const cronModel = (CRON_MODEL_MAP as Record<string, string>)[agentId];
    if (cronModel) return cronModel;
  }
  return (AGENT_MODEL_MAP as Record<string, string>)[agentId] ?? null;
}

/**
 * Get a human-readable short name from model ID.
 * E.g., 'anthropic/claude-sonnet-4-6' -> 'claude-sonnet-4-6'
 */
export function getModelDisplayName(modelId: string): string {
  const parts = modelId.split('/');
  return parts.length > 1 ? parts[1] : modelId;
}
