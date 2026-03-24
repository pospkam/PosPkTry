/**
 * FinanceAgency — AI-финансовый директор (CFO) туристической платформы.
 *
 * Анализирует реальную unit-экономику на основе данных БД:
 *   finance_report — выручка, комиссии, unit-экономика платформы
 *   finance_cashflow — притоки/оттоки за период
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

// ── Типы строк БД ─────────────────────────────────────────────────────────────

interface RevenueRow {
  period: string;
  booking_count: string;
  gross_revenue: string;
  platform_fee_total: string;
  avg_booking_value: string;
  paying_tourists: string;
}

interface TopOperatorRow {
  operator_id: string;
  operator_name: string;
  booking_count: string;
  revenue: string;
  platform_cut: string;
}

interface CommissionRow {
  status: string;
  count: string;
  total_amount: string;
}

interface PaymentRow {
  payment_method: string;
  count: string;
  total: string;
}

// ── FinanceAgency ──────────────────────────────────────────────────────────────

export class FinanceAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'finance_report':   return this.unitEconomicsReport();
      case 'finance_cashflow': return this.cashflowReport();
      default:                 return { response: 'FinanceAgency: команда не поддерживается.' };
    }
  }

  // ── Отчёт по unit-экономике ───────────────────────────────────────────────

  private async unitEconomicsReport(): Promise<AgencyResult> {
    try {
      const [revenue, topOperators, commissions, payments, totals] = await Promise.all([
        // Динамика выручки за 4 недели
        pool.query<RevenueRow>(`
          SELECT
            TO_CHAR(DATE_TRUNC('week', ob.created_at), 'DD.MM') AS period,
            COUNT(ob.id)::text                                   AS booking_count,
            COALESCE(SUM(ob.final_price), 0)::text               AS gross_revenue,
            COALESCE(SUM(ob.final_price * 0.15), 0)::text        AS platform_fee_total,
            COALESCE(AVG(ob.final_price), 0)::text               AS avg_booking_value,
            COUNT(DISTINCT ob.tourist_email)::text               AS paying_tourists
          FROM operator_bookings ob
          WHERE ob.created_at >= NOW() - INTERVAL '28 days'
            AND ob.payment_status = 'paid'
            AND ob.deleted_at IS NULL
          GROUP BY DATE_TRUNC('week', ob.created_at)
          ORDER BY DATE_TRUNC('week', ob.created_at) ASC
        `),

        // Топ-5 операторов по выручке (30 дней)
        pool.query<TopOperatorRow>(`
          SELECT
            u.id::text                                     AS operator_id,
            COALESCE(u.name, u.email, 'Без имени')         AS operator_name,
            COUNT(ob.id)::text                             AS booking_count,
            COALESCE(SUM(ob.final_price), 0)::text         AS revenue,
            COALESCE(SUM(ob.final_price * 0.15), 0)::text  AS platform_cut
          FROM operator_bookings ob
          JOIN operator_tours ot ON ot.id = ob.operator_tour_id
          JOIN users u            ON u.id  = ot.operator_id
          WHERE ob.created_at >= NOW() - INTERVAL '30 days'
            AND ob.payment_status = 'paid'
            AND ob.deleted_at IS NULL
          GROUP BY u.id, u.name, u.email
          ORDER BY SUM(ob.final_price) DESC NULLS LAST
          LIMIT 5
        `),

        // Статус agent_commissions
        pool.query<CommissionRow>(`
          SELECT
            status,
            COUNT(*)::text        AS count,
            COALESCE(SUM(amount), 0)::text AS total_amount
          FROM agent_commissions
          GROUP BY status
        `),

        // Разбивка по способам оплаты
        pool.query<PaymentRow>(`
          SELECT
            COALESCE(payment_method, 'не указан') AS payment_method,
            COUNT(*)::text                         AS count,
            COALESCE(SUM(final_price), 0)::text    AS total
          FROM operator_bookings
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND payment_status = 'paid'
            AND deleted_at IS NULL
          GROUP BY payment_method
          ORDER BY SUM(final_price) DESC NULLS LAST
        `),

        // Итоги за 30 дней
        pool.query<{
          total_bookings: string;
          total_revenue: string;
          platform_revenue: string;
          refund_count: string;
          refund_amount: string;
        }>(`
          SELECT
            COUNT(*) FILTER (WHERE payment_status = 'paid')::text    AS total_bookings,
            COALESCE(SUM(final_price) FILTER (WHERE payment_status = 'paid'), 0)::text AS total_revenue,
            COALESCE(SUM(final_price * 0.15) FILTER (WHERE payment_status = 'paid'), 0)::text AS platform_revenue,
            COUNT(*) FILTER (WHERE payment_status = 'refunded')::text AS refund_count,
            COALESCE(SUM(final_price) FILTER (WHERE payment_status = 'refunded'), 0)::text AS refund_amount
          FROM operator_bookings
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND deleted_at IS NULL
        `),
      ]);

      const t = totals.rows[0] ?? {
        total_bookings: '0', total_revenue: '0', platform_revenue: '0',
        refund_count: '0', refund_amount: '0',
      };

      const data = {
        revenue_by_week: revenue.rows,
        top_operators:   topOperators.rows,
        commissions:     commissions.rows,
        payments:        payments.rows,
        totals:          t,
      };

      const grossRev    = parseFloat(t.total_revenue)   || 0;
      const platformRev = parseFloat(t.platform_revenue) || 0;
      const avgBooking  = grossRev / (parseInt(t.total_bookings, 10) || 1);

      const prompt = [
        'Ты финансовый директор туристической платформы Камчатки.',
        'Вот данные за последние 30 дней. Дай честный финансовый анализ:',
        '',
        `ИТОГИ:`,
        `- Оплаченных бронирований: ${t.total_bookings}`,
        `- Валовая выручка: ${grossRev.toLocaleString('ru-RU')} руб`,
        `- Комиссия платформы (15%): ${platformRev.toLocaleString('ru-RU')} руб`,
        `- Средний чек: ${avgBooking.toFixed(0)} руб`,
        `- Возвраты: ${t.refund_count} на ${t.refund_amount} руб`,
        '',
        'ДИНАМИКА ПО НЕДЕЛЯМ:',
        revenue.rows.map(r => `  ${r.period}: ${r.booking_count} броней, ${r.gross_revenue} руб, платформа: ${r.platform_fee_total} руб`).join('\n') || '  нет данных',
        '',
        'ТОП ОПЕРАТОРОВ:',
        topOperators.rows.map((op, i) => `  ${i + 1}. ${op.operator_name}: ${op.booking_count} броней, ${op.revenue} руб (платформа: ${op.platform_cut} руб)`).join('\n') || '  нет данных',
        '',
        'КОМИССИИ АГЕНТОВ:',
        commissions.rows.map(c => `  ${c.status}: ${c.count} записей на ${c.total_amount} руб`).join('\n') || '  нет данных',
        '',
        'Правила:',
        '1. Только данные из БД — без предположений',
        '2. Если данных мало — скажи "недостаточно данных"',
        '3. Укажи 1-2 конкретных риска с цифрами',
        '4. Укажи confidence: high/medium/low',
      ].join('\n');

      let paymentHealthStr = '';
      if (this.tools.getPaymentHealth) {
        try {
          const ph = await this.tools.getPaymentHealth();
          if (ph.success && ph.details?.health) {
            paymentHealthStr = `\nЗдоровье платежей: ${JSON.stringify(ph.details.health)}`;
          }
        } catch { /* non-critical */ }
      }

      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}${paymentHealthStr}` : `${prompt}${paymentHealthStr}`;
      const aiText = await callAIWaterfall([{ role: 'user', content: fullPrompt }]);

      const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const response = `<b>Финансовый отчёт — ${date}</b>\n\nВыручка: ${grossRev.toLocaleString('ru-RU')} руб | Платформа: ${platformRev.toLocaleString('ru-RU')} руб | Брони: ${t.total_bookings}\n\n${aiText ?? this.formatFallback(t)}`;

      // Alert on stuck payments (pending commissions that may need attention)
      const pendingCommissions = commissions.rows.find(c => c.status === 'pending');
      const stuckCount = pendingCommissions ? parseInt(pendingCommissions.count, 10) : 0;
      if (this.tools.sendFinanceAlert && stuckCount > 0) {
        try {
          await this.tools.sendFinanceAlert(
            `${stuckCount} pending commissions, total: ${pendingCommissions?.total_amount ?? '0'} rub`
          );
        } catch { /* tool failure is non-blocking */ }
      }

      return { response, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        response: `<b>Финансовый отчёт недоступен</b>\n\nОшибка: ${msg}`,
        data: {},
      };
    }
  }

  // ── Отчёт по движению денег ───────────────────────────────────────────────

  private async cashflowReport(): Promise<AgencyResult> {
    try {
      const rows = await pool.query<{
        day: string;
        inflow: string;
        booking_count: string;
      }>(`
        SELECT
          TO_CHAR(DATE_TRUNC('day', ob.created_at), 'DD.MM') AS day,
          COALESCE(SUM(ob.final_price), 0)::text              AS inflow,
          COUNT(ob.id)::text                                  AS booking_count
        FROM operator_bookings ob
        WHERE ob.created_at >= NOW() - INTERVAL '14 days'
          AND ob.payment_status = 'paid'
          AND ob.deleted_at IS NULL
        GROUP BY DATE_TRUNC('day', ob.created_at)
        ORDER BY DATE_TRUNC('day', ob.created_at) ASC
      `);

      const totalInflow = rows.rows.reduce((s, r) => s + parseFloat(r.inflow), 0);

      const lines = rows.rows.map(r =>
        `  ${r.day}: +${parseFloat(r.inflow).toLocaleString('ru-RU')} руб (${r.booking_count} броней)`
      ).join('\n') || '  нет данных';

      const response = [
        '<b>Движение средств (14 дней)</b>',
        '',
        lines,
        '',
        `Итого приток: ${totalInflow.toLocaleString('ru-RU')} руб`,
        `Комиссия платформы (15%): ${(totalInflow * 0.15).toLocaleString('ru-RU')} руб`,
      ].join('\n');

      return { response, data: { cashflow: rows.rows, total_inflow: totalInflow } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { response: `Cashflow отчёт недоступен: ${msg}`, data: {} };
    }
  }

  private formatFallback(t: { total_bookings: string; total_revenue: string; platform_revenue: string }): string {
    return [
      `Бронирований: ${t.total_bookings}`,
      `Выручка: ${t.total_revenue} руб`,
      `Комиссия платформы: ${t.platform_revenue} руб`,
    ].join('\n');
  }
}
