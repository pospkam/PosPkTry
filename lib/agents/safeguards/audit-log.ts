/**
 * AuditLog — неизменяемый журнал всех действий агентной системы.
 *
 * Только INSERT операции — никаких UPDATE/DELETE.
 * Хранится в ai_actions_log (action_type='audit_*').
 * Используется для compliance, debugging, learning.
 */

import { pool } from '@/lib/db-pool';

export type AuditEventType =
  | 'agent_dispatch'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'experiment_created'
  | 'experiment_concluded'
  | 'safeguard_blocked';

export interface AuditEntry {
  event_type: AuditEventType;
  actor:      string;
  resource?:  string;
  details:    Record<string, unknown>;
}

export interface AuditRecord {
  event_type: string;
  actor:      string;
  resource:   string | null;
  details:    Record<string, unknown>;
  created_at: Date;
}

interface AuditRow {
  action_type: string;
  metadata: {
    actor:    string;
    resource?: string;
    details:  Record<string, unknown>;
  };
  created_at: Date;
}

export class AuditLog {
  async write(entry: AuditEntry): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO ai_actions_log (action_type, metadata)
        VALUES ($1, $2)
      `, [
        `audit_${entry.event_type}`,
        JSON.stringify({
          actor:    entry.actor,
          resource: entry.resource,
          details:  entry.details,
        }),
      ]);
    } catch {
      // Не бросать — audit нельзя прерывать основной поток
      process.stderr.write(`[audit-log] write failed: ${JSON.stringify(entry)}\n`);
    }
  }

  async query(eventType?: AuditEventType, hours = 168): Promise<AuditRecord[]> {
    const { rows } = await pool.query<AuditRow>(`
      SELECT action_type, metadata, created_at
      FROM ai_actions_log
      WHERE action_type LIKE 'audit_%'
        AND ($1::text IS NULL OR action_type = $1)
        AND created_at >= NOW() - ($2 || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT 200
    `, [eventType ? `audit_${eventType}` : null, hours]);

    return rows.map(r => ({
      event_type: r.action_type.replace('audit_', ''),
      actor:      r.metadata.actor,
      resource:   r.metadata.resource ?? null,
      details:    r.metadata.details,
      created_at: r.created_at,
    }));
  }
}

export const auditLog = new AuditLog();
