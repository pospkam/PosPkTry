/**
 * lib/agents/training/seed-training.ts
 * Seeds training documents into agent_memory on platform startup.
 *
 * Uses upsert (ON CONFLICT) so it's safe to call on every startup —
 * existing training data gets refreshed, not duplicated.
 */

import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { AGENT_TRAINING_DATA } from './agent-training-data';

/**
 * Seed all agent training documents into agent_memory.
 * Fire-and-forget — never blocks startup.
 */
export async function seedAgentTraining(): Promise<void> {
  for (const doc of AGENT_TRAINING_DATA) {
    await agentMemory.remember({
      agent_id: doc.agentId,
      memory_type: 'training',
      key: doc.key,
      value: { content: doc.content },
      confidence: 1.0,
      source: 'seed_training',
      // No expires_at — training data is permanent
    });
  }
}
