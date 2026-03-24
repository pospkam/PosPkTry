/**
 * Agent Event Bus — Cross-Agent Communication
 *
 * Enables agents to communicate asynchronously without direct dependencies:
 * - Rescue emits 'sos_alert' → Admin subscribes
 * - Hacker emits 'booking_surge' → Quality subscribes
 * - Evo emits 'system_improvement' → All agents can listen
 *
 * Uses EventEmitter for MVP (no external queue like RabbitMQ/Kafka yet).
 * Events are logged to database for audit trail.
 */

import { EventEmitter } from 'events';
import { pool } from '@/lib/db-pool';

export interface AgentEvent {
  type: string;              // 'sos_alert' | 'booking_surge' | 'system_improvement' | etc.
  agentId: string;           // which agent emitted this
  severity: 'critical' | 'warning' | 'info';  // alert level
  data: Record<string, unknown>;  // event-specific payload
  timestamp: Date;
  id?: string;               // unique event ID for deduplication
}

export class AgentEventBus extends EventEmitter {
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(20); // Allow multiple agents to listen
  }

  /**
   * Emit event to all listening agents
   */
  async publishEvent(event: AgentEvent): Promise<void> {
    event.timestamp = event.timestamp || new Date();
    event.id = event.id || `${event.agentId}:${Date.now()}:${Math.random()}`;

    // Log to history (for replay if needed)
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Log to database for audit trail
    try {
      await pool.query(
        `INSERT INTO ai_actions_log (agent_id, action_type, status, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          event.agentId,
          `event_emitted:${event.type}`,
          event.severity,
          JSON.stringify({
            event_type: event.type,
            severity: event.severity,
            event_id: event.id,
            data: event.data
          })
        ]
      );
    } catch (err) {
      console.warn(`[AgentEventBus] Failed to log event: ${err}`);
    }

    // Emit to all listeners
    const eventKey = `agent:${event.type}`;
    super.emit(eventKey, event);

    // Event emitted (audit trail in ai_actions_log)
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: string, listener: (event: AgentEvent) => void | Promise<void>): this {
    const eventKey = `agent:${eventType}`;
    super.on(eventKey, listener);
    return this;
  }

  /**
   * Subscribe to event once
   */
  once(eventType: string, listener: (event: AgentEvent) => void | Promise<void>): this {
    const eventKey = `agent:${eventType}`;
    super.once(eventKey, listener);
    return this;
  }

  /**
   * Get recent events (for debugging/monitoring)
   */
  getRecent(type?: string, limit = 10): AgentEvent[] {
    if (!type) {
      return this.eventHistory.slice(-limit);
    }
    return this.eventHistory
      .filter(e => e.type === type)
      .slice(-limit);
  }

  /**
   * Clear history (careful!)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Singleton instance
let busInstance: AgentEventBus | null = null;

export function getEventBus(): AgentEventBus {
  if (!busInstance) {
    busInstance = new AgentEventBus();
  }
  return busInstance;
}

// Pre-defined event types (for type safety)
export const AGENT_EVENTS = {
  // Rescue events
  SOS_CRITICAL: 'sos_critical',        // Life-threatening situation
  WEATHER_ALERT: 'weather_alert',      // Severe weather in area
  ROUTE_HAZARD: 'route_hazard',        // Physical danger on route

  // Hacker events
  BOOKING_SURGE: 'booking_surge',      // Unusual booking spike
  CONVERSION_DROP: 'conversion_drop',  // Funnel bottleneck detected
  PRICE_ANOMALY: 'price_anomaly',      // Suspicious pricing pattern

  // Quality events
  NEGATIVE_FEEDBACK: 'negative_feedback',  // User complaints
  OPERATOR_HEALTH_LOW: 'operator_health_low',  // Operator quality drop

  // Evo events
  SYSTEM_IMPROVEMENT: 'system_improvement',  // Architectural recommendation
  EXPERIMENT_RESULT: 'experiment_result',    // A/B test completed
  PATTERN_DETECTED: 'pattern_detected',      // Significant pattern found

  // Legal events
  COMPLIANCE_ISSUE: 'compliance_issue',  // Legal/regulatory risk

  // Security events
  ANOMALY_DETECTED: 'anomaly_detected',  // Security issue
  RATE_LIMIT_HIT: 'rate_limit_hit',      // DDoS-like pattern

  // Content events
  TOUR_UPDATED: 'tour_updated',          // Tour created or modified
  BOOKING_CREATED: 'booking_created',    // Individual booking created

  // Demand intelligence
  TOURIST_INTEREST: 'tourist_interest',  // Aggregated tourist demand signal
} as const;
