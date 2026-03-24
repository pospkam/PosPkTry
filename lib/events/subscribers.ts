/**
 * lib/events/subscribers.ts
 * Event Bus Subscribers — connects events to agent memory.
 *
 * Registered once during platform initialization.
 * Each subscriber writes relevant event data to agent_memory
 * so agents see real-time signals at their next run or board meeting.
 */

import { getEventBus, AGENT_EVENTS, type AgentEvent } from './agent-bus';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

/**
 * Register all event subscribers on the bus.
 * Call once from initializeAgentPlatform().
 */
export function registerEventSubscribers(): void {
  const bus = getEventBus();

  // BOOKING_SURGE / BOOKING_CREATED -> Admin + Hacker + Planning agents
  bus.on(AGENT_EVENTS.BOOKING_SURGE, async (event: AgentEvent) => {
    const key = `booking_${event.id ?? Date.now()}`;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const agents = ['admin', 'hacker', 'planning'];
    for (const agentId of agents) {
      await agentMemory.remember({
        agent_id: agentId,
        memory_type: 'event_signal',
        key,
        value: event.data,
        confidence: 0.9,
        source: 'event_bus',
        expires_at: expires,
      });
    }
  });

  // NEGATIVE_FEEDBACK -> Quality + Content agents
  bus.on(AGENT_EVENTS.NEGATIVE_FEEDBACK, async (event: AgentEvent) => {
    await agentMemory.remember({
      agent_id: 'quality',
      memory_type: 'alert_signal',
      key: `neg_review_${event.id ?? Date.now()}`,
      value: event.data,
      confidence: 1.0,
      source: 'event_bus',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await agentMemory.remember({
      agent_id: 'content',
      memory_type: 'alert_signal',
      key: `neg_review_${event.id ?? Date.now()}`,
      value: event.data,
      confidence: 0.8,
      source: 'event_bus',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  // SOS_CRITICAL -> Rescue + Admin agents
  bus.on(AGENT_EVENTS.SOS_CRITICAL, async (event: AgentEvent) => {
    await agentMemory.remember({
      agent_id: 'rescue',
      memory_type: 'sos_event',
      key: `sos_${event.id ?? Date.now()}`,
      value: event.data,
      confidence: 1.0,
      source: 'event_bus',
    });
    await agentMemory.remember({
      agent_id: 'admin',
      memory_type: 'sos_event',
      key: `sos_${event.id ?? Date.now()}`,
      value: event.data,
      confidence: 1.0,
      source: 'event_bus',
    });
  });

  // ANOMALY_DETECTED -> Security + Admin agents
  bus.on(AGENT_EVENTS.ANOMALY_DETECTED, async (event: AgentEvent) => {
    await agentMemory.remember({
      agent_id: 'security',
      memory_type: 'security_alert',
      key: `anomaly_${event.id ?? Date.now()}`,
      value: event.data,
      confidence: 0.8,
      source: 'event_bus',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });
  });

  // TOUR_UPDATED -> Content + Planning agents
  bus.on(AGENT_EVENTS.TOUR_UPDATED, async (event: AgentEvent) => {
    const key = `tour_${event.id ?? Date.now()}`;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const agentId of ['content', 'planning']) {
      await agentMemory.remember({
        agent_id: agentId,
        memory_type: 'event_signal',
        key,
        value: event.data,
        confidence: 0.85,
        source: 'event_bus',
        expires_at: expires,
      });
    }
  });
}
