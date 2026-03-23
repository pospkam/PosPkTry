/**
 * Support Ticket Service
 *
 * CRUD + lifecycle для тикетов поддержки.
 * Тикет создаётся из Telegram-бота или веб-интерфейса,
 * живёт до resolution, эскалируется если завис.
 */

import { query } from '@/lib/database';
import { categorizeSupport, type SupportCategory } from './categorize';
import { notifyAdminNewTicket } from '@/lib/telegram/admin-notify';

export interface SupportMessage {
  role: 'user' | 'agent' | 'system';
  text: string;
  ts: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  channel: string;
  category: SupportCategory;
  subject: string;
  status: string;
  assignedAgent: string | null;
  messages: SupportMessage[];
  resolution: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  channel: string;
  category: SupportCategory;
  subject: string;
  status: string;
  assigned_agent: string | null;
  messages: SupportMessage[];
  resolution: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeRow(row: TicketRow): SupportTicket {
  return {
    id:           row.id,
    userId:       row.user_id,
    userName:     row.user_name ?? null,
    userEmail:    row.user_email ?? null,
    channel:      row.channel,
    category:     row.category,
    subject:      row.subject,
    status:       row.status,
    assignedAgent:row.assigned_agent,
    messages:     row.messages ?? [],
    resolution:   row.resolution,
    escalatedAt:  row.escalated_at,
    resolvedAt:   row.resolved_at,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

/**
 * Создаёт новый тикет и назначает Резидента по категории.
 */
export async function createTicket(input: {
  userId: string;
  channel?: string;
  subject: string;
  firstMessage: string;
}): Promise<SupportTicket> {
  const { category, resident } = categorizeSupport(input.subject + ' ' + input.firstMessage);

  const firstMsg: SupportMessage = {
    role: 'user',
    text: input.firstMessage,
    ts:   new Date().toISOString(),
  };

  const res = await query<TicketRow>(
    `INSERT INTO support_tickets
       (user_id, channel, category, subject, status, assigned_agent, messages)
     VALUES ($1, $2, $3, $4, 'assigned', $5, $6::jsonb)
     RETURNING *`,
    [
      input.userId,
      input.channel ?? 'telegram',
      category,
      input.subject,
      resident,
      JSON.stringify([firstMsg]),
    ]
  );

  const ticket = normalizeRow(res.rows[0]);
  notifyAdminNewTicket(ticket);
  return ticket;
}

/**
 * Добавляет сообщение в тикет.
 */
export async function addTicketMessage(
  ticketId: string,
  message: Omit<SupportMessage, 'ts'>
): Promise<void> {
  const msg: SupportMessage = { ...message, ts: new Date().toISOString() };
  await query(
    `UPDATE support_tickets
     SET messages   = messages || $1::jsonb,
         updated_at = NOW(),
         status     = CASE WHEN status = 'assigned' THEN 'in_progress' ELSE status END
     WHERE id = $2`,
    [JSON.stringify([msg]), ticketId]
  );
}

/**
 * Закрывает тикет с решением.
 */
export async function resolveTicket(ticketId: string, resolution: string): Promise<void> {
  await query(
    `UPDATE support_tickets
     SET status      = 'resolved',
         resolution  = $1,
         resolved_at = NOW(),
         updated_at  = NOW()
     WHERE id = $2`,
    [resolution, ticketId]
  );
}

/**
 * Эскалирует тикет на Совет директоров.
 */
export async function escalateTicket(ticketId: string, reason: string): Promise<void> {
  const escalateMsg: SupportMessage = {
    role: 'system',
    text: `Эскалация: ${reason}`,
    ts:   new Date().toISOString(),
  };
  await query(
    `UPDATE support_tickets
     SET status       = 'escalated',
         escalated_at = NOW(),
         messages     = messages || $1::jsonb,
         updated_at   = NOW()
     WHERE id = $2`,
    [JSON.stringify([escalateMsg]), ticketId]
  );
}

/**
 * Открытые тикеты пользователя.
 */
export async function getUserOpenTickets(userId: string): Promise<SupportTicket[]> {
  const res = await query<TicketRow>(
    `SELECT * FROM support_tickets
     WHERE user_id = $1 AND status NOT IN ('resolved', 'closed')
     ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );
  return res.rows.map(normalizeRow);
}

/**
 * Тикеты требующие эскалации (висят более 24ч без ответа агента).
 */
export async function getOverdueTickets(): Promise<SupportTicket[]> {
  const res = await query<TicketRow>(
    `SELECT * FROM support_tickets
     WHERE status IN ('open', 'assigned')
       AND updated_at < NOW() - INTERVAL '24 hours'
     ORDER BY created_at ASC LIMIT 20`
  );
  return res.rows.map(normalizeRow);
}

/**
 * Все тикеты (для admin).
 */
export async function listTickets(filter?: { status?: string; category?: string }): Promise<SupportTicket[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.status) {
    params.push(filter.status);
    conditions.push(`st.status = $${params.length}`);
  }
  if (filter?.category) {
    params.push(filter.category);
    conditions.push(`st.category = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query<TicketRow>(
    `SELECT st.*, u.name AS user_name, u.email AS user_email
     FROM support_tickets st
     LEFT JOIN users u ON u.id = st.user_id
     ${where} ORDER BY st.created_at DESC LIMIT 50`,
    params
  );
  return res.rows.map(normalizeRow);
}
