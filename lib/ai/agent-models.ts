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
  // Board Directors — optimized for cost/quality balance (April 2026)
  admin:      'anthropic/claude-sonnet-4-6',          // leader needs top quality
  legal:      'openai/gpt-4o-mini',                   // compliance, structured
  security:   'mistralai/mistral-small-3.2-24b-instruct', // cheaper than mistral-large, strong
  hacker:     'deepseek/deepseek-chat-v3-0324',       // growth: great reasoning, cheap
  rescue:     'meta-llama/llama-4-maverick',          // SAR: 1M context, fast
  eco:        'google/gemini-2.5-flash-lite',         // eco: cheap, 1M context
  content:    'qwen/qwen3-235b-a22b-2507',            // content audit: strong, $0.07/M
  quality:    'openai/gpt-4.1',                       // quality: best reasoning
  planning:   'anthropic/claude-haiku-4-5',           // strategy: balanced
  evo:        'qwen/qwen3-coder-next',                // architect: code-aware, $0.12/M
  finance:    'deepseek/deepseek-chat-v3-0324',       // CFO: analytical, cheap
  infra:      'meta-llama/llama-4-scout',             // SRE: fast, 300K context
  vibe_coder: 'qwen/qwen3-coder-next',               // coder: latest Qwen coder, $0.12/M
  // Site-wide agents (not board members) — ultra-cheap
  kuzmich:    'openai/gpt-4o-mini',                   // Telegram persona
  planner:    'openai/gpt-4o-mini',                   // trip planning
  operator:   'openai/gpt-4o-mini',                   // operator chat
  router:     'deepseek/deepseek-chat-v3-0324',       // route recommendations
};

/** Default model for consensus (Round 3 facilitator) */
export const CONSENSUS_MODEL = 'anthropic/claude-sonnet-4-6';

/**
 * Get the preferred OpenRouter model for an agent.
 * Returns null if agent ID is unknown (fallback to waterfall).
 */
export function getModelForAgent(agentId: string): string | null {
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
