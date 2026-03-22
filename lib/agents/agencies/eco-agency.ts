/**
 * EcoAgency — AI-эколог туристической платформы Камчатки.
 *
 * Мониторинг экологического воздействия туризма и охрана природных зон:
 *   eco_impact — метрики экологического воздействия туров
 *   eco_zones  — проверка туров в охраняемых природных зонах
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface EcoImpactRow {
  activity_type: string;
  tour_count: string;
  booking_count: string;
  tourist_count: string;
  eco_score: string;
}

interface ZoneRiskRow {
  zone: string;
  route_count: string;
  tour_count: string;
  booking_count: string;
  risk_level: string;
}

export class EcoAgency {
  async run(intent: string, _context: AgentContext): Promise<AgencyResult> {
    switch (intent) {
      case 'eco_impact': return this.impactReport();
      case 'eco_zones':  return this.zoneAudit();
      default:           return { response: 'EcoAgency: команда не поддерживается.' };
    }
  }

  /** Экологическое воздействие по типам активности */
  private async impactReport(): Promise<AgencyResult> {
    const [impact, ecoPoints] = await Promise.all([
      pool.query<EcoImpactRow>(`
        SELECT
          COALESCE(ark.activity_type, 'не указан')          AS activity_type,
          COUNT(DISTINCT ot.id)::text                       AS tour_count,
          COUNT(DISTINCT ob.id)::text                       AS booking_count,
          COALESCE(SUM(ob.participants), 0)::text     AS tourist_count,
          CASE
            WHEN COALESCE(ark.activity_type, '') IN ('trekking', 'boat_trip') THEN '75'
            WHEN COALESCE(ark.activity_type, '') IN ('fishing')               THEN '60'
            WHEN COALESCE(ark.activity_type, '') IN ('helicopter')            THEN '30'
            WHEN COALESCE(ark.activity_type, '') IN ('thermal')               THEN '85'
            WHEN COALESCE(ark.activity_type, '') IN ('snowmobile')            THEN '25'
            ELSE '50'
          END                                               AS eco_score
        FROM operator_tours ot
        LEFT JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
        LEFT JOIN operator_bookings ob
          ON ob.operator_tour_id = ot.id AND ob.deleted_at IS NULL
          AND ob.created_at >= NOW() - INTERVAL '30 days'
        WHERE ot.deleted_at IS NULL AND ot.is_active = true
        GROUP BY ark.activity_type
        ORDER BY booking_count::int DESC
      `),
      pool.query<{ total_eco_points: string; eco_tourists: string }>(`
        SELECT
          COALESCE(SUM(total_points), 0)::text AS total_eco_points,
          COUNT(*)::text                        AS eco_tourists
        FROM user_eco_points
      `),
    ]);

    const ep = ecoPoints.rows[0];
    const totalTourists = impact.rows.reduce((s, r) => s + parseInt(r.tourist_count, 10), 0);
    const avgEcoScore   = impact.rows.length > 0
      ? Math.round(impact.rows.reduce((s, r) => s + parseInt(r.eco_score, 10), 0) / impact.rows.length)
      : 0;

    const lines: string[] = [
      '<b>Экологический мониторинг платформы (30 дней)</b>',
      '',
      `Туристов через платформу: ${totalTourists}`,
      `Eco-points у туристов: ${ep.total_eco_points} (${ep.eco_tourists} участников)`,
      `Средний eco-score туров: ${avgEcoScore}/100`,
      '',
      'Воздействие по видам активности:',
    ];

    for (const r of impact.rows) {
      const score = parseInt(r.eco_score, 10);
      const label = score >= 70 ? 'низкое' : score >= 40 ? 'умеренное' : 'высокое';
      lines.push(
        `• ${r.activity_type}: ${r.booking_count} брони, ${r.tourist_count} чел. ` +
        `[eco-score: ${r.eco_score}, воздействие: ${label}]`
      );
    }

    const aiComment = await this.callAI(
      `Эколог туристической платформы Камчатка. Данные 30 дней: ` +
      `${totalTourists} туристов, средний eco-score ${avgEcoScore}/100. ` +
      `Наиболее уязвимые виды: вертолётные туры (score 30), снегоходы (25). ` +
      `Дай 2-3 конкретные рекомендации по снижению нагрузки на экосистему. Кратко.`
    );

    if (aiComment) lines.push('', '<b>Рекомендации эколога:</b>', aiComment);

    return { response: lines.join('\n'), data: { impact: impact.rows, eco_points: ep } };
  }

  /** Аудит туров в охраняемых природных зонах */
  private async zoneAudit(): Promise<AgencyResult> {
    const { rows } = await pool.query<ZoneRiskRow>(`
      SELECT
        COALESCE(ark.zone, 'не определена')                     AS zone,
        COUNT(DISTINCT ark.id)::text                            AS route_count,
        COUNT(DISTINCT ot.id)::text                             AS tour_count,
        COUNT(DISTINCT ob.id)::text                             AS booking_count,
        CASE
          WHEN COALESCE(ark.zone, '') = 'northern'  THEN 'высокий (заповедник)'
          WHEN COALESCE(ark.zone, '') = 'eastern'   THEN 'высокий (Кроноцкий)'
          WHEN COALESCE(ark.zone, '') = 'avachinsky' THEN 'средний'
          WHEN COALESCE(ark.zone, '') = 'western'   THEN 'низкий'
          ELSE 'не оценён'
        END                                                     AS risk_level
      FROM agent_route_knowledge ark
      LEFT JOIN operator_tours ot ON ot.agent_route_id = ark.id
        AND ot.deleted_at IS NULL AND ot.is_active = true
      LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
        AND ob.deleted_at IS NULL
        AND ob.created_at >= NOW() - INTERVAL '30 days'
      WHERE ark.is_visible = true
      GROUP BY ark.zone
      ORDER BY booking_count::int DESC
    `);

    const highRisk = rows.filter(r => r.risk_level.startsWith('высокий'));

    const lines: string[] = [
      '<b>Аудит туров в природных зонах Камчатки</b>',
      '',
    ];

    for (const r of rows) {
      lines.push(
        `<b>${r.zone}</b>: ${r.route_count} маршрутов, ${r.tour_count} туров, ` +
        `${r.booking_count} броней/30д — ${r.risk_level}`
      );
    }

    if (highRisk.length > 0) {
      lines.push('', '<b>Зоны повышенного контроля:</b>');
      for (const z of highRisk) {
        lines.push(`• Зона "${z.zone}": ${z.booking_count} броней за 30 дней. Требуется разрешение ФГБУ.`);
      }
      lines.push('', 'Контакты: Кроноцкий заповедник +7(4152)41-02-60, ФГБУ «Заповедники Камчатки»');
    }

    return { response: lines.join('\n'), data: { zones: rows, high_risk_zones: highRisk } };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      return await callAIWaterfall(messages);
    } catch {
      return null;
    }
  }
}
