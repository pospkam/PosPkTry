/**
 * QualityAgency — AI-отдел качества.
 *
 *   qa_reviews  — последние отзывы, средний рейтинг, аномалии
 *   qa_slots    — туры без доступных слотов в следующие 30 дней
 *   qa_operators — здоровье операторов (брони / выручка / слоты)
 */

import { pool } from '@/lib/db-pool';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface ReviewRow {
  rating: number;
  reviewer_name: string | null;
  comment: string | null;
  created_at: Date;
  tour_id: number | null;
}

interface ReviewStatsRow {
  total: string;
  avg_rating: string | null;
  five_star: string;
  one_star: string;
}

interface SlotlessRow {
  id: number;
  title: string;
  operator: string;
  is_published: boolean;
}

interface OperatorHealthRow {
  operator: string;
  tours: string;
  published: string;
  bookings_30d: string;
  revenue_30d: string | null;
  slots_ahead: string;
}

export class QualityAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    try {
      switch (intent) {
        case 'qa_reviews':   return await this.getReviews();
        case 'qa_slots':     return await this.getSlotless();
        case 'qa_operators': return await this.getOperatorHealth();
        default:             return { response: 'QualityAgency: команда не поддерживается.' };
      }
    } catch (err) {
      return {
        response: `Ошибка QA-агента: ${err instanceof Error ? err.message : String(err)}`,
        data: {}
      };
    }
  }

  private async getReviews(): Promise<AgencyResult> {
    const [stats, recent] = await Promise.all([
      pool.query<ReviewStatsRow>(`
        SELECT
          COUNT(*)::text                                    AS total,
          ROUND(AVG(rating), 1)::text                      AS avg_rating,
          COUNT(*) FILTER (WHERE rating = 5)::text         AS five_star,
          COUNT(*) FILTER (WHERE rating <= 2)::text        AS one_star
        FROM reviews
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query<ReviewRow>(`
        SELECT rating, author_name AS reviewer_name, comment, created_at, tour_id
        FROM operator_tour_reviews
        ORDER BY created_at DESC
        LIMIT 8
      `),
    ]);

    const s = stats.rows[0];

    // Enrich with bad reviews from external tool
    let badReviewsStr = '';
    if (this.tools.getRecentBadReviews) {
      try {
        const br = await this.tools.getRecentBadReviews(7);
        if (br.success && br.details?.reviews) {
          badReviewsStr = `\nПоследние негативные отзывы: ${JSON.stringify(br.details.reviews).slice(0, 500)}`;
        }
      } catch { /* non-critical */ }
    }

    const lines: string[] = [
      '<b>QA — отзывы (30 дней)</b>',
      '',
      `Всего: ${s.total} | Средний рейтинг: ${s.avg_rating ?? 'н/д'}`,
      `★★★★★: ${s.five_star} | ★☆☆☆☆ (1-2): ${s.one_star}`,
    ];

    if (recent.rows.length > 0) {
      lines.push('', 'Последние:');
      for (const r of recent.rows) {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const shortComment = r.comment ? r.comment.slice(0, 80) : '—';
        const date = new Date(r.created_at).toLocaleDateString('ru-RU');
        lines.push(`• ${stars} ${r.reviewer_name ?? 'Аноним'} (${date}): ${shortComment}`);
      }
    }

    if (badReviewsStr) {
      lines.push('', badReviewsStr);
    }

    return { response: lines.join('\n'), data: { stats: s, recent: recent.rows } };
  }

  private async getSlotless(): Promise<AgencyResult> {
    const { rows } = await pool.query<SlotlessRow>(`
      SELECT ot.id, ot.title, p.name AS operator, ot.is_published
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      WHERE ot.is_active    = true
        AND ot.deleted_at  IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM tour_availability ta
          WHERE ta.operator_tour_id = ot.id
            AND ta.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
            AND ta.is_cancelled = false
            AND ta.available_slots > COALESCE(ta.booked_slots, 0)
        )
      ORDER BY ot.is_published DESC, ot.id
      LIMIT 20
    `);

    if (rows.length === 0) {
      return { response: 'Все активные туры имеют доступные слоты на ближайшие 30 дней.' };
    }

    const published = rows.filter(r => r.is_published).length;
    const lines: string[] = [
      `<b>QA — туры без слотов (30 дней): ${rows.length}</b>`,
      `из них опубликованных: ${published}`,
      '',
    ];
    for (const r of rows) {
      const pub = r.is_published ? '[опубл.]' : '[черн.]';
      lines.push(`• [${r.id}] ${r.title} (${r.operator}) ${pub}`);
    }
    lines.push('', 'Команда для добавления: "добавь слоты туру &lt;ID&gt; с &lt;дата&gt; по &lt;дата&gt; 10 мест"');

    return { response: lines.join('\n'), data: { slotless: rows } };
  }

  private async getOperatorHealth(): Promise<AgencyResult> {
    const { rows } = await pool.query<OperatorHealthRow>(`
      SELECT
        p.name                                                      AS operator,
        COUNT(ot.id)::text                                          AS tours,
        COUNT(ot.id) FILTER (WHERE ot.is_published)::text          AS published,
        COUNT(ob.id) FILTER (
          WHERE ob.created_at >= NOW() - INTERVAL '30 days'
        )::text                                                     AS bookings_30d,
        COALESCE(SUM(ob.final_price) FILTER (
          WHERE ob.created_at >= NOW() - INTERVAL '30 days'
            AND ob.booking_booking_status IN ('confirmed','completed')
        )::text, '0')                                               AS revenue_30d,
        COUNT(DISTINCT ta.date) FILTER (
          WHERE ta.date >= CURRENT_DATE AND ta.is_cancelled = false
        )::text                                                     AS slots_ahead
      FROM partners p
      LEFT JOIN operator_tours ot ON ot.operator_id = p.id AND ot.deleted_at IS NULL
      LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id AND ob.deleted_at IS NULL
      LEFT JOIN tour_availability ta ON ta.operator_tour_id = ot.id
      WHERE p.is_public = true
      GROUP BY p.id, p.name
      ORDER BY bookings_30d DESC NULLS LAST
    `);

    const lines: string[] = ['<b>QA — здоровье операторов</b>', ''];
    for (const r of rows) {
      const rev = r.revenue_30d ? parseInt(r.revenue_30d, 10).toLocaleString('ru-RU') : '0';
      lines.push(
        `<b>${r.operator}</b>: ${r.tours} туров (${r.published} опубл.) | ` +
        `брони 30д: ${r.bookings_30d} | выручка: ${rev} ₽ | слотов: ${r.slots_ahead}`
      );
    }

    return { response: lines.join('\n'), data: { operators: rows } };
  }
}
