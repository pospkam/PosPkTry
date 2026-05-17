/**
 * Claude Managed Agents API client (stub).
 *
 * Dreaming / Outcomes / Multiagent — public beta / research preview.
 * Флаг USE_MANAGED_AGENTS включает реальные вызовы когда API стабилен.
 * До этого — заглушки с local fallback.
 */

export const USE_MANAGED_AGENTS = process.env.USE_MANAGED_AGENTS === 'true';

const MANAGED_API_BASE = 'https://api.anthropic.com/v1';
const MANAGED_BETA_HEADER = 'managed-agents-2026-04-01';

interface ManagedSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  output?: string;
}

interface ManagedAgentConfig {
  model: string;
  system: string;
  tools?: string[];
}

export async function createManagedSession(
  agent: ManagedAgentConfig,
  input: string,
): Promise<ManagedSession | null> {
  if (!USE_MANAGED_AGENTS) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const agentRes = await fetch(`${MANAGED_API_BASE}/agents`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': MANAGED_BETA_HEADER,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model,
        system_prompt: agent.system,
        tools: agent.tools ?? [],
      }),
    });
    if (!agentRes.ok) return null;
    const { id: agent_id } = await agentRes.json() as { id: string };

    const sessionRes = await fetch(`${MANAGED_API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': MANAGED_BETA_HEADER,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ agent_id, input }),
    });
    if (!sessionRes.ok) return null;
    return await sessionRes.json() as ManagedSession;
  } catch {
    return null;
  }
}

export async function getManagedSessionResult(sessionId: string): Promise<string | null> {
  if (!USE_MANAGED_AGENTS) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${MANAGED_API_BASE}/sessions/${sessionId}/events`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': MANAGED_BETA_HEADER,
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { output?: string };
    return data.output ?? null;
  } catch {
    return null;
  }
}
