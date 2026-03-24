/**
 * lib/events/emit.ts
 * Fire-and-forget event emitter utility.
 *
 * All API endpoints import this to publish events.
 * Never blocks the caller — catches all errors silently.
 */

import { getEventBus, AGENT_EVENTS, type AgentEvent } from './agent-bus';

/**
 * Emit an event to the agent event bus (fire-and-forget).
 * Never throws, never blocks the calling endpoint.
 */
export function emitEvent(
  type: string,
  agentId: string,
  severity: AgentEvent['severity'],
  data: Record<string, unknown>
): void {
  getEventBus().publishEvent({
    type,
    agentId,
    severity,
    data,
    timestamp: new Date(),
  }).catch(() => {
    // Non-critical: never block the caller
  });
}

export { AGENT_EVENTS };
