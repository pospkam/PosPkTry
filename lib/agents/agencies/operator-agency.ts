/**
 * OperatorAgency — агент для операторов турплатформы.
 *
 * Возможности:
 *   op_tours_summary  — список туров с заполненностью и ближайшими датами
 *   op_bookings_today — бронирования за сегодня
 *   op_revenue        — выручка за 7/30 дней
 */

import { pool } from '@/lib/db-pool';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface TourSummaryRow {
  id: number;
  title: string;
  price_from: number;
  bookings_count: string;
  next_date: string | null;
  available_slots: string | null;
}

interface BookingTodayRow {
  id: string;
  tour_title: string;
  guest_name: string;
  guests_count: number;
  total_price: number;
  status: string;
}

interface RevenueRow {
  revenue_7d: string | null;
  revenue_30d: string | null;
  bookings_7d: string;
  bookings_30d: string;
}

interface PartnerRow { id: number }

export class OperatorAgency {
  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    switch (intent) {
      case 'op_tours_summary':  return this.getToursSummary(context);
      case 'op_bookings_today': return this.getBookingsToday(context);
      case 'op_revenue':        return this.getRevenue(context);
      default:                  return { response: 'OperatorAgency: команда не поддерживается.' };
    }
  }

  private async getPartnerId(userId: number | undefined): Promise<number | null> {
    if (!userId) return null;
    const { rows } = await pool.query<PartnerRow>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return rows[0]?.id ?? null;
  }

  async getToursSummary(context: AgentContext): Promise<AgencyResult> {
    const partnerId = await this.getPartnerId(context.user.userId);
    if (!partnerId) return { response: 'Профиль оператора не найден.' };

    const { rows } = await pool.query<TourSummaryRow>(`
      SELECT
        t.id,
        t.title,
        t.price_from,
        COUNT(b.id) FILTER (WHERE b.status NOT IN ('cancelled') AND b.deleted_at IS NULL)::text AS bookings_count,
        MIN(a.date)::text  AS next_date,
        SUM(a.available_slots) FILTER (WHERE a.is_available = TRUE AND a.date >= NOW()::date)::text AS available_slots
      FROM operator_tours t
      LEFT JOIN operator_bookings b  ON b.tour_id = t.id
      LEFT JOIN tour_availability  a ON a.tour_id = t.id AND a.date >= NOW()::date
      WHERE t.partner_id = $1 AND t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.title
      LIMIT 10
    `, [partnerId]);

    if (rows.length === 0) {
      return { response: 'Туры не найдены. Создайте первый тур в разделе "Туры".' };
    }

    const lines = ['<b>Ваши туры:</b>', ''];
    for (const r of rows) {
      const slots = r.available_slots ? `${r.available_slots} мест` : 'нет слотов';
      const next  = r.next_date ? ` | след. ${r.next_date}` : '';
      lines.push(`${r.title} — от ${Number(r.price_from).toLocaleString('ru-RU')} руб | ${slots}${next}`);
    }

    return { response: lines.join('\n'), data: { tours: rows } };
  }

  async getBookingsToday(context: AgentContext): Promise<AgencyResult> {
    const partnerId = await this.getPartnerId(context.user.userId);
    if (!partnerId) return { response: 'Профиль оператора не найден.' };

    const { rows } = await pool.query<BookingTodayRow>(`
      SELECT b.id, t.title AS tour_title, b.guest_name, b.guests_count, b.total_price, b.status
      FROM operator_bookings b
      JOIN operator_tours t ON t.id = b.tour_id
      WHERE t.partner_id = $1
        AND b.created_at >= NOW()::date
        AND b.deleted_at IS NULL
      ORDER BY b.created_at DESC
    `, [partnerId]);

    if (rows.length === 0) return { response: 'Бронирований сегодня нет.' };

    const lines = [`<b>Бронирования сегодня (${rows.length}):</b>`, ''];
    for (const r of rows) {
      lines.push(
        `${r.tour_title} — ${r.guest_name}, ${r.guests_count} чел, ` +
        `${Number(r.total_price).toLocaleString('ru-RU')} руб [${r.status}]`
      );
    }

    return { response: lines.join('\n'), data: { bookings: rows } };
  }

  async getRevenue(context: AgentContext): Promise<AgencyResult> {
    const partnerId = await this.getPartnerId(context.user.userId);
    if (!partnerId) return { response: 'Профиль оператора не найден.' };

    const { rows } = await pool.query<RevenueRow>(`
      SELECT
        SUM(b.total_price) FILTER (WHERE b.created_at >= NOW() - INTERVAL '7 days')::text  AS revenue_7d,
        SUM(b.total_price) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days')::text AS revenue_30d,
        COUNT(*) FILTER (WHERE b.created_at >= NOW() - INTERVAL '7 days')::text            AS bookings_7d,
        COUNT(*) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days')::text           AS bookings_30d
      FROM operator_bookings b
      JOIN operator_tours t ON t.id = b.tour_id
      WHERE t.partner_id = $1
        AND b.status NOT IN ('cancelled')
        AND b.deleted_at IS NULL
    `, [partnerId]);

    const r = rows[0] ?? { revenue_7d: null, revenue_30d: null, bookings_7d: '0', bookings_30d: '0' };
    const fmt = (v: string | null) =>
      v ? `${Number(v).toLocaleString('ru-RU')} руб` : '0 руб';

    const response = [
      '<b>Ваша выручка:</b>',
      `7 дней: ${fmt(r.revenue_7d)} (${r.bookings_7d} бронирований)`,
      `30 дней: ${fmt(r.revenue_30d)} (${r.bookings_30d} бронирований)`,
    ].join('\n');

    return { response, data: { revenue: r } };
  }
}
