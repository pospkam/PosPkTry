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
  admin:      'anthropic/claude-sonnet-4-6',
  legal:      'openai/gpt-4o-mini',
  security:   'mistralai/mistral-large-2411',
  hacker:     'deepseek/deepseek-chat-v3-0324',
  rescue:     'meta-llama/llama-4-maverick',
  eco:        'google/gemini-2.0-flash-001',
  content:    'qwen/qwen-2.5-72b-instruct',
  quality:    'openai/gpt-4o',
  planning:   'anthropic/claude-haiku-4-5',
  evo:        'mistralai/mistral-medium-3',
  finance:    'deepseek/deepseek-chat-v3-0324',
  infra:      'meta-llama/llama-4-scout',
  vibe_coder: 'qwen/qwen-2.5-coder-32b-instruct',
  // Site-wide agents (not board members)
  kuzmich:    'google/gemini-2.5-flash-preview',
  planner:    'google/gemini-2.5-flash-preview',
  operator:   'openai/gpt-4o-mini',
  router:     'deepseek/deepseek-chat-v3-0324',
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
