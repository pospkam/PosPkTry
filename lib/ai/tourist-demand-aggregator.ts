/**
 * lib/ai/tourist-demand-aggregator.ts
 * Bridges tourist chat data into the agent memory system.
 *
 * Every tourist interaction (Kuzmich chat, TripPlanner) emits a demand signal
 * that Planning, Hacker, and Content agents can consume for forecasting.
 *
 * Fire-and-forget: never blocks the calling endpoint.
 */

import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { emitEvent, AGENT_EVENTS } from '@/lib/events/emit';

export interface DemandSignal {
  userId: string | null;
  activities: string[];
  locations: string[];
  travelStyle: string | null;
  budgetLevel: string | null;
  bookingIntentDetected: boolean;
  sessionId: string | null;
}

/**
 * Record tourist demand signal for agent consumption (fire-and-forget).
 * Called after every tourist chat message that yields extracted interests.
 */
export async function recordTouristDemand(signal: DemandSignal): Promise<void> {
  try {
    // Write to Planning agent's memory (demand forecasting)
    if (signal.activities.length > 0 || signal.locations.length > 0) {
      await agentMemory.remember({
        agent_id: 'planning',
        memory_type: 'tourist_demand',
        key: `demand_${Date.now()}_${signal.userId ?? 'anon'}`,
        value: {
          activities: signal.activities,
          locations: signal.locations,
          travel_style: signal.travelStyle,
          budget_level: signal.budgetLevel,
          booking_intent: signal.bookingIntentDetected,
          timestamp: new Date().toISOString(),
        },
        confidence: signal.bookingIntentDetected ? 0.9 : 0.6,
        source: 'tourist_chat',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    // If booking intent was detected, also signal Hacker agent (conversion opportunity)
    if (signal.bookingIntentDetected) {
      await agentMemory.remember({
        agent_id: 'hacker',
        memory_type: 'conversion_opportunity',
        key: `intent_${Date.now()}_${signal.userId ?? 'anon'}`,
        value: {
          activities: signal.activities,
          locations: signal.locations,
          booking_intent: true,
          user_id: signal.userId,
        },
        confidence: 0.85,
        source: 'tourist_chat',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }

    // Emit event for real-time subscribers
    if (signal.activities.length > 0) {
      emitEvent(AGENT_EVENTS.TOURIST_INTEREST, 'system', 'info', {
        activities: signal.activities,
        locations: signal.locations,
        bookingIntent: signal.bookingIntentDetected,
      });
    }
  } catch {
    // Non-critical, never block chat response
  }
}
