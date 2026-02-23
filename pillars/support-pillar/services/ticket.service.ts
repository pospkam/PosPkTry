/**
 * Ticket Service
 * Управление тикетами поддержки
 */

import { Pool } from 'pg';
import { pool } from '@/lib/db';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  customerId?: string;
  customerName?: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketFilter {
  status?: string;
  priority?: string;
  category?: string;
  customerId?: string;
  agentId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export class TicketService {
  private db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

  constructor(
    db?: Pool | { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
    private cache?: unknown,
    private eventBus?: unknown,
    private monitoring?: unknown
  ) {
    this.db = (db || pool) as typeof this.db;
  }

  async listTickets(filter: TicketFilter = {}) {
    try {
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const offset = (page - 1) * limit;

      const result = await this.db.query(
        `SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const countResult = await this.db.query(`SELECT COUNT(*) FROM support_tickets`);
      const total = parseInt((countResult.rows[0] as { count: string }).count);

      return {
        success: true,
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch {
      return { success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  async createTicket(data: Partial<Ticket>) {
    try {
      const result = await this.db.query(
        `INSERT INTO support_tickets
           (subject, description, status, priority, category, customer_id, customer_name, created_at, updated_at)
         VALUES ($1, $2, 'open', $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [data.subject, data.description, data.priority || 'medium',
         data.category, data.customerId, data.customerName]
      );
      return result.rows[0];
    } catch (err) {
      console.error('createTicket error:', err);
      throw new Error('Failed to create ticket');
    }
  }

  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM support_tickets WHERE id = $1`,
        [id]
      );
      return (result.rows[0] as Ticket) || null;
    } catch {
      return null;
    }
  }

  async updateTicket(id: string, data: Partial<Ticket>) {
    try {
      const result = await this.db.query(
        `UPDATE support_tickets
         SET status = COALESCE($2, status), priority = COALESCE($3, priority),
             agent_id = COALESCE($4, agent_id), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, data.status, data.priority, data.agentId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error('updateTicket error:', err);
      throw new Error('Failed to update ticket');
    }
  }

  async deleteTicket(id: string) {
    await this.db.query(`DELETE FROM support_tickets WHERE id = $1`, [id]);
    return { success: true };
  }
}

export const ticketService = new TicketService();
