/**
 * PlanningAgency — AI-плановый отдел.
 *
 *   plan_forecast — прогноз спроса: тренд броней следующие 30 дней
 *   plan_season   — сезонный анализ броней по месяцам
 *   plan_gaps     — разрывы спроса/предложения по активностям
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface TrendRow {
  week: string;
  bookings: string;
  revenue: string | null;
}

interface SeasonRow {
  month: string;
  bookings: string;
  revenue: string | null;
}

interface GapRow {
  activity_type: string | null;
  demand_leads: string;
  tours_active: string;
  slots_ahead: string;
}

export class PlanningAgency {
  private briefing = '';
  private preferredModel: string | null = null;
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.preferredModel = context.preferredModel ?? null;
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'plan_forecast': return this.getForecast();
      case 'plan_season':   return this.getSeasonalAnalysis();
      case 'plan_gaps':     return this.getDemandGaps();
      default:              return { response: 'PlanningAgency: команда не поддерживается.' };
    }
  }

  private async getForecast(): Promise<AgencyResult> {
    const { rows: trend } = await pool.query<TrendRow>(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')      AS week,
        COUNT(*)::text                                              AS bookings,
        COALESCE(SUM(final_price)
          FILTER (WHERE booking_status IN ('confirmed','completed')), 0)::text AS revenue
      FROM operator_bookings
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
        AND deleted_at IS NULL
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `);

    const lines: string[] = ['<b>Плановый отдел — тренд броней (12 недель)</b>', ''];

    if (trend.length === 0) {
      lines.push('Данных о бронированиях пока нет.');
      return { response: lines.join('\n') };
    }

    for (const r of trend) {
      const rev = r.revenue ? parseInt(r.revenue, 10).toLocaleString('ru-RU') : '0';
      lines.push(`${r.week}: ${r.bookings} броней, ${rev} ₽`);
    }

    // Автоматический анализ тренда через AI
    const last4 = trend.slice(-4).map(r => `${r.week}: ${r.bookings}`).join(', ');
    const prev4 = trend.slice(-8, -4).map(r => `${r.week}: ${r.bookings}`).join(', ');

    let demandSnapshot = '';
    if (this.tools.getDemandSnapshot) {
      try {
        const snap = await this.tools.getDemandSnapshot();
        if (snap.success && snap.details) {
          demandSnapshot = `\nCнимок спроса: ${JSON.stringify(snap.details).slice(0, 500)}`;
        }
      } catch { /* non-critical */ }
    }

    const aiPrompt = `Туристическая платформа Камчатки. Брони за последние 4 недели: ${last4}. Предыдущие 4 недели: ${prev4}. ${demandSnapshot}Какой тренд и прогноз на следующий месяц? 2 предложения, без эмодзи.`;
    const fullAiPrompt = this.briefing ? `${this.briefing}\n\n${aiPrompt}` : aiPrompt;

    let forecast = '';
    try {
      const { text: aiResult } = await callAIWithModel([{ role: 'user', content: fullAiPrompt }], this.preferredModel);
      if (aiResult) forecast = aiResult.trim();
    } catch { /* silent */ }

    if (forecast) lines.push('', `Прогноз: ${forecast}`);

    return { response: lines.join('\n'), data: { trend } };
  }

  private async getSeasonalAnalysis(): Promise<AgencyResult> {
    const { rows } = await pool.query<SeasonRow>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')         AS month,
        COUNT(*)::text                                               AS bookings,
        COALESCE(SUM(final_price)
          FILTER (WHERE booking_status IN ('confirmed','completed')), 0)::text AS revenue
      FROM operator_bookings
      WHERE deleted_at IS NULL
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    if (rows.length === 0) {
      return { response: 'Данных о бронированиях для сезонного анализа пока нет.' };
    }

    const lines: string[] = ['<b>Сезонный анализ броней</b>', ''];
    for (const r of rows) {
      const rev = r.revenue ? parseInt(r.revenue, 10).toLocaleString('ru-RU') : '0';
      lines.push(`${r.month}: ${r.bookings} броней — ${rev} ₽`);
    }

    return { response: lines.join('\n'), data: { seasonal: rows } };
  }

  private async getDemandGaps(): Promise<AgencyResult> {
    const { rows } = await pool.query<GapRow>(`
      SELECT
        ot.activity_type,
        COUNT(DISTINCT l.id)::text                                 AS demand_leads,
        COUNT(DISTINCT ot.id)::text                                AS tours_active,
        COALESCE(SUM(
          CASE WHEN ta.date >= CURRENT_DATE AND ta.is_available = true
            THEN ta.available_slots - COALESCE(ta.booked_slots, 0)
          ELSE 0 END
        ), 0)::text                                                AS slots_ahead
      FROM operator_tours ot
      LEFT JOIN tour_availability ta ON ta.operator_tour_id = ot.id
      LEFT JOIN leads l ON l.source_data->>'interests' ILIKE '%' || COALESCE(ot.activity_type,'') || '%'
      WHERE ot.deleted_at IS NULL AND ot.is_active = true
      GROUP BY ot.activity_type
      ORDER BY demand_leads::int DESC
    `);

    if (rows.length === 0) {
      return { response: 'Данных для анализа спроса пока нет.' };
    }

    const lines: string[] = ['<b>Разрывы спроса/предложения</b>', ''];
    for (const r of rows) {
      const at = r.activity_type ?? 'другое';
      const gap = parseInt(r.slots_ahead, 10) === 0 && parseInt(r.demand_leads, 10) > 0 ? ' [!]' : '';
      lines.push(
        `• ${at}: лидов ${r.demand_leads}, туров ${r.tours_active}, ` +
        `свободных мест ${r.slots_ahead}${gap}`
      );
    }

    return { response: lines.join('\n'), data: { gaps: rows } };
  }
}
