/**
 * ContentAuditorAgency — AI-аудитор контента.
 *
 * Анализирует качество туров в operator_tours:
 *   content_audit — полный аудит: что заполнено, что нет, приоритеты
 *   content_flag  — туры готовые к AI-заполнению (активны, цена есть, контент пуст)
 */

import { pool } from '@/lib/db-pool';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface TourAuditRow {
  id: number;
  title: string;
  operator: string;
  has_desc: boolean;
  has_image: boolean;
  has_price: boolean;
  has_duration: boolean;
  is_published: boolean;
  score: number;
}

interface AuditSummaryRow {
  total: string;
  published: string;
  no_desc: string;
  no_image: string;
  no_price: string;
  no_duration: string;
  fully_complete: string;
}

export class ContentAuditorAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    try {
      switch (intent) {
        case 'content_audit': return await this.auditAll();
        case 'content_flag':  return await this.flagForFill();
        default:              return { response: 'ContentAuditorAgency: команда не поддерживается.' };
      }
    } catch (err) {
      return {
        response: `Ошибка контент-аудитора: ${err instanceof Error ? err.message : String(err)}`,
        data: {}
      };
    }
  }

  private async auditAll(): Promise<AgencyResult> {
    const [summary, worst] = await Promise.all([
      pool.query<AuditSummaryRow>(`
        SELECT
          COUNT(*)::text                                              AS total,
          COUNT(*) FILTER (WHERE is_published)::text                 AS published,
          COUNT(*) FILTER (WHERE description IS NULL
                             OR length(description) < 50)::text      AS no_desc,
          COUNT(*) FILTER (WHERE tour_image IS NULL)::text           AS no_image,
          COUNT(*) FILTER (WHERE base_price IS NULL
                             OR base_price = 0)::text                AS no_price,
          COUNT(*) FILTER (WHERE duration_hours IS NULL)::text       AS no_duration,
          COUNT(*) FILTER (
            WHERE (description IS NOT NULL AND length(description) >= 50)
              AND tour_image IS NOT NULL
              AND base_price > 0
              AND duration_hours IS NOT NULL
          )::text                                                     AS fully_complete
        FROM operator_tours
        WHERE deleted_at IS NULL AND is_active = true
      `),
      pool.query<TourAuditRow>(`
        SELECT
          ot.id,
          ot.title,
          p.name AS operator,
          (ot.description IS NOT NULL AND length(ot.description) >= 50) AS has_desc,
          (ot.tour_image IS NOT NULL)                                    AS has_image,
          (ot.base_price IS NOT NULL AND ot.base_price > 0)             AS has_price,
          (ot.duration_hours IS NOT NULL)                                AS has_duration,
          ot.is_published,
          (
            CASE WHEN ot.description IS NOT NULL AND length(ot.description) >= 50 THEN 1 ELSE 0 END +
            CASE WHEN ot.tour_image IS NOT NULL                                   THEN 1 ELSE 0 END +
            CASE WHEN ot.base_price  > 0                                          THEN 1 ELSE 0 END +
            CASE WHEN ot.duration_hours IS NOT NULL                               THEN 1 ELSE 0 END
          ) AS score
        FROM operator_tours ot
        JOIN partners p ON p.id = ot.operator_id
        WHERE ot.deleted_at IS NULL AND ot.is_active = true
        ORDER BY score ASC, ot.id
        LIMIT 10
      `),
    ]);

    const s = summary.rows[0];
    const completePct = s.total !== '0'
      ? Math.round((parseInt(s.fully_complete, 10) / parseInt(s.total, 10)) * 100)
      : 0;

    // Enrich with low-CTR tours from external tool
    let lowCTRStr = '';
    if (this.tools.getLowCTRTours) {
      try {
        const ctr = await this.tools.getLowCTRTours(10);
        if (ctr.success && ctr.details?.tours) {
          lowCTRStr = `\nТуры с низкой конверсией: ${JSON.stringify(ctr.details.tours).slice(0, 500)}`;
        }
      } catch { /* non-critical */ }
    }

    const lines: string[] = [
      '<b>Аудит контента туров</b>',
      '',
      `Всего активных: ${s.total} (опубликовано: ${s.published})`,
      `Полностью заполнены: ${s.fully_complete} (${completePct}%)`,
      '',
      'Проблемы:',
      `• Нет описания: ${s.no_desc}`,
      `• Нет фото: ${s.no_image}`,
      `• Нет цены: ${s.no_price}`,
      `• Нет продолжительности: ${s.no_duration}`,
    ];

    if (worst.rows.length > 0) {
      lines.push('', 'Туры с наихудшим контентом:');
      for (const t of worst.rows) {
        const flags = [
          !t.has_desc     && 'нет описания',
          !t.has_image    && 'нет фото',
          !t.has_price    && 'нет цены',
          !t.has_duration && 'нет длит.',
        ].filter(Boolean);
        lines.push(`• [${t.id}] ${t.title} (${t.operator}) — ${flags.join(', ')}`);
      }
    }

    if (lowCTRStr) {
      lines.push('', lowCTRStr);
    }

    return { response: lines.join('\n'), data: { summary: s, worst: worst.rows } };
  }

  private async flagForFill(): Promise<AgencyResult> {
    const { rows } = await pool.query<{
      id: number; title: string; operator: string;
      missing_fields: string; is_published: boolean;
    }>(`
      SELECT
        ot.id,
        ot.title,
        p.name AS operator,
        is_published,
        CONCAT_WS(', ',
          CASE WHEN description IS NULL OR length(description) < 50 THEN 'описание' END,
          CASE WHEN tour_image IS NULL                              THEN 'фото'      END,
          CASE WHEN duration_hours IS NULL                          THEN 'длит.'     END,
          CASE WHEN short_description IS NULL OR length(short_description) < 20 THEN 'краткое' END
        ) AS missing_fields
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      WHERE ot.deleted_at IS NULL
        AND ot.is_active  = true
        AND ot.base_price > 0
        AND (
          ot.description IS NULL OR length(ot.description) < 50 OR
          ot.tour_image  IS NULL OR
          ot.duration_hours IS NULL
        )
      ORDER BY ot.is_published DESC, ot.id
      LIMIT 15
    `);

    if (rows.length === 0) {
      return { response: 'Все активные туры с ценой имеют заполненный контент. Контент-аудит пройден.' };
    }

    const lines: string[] = [
      `<b>Туры для AI-заполнения (${rows.length})</b>`,
      'Команда: "заполни тур &lt;ID&gt;"',
      '',
    ];
    for (const r of rows) {
      const pub = r.is_published ? '[опубл.]' : '[черновик]';
      lines.push(`• [${r.id}] ${r.title} ${pub} — нет: ${r.missing_fields}`);
    }

    return { response: lines.join('\n'), data: { tours: rows } };
  }
}
