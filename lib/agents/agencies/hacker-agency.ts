/**
 * HackerAgency — AI growth-хакер платформы.
 *
 * Находит точки роста, анализирует воронки и предлагает автоматизацию:
 *   hack_growth    — точки роста: конверсия, LTV, узкие места воронки
 *   hack_funnel    — где теряются пользователи (просмотр → лид → бронь)
 *   hack_automate  — что можно автоматизировать прямо сейчас
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface FunnelRow {
  stage: string;
  count: string;
  conversion: string;
}

interface TopPageRow {
  path: string;
  views: string;
  pct: string;
}

interface GrowthMetricRow {
  page_views_7d: string;
  leads_7d: string;
  bookings_7d: string;
  avg_booking_value: string;
  top_source: string;
}

interface AutomationRow {
  category: string;
  count: string;
  suggestion: string;
}

export class HackerAgency {
  async run(intent: string, _context: AgentContext): Promise<AgencyResult> {
    try {
      switch (intent) {
        case 'hack_growth':    return await this.growthAnalysis();
        case 'hack_funnel':    return await this.funnelAnalysis();
        case 'hack_automate':  return await this.automationOpportunities();
        default:               return { response: 'HackerAgency: команда не поддерживается.' };
      }
    } catch (err) {
      return {
        response: `Ошибка growth-агента: ${err instanceof Error ? err.message : String(err)}`,
        data: {}
      };
    }
  }

  /** Анализ точек роста на основе реальных данных */
  private async growthAnalysis(): Promise<AgencyResult> {
    const [metrics, topPages] = await Promise.all([
      pool.query<GrowthMetricRow>(`
        SELECT
          (SELECT COUNT(*)::text FROM page_views
            WHERE created_at >= NOW() - INTERVAL '7 days')             AS page_views_7d,
          (SELECT COUNT(*)::text FROM leads
            WHERE created_at >= NOW() - INTERVAL '7 days')             AS leads_7d,
          (SELECT COUNT(*)::text FROM operator_bookings
            WHERE created_at >= NOW() - INTERVAL '7 days'
              AND deleted_at IS NULL)                                   AS bookings_7d,
          (SELECT ROUND(AVG(total_amount))::text FROM operator_bookings
            WHERE created_at >= NOW() - INTERVAL '30 days'
              AND deleted_at IS NULL
              AND total_amount > 0)                                     AS avg_booking_value,
          (SELECT COALESCE(
            (SELECT source_url FROM leads
              WHERE created_at >= NOW() - INTERVAL '7 days'
                AND source_url IS NOT NULL AND source_url != ''
              GROUP BY source_url ORDER BY COUNT(*) DESC LIMIT 1),
            'прямой переход'
          ))                                                            AS top_source
      `),
      pool.query<TopPageRow>(`
        WITH total AS (
          SELECT COUNT(*) AS cnt FROM page_views
          WHERE created_at >= NOW() - INTERVAL '7 days'
        )
        SELECT
          path,
          COUNT(*)::text                                  AS views,
          ROUND(100.0 * COUNT(*) / NULLIF((SELECT cnt FROM total), 0), 1)::text AS pct
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND path NOT LIKE '/api/%'
        GROUP BY path
        ORDER BY COUNT(*) DESC
        LIMIT 8
      `),
    ]);

    const m = metrics.rows[0];
    const views    = parseInt(m.page_views_7d, 10) || 0;
    const leads    = parseInt(m.leads_7d, 10) || 0;
    const bookings = parseInt(m.bookings_7d, 10) || 0;

    const visitToLead   = views > 0  ? ((leads / views)    * 100).toFixed(2) : '0';
    const leadToBooking = leads > 0  ? ((bookings / leads)  * 100).toFixed(1) : '0';
    const visitToBook   = views > 0  ? ((bookings / views)  * 100).toFixed(3) : '0';

    const lines: string[] = [
      '<b>Growth-анализ платформы (7 дней)</b>',
      '',
      `Просмотры: ${views}`,
      `Лиды: ${leads} (конверсия ${visitToLead}%)`,
      `Бронирования: ${bookings} (лид→бронь ${leadToBooking}%)`,
      `Общая конверсия: ${visitToBook}%`,
      `Средний чек: ${m.avg_booking_value ? `${m.avg_booking_value} руб.` : 'нет данных'}`,
      `Топ источник: ${m.top_source}`,
    ];

    if (topPages.rows.length > 0) {
      lines.push('', 'Топ страниц:');
      for (const p of topPages.rows) {
        lines.push(`• ${p.path} — ${p.views} просм. (${p.pct}%)`);
      }
    }

    const aiAdvice = await this.callAI(
      `Growth-хакер для туристической платформы Камчатки. Данные за 7 дней: ` +
      `${views} просмотров, ${leads} лидов (${visitToLead}% конверсия), ` +
      `${bookings} бронирований (${leadToBooking}% лид→бронь), ` +
      `средний чек: ${m.avg_booking_value} руб. ` +
      `Дай ТОП-3 конкретных действия для удвоения конверсии. Без воды, только факты.`
    );

    if (aiAdvice) lines.push('', '<b>AI-рекомендации:</b>', aiAdvice);

    return {
      response: lines.join('\n'),
      data: { metrics: m, pages: topPages.rows, conversion: { visitToLead, leadToBooking } },
    };
  }

  /** Воронка: где теряются пользователи */
  private async funnelAnalysis(): Promise<AgencyResult> {
    const { rows } = await pool.query<FunnelRow>(`
      WITH funnel AS (
        SELECT 1 AS step, 'Просмотры страниц (7д)'    AS stage,
          (SELECT COUNT(*) FROM page_views
            WHERE created_at >= NOW() - INTERVAL '7 days')        AS count
        UNION ALL
        SELECT 2, 'Просмотры туров (7д)',
          (SELECT COUNT(*) FROM page_views
            WHERE path LIKE '/tours/%'
              AND created_at >= NOW() - INTERVAL '7 days')
        UNION ALL
        SELECT 3, 'Лиды (7д)',
          (SELECT COUNT(*) FROM leads
            WHERE created_at >= NOW() - INTERVAL '7 days')
        UNION ALL
        SELECT 4, 'Бронирования (7д)',
          (SELECT COUNT(*) FROM operator_bookings
            WHERE created_at >= NOW() - INTERVAL '7 days'
              AND deleted_at IS NULL)
        UNION ALL
        SELECT 5, 'Подтверждённые (7д)',
          (SELECT COUNT(*) FROM operator_bookings
            WHERE status = 'confirmed'
              AND created_at >= NOW() - INTERVAL '7 days'
              AND deleted_at IS NULL)
      )
      SELECT
        stage,
        count::text,
        CASE
          WHEN LAG(count) OVER (ORDER BY step) IS NULL THEN '100'
          WHEN LAG(count) OVER (ORDER BY step) = 0     THEN '0'
          ELSE ROUND(100.0 * count / LAG(count) OVER (ORDER BY step), 1)::text
        END AS conversion
      FROM funnel
      ORDER BY step
    `);

    const lines: string[] = [
      '<b>Воронка конверсии (7 дней)</b>',
      '',
    ];

    for (const r of rows) {
      const conv = r.conversion === '100' ? '' : ` (↓${r.conversion}% от пред.)`;
      lines.push(`• ${r.stage}: ${r.count}${conv}`);
    }

    // Находим самую слабую ступень
    const drops = rows
      .filter(r => r.conversion !== '100')
      .map(r => ({ stage: r.stage, drop: 100 - parseFloat(r.conversion) }))
      .sort((a, b) => b.drop - a.drop);

    if (drops.length > 0) {
      const worst = drops[0];
      lines.push('', `Самый слабый переход: "${worst.stage}" (потери ${worst.drop.toFixed(1)}%)`);
      lines.push('Фокус: оптимизировать именно этот шаг.');
    }

    return { response: lines.join('\n'), data: { funnel: rows, drops } };
  }

  /** Находит что можно автоматизировать */
  private async automationOpportunities(): Promise<AgencyResult> {
    const { rows } = await pool.query<AutomationRow>(`
      SELECT * FROM (
        -- Туры без слотов на ближайшие 30 дней
        SELECT
          'Туры без дат' AS category,
          COUNT(*)::text AS count,
          'Создать слоты через: "добавь слоты для тура <ID> на <период>"' AS suggestion
        FROM operator_tours ot
        WHERE ot.deleted_at IS NULL AND ot.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM tour_availability ta
            WHERE ta.tour_id = ot.id
              AND ta.date >= CURRENT_DATE
              AND ta.date <= CURRENT_DATE + 30
          )

        UNION ALL

        -- Лиды без ответа > 2 часов
        SELECT
          'Лиды без ответа (>2ч)' AS category,
          COUNT(*)::text,
          'Запустить follow-up: /api/cron/leads-followup' AS suggestion
        FROM leads
        WHERE status = 'new'
          AND created_at < NOW() - INTERVAL '2 hours'
          AND created_at >= NOW() - INTERVAL '7 days'

        UNION ALL

        -- Туры без AI-заполнения
        SELECT
          'Туры без контента (AI-fill)' AS category,
          COUNT(*)::text,
          'Запустить: "заполни тур <ID>"' AS suggestion
        FROM operator_tours
        WHERE deleted_at IS NULL AND is_active = true AND base_price > 0
          AND (description IS NULL OR length(description) < 50)

        UNION ALL

        -- Операторы без публичного профиля
        SELECT
          'Операторы со скрытым профилем' AS category,
          COUNT(*)::text,
          'Активировать профиль в /hub/admin/partners' AS suggestion
        FROM partners
        WHERE type = 'operator' AND deleted_at IS NULL AND is_public = false
      ) t
      WHERE count::int > 0
      ORDER BY count::int DESC
    `);

    if (rows.length === 0) {
      return { response: 'Всё автоматизировано. Срочных задач нет.' };
    }

    const lines: string[] = [
      `<b>Возможности для автоматизации: ${rows.length} категории</b>`,
      '',
    ];

    for (const r of rows) {
      lines.push(`<b>${r.category}</b>: ${r.count}`);
      lines.push(`  → ${r.suggestion}`);
      lines.push('');
    }

    const total = rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
    lines.push(`Всего задач: ${total}`);

    return { response: lines.join('\n'), data: { opportunities: rows } };
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
