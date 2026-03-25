/**
 * MarketingAgency — AI-отдел маркетинга.
 *
 *   mkt_performance  — аналитика трафика: топ страниц, источники
 *   mkt_content_plan — AI-generated контент-план на ближайшую неделю
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface PageViewRow {
  path: string;
  views: string;
  trend: string;
}

interface TrafficSummaryRow {
  today: string;
  last_7d: string;
  last_30d: string;
  unique_paths: string;
}

interface TopSourceRow {
  referrer: string | null;
  visits: string;
}

export class MarketingAgency {
  private preferredModel: string | null = null;

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.preferredModel = context.preferredModel ?? null;
    switch (intent) {
      case 'mkt_performance':  return this.getPerformance();
      case 'mkt_content_plan': return this.getContentPlan(context);
      default:                 return { response: 'MarketingAgency: команда не поддерживается.' };
    }
  }

  private async getPerformance(): Promise<AgencyResult> {
    const [summary, topPages, topSources] = await Promise.all([
      pool.query<TrafficSummaryRow>(`
        SELECT
          COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::text         AS today,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text  AS last_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS last_30d,
          COUNT(DISTINCT path)::text                                              AS unique_paths
        FROM page_views
      `),
      pool.query<PageViewRow>(`
        SELECT
          path,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text  AS views,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 days')::text  AS trend
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY path
        ORDER BY views::int DESC
        LIMIT 10
      `),
      pool.query<TopSourceRow>(`
        SELECT
          CASE
            WHEN referrer IS NULL OR referrer = '' THEN 'Прямой'
            WHEN referrer ILIKE '%google%'         THEN 'Google'
            WHEN referrer ILIKE '%t.me%'           THEN 'Telegram'
            WHEN referrer ILIKE '%yandex%'         THEN 'Яндекс'
            ELSE split_part(referrer, '/', 3)
          END AS referrer,
          COUNT(*)::text AS visits
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY visits::int DESC
        LIMIT 5
      `),
    ]);

    const s = summary.rows[0];
    const lines: string[] = [
      '<b>Маркетинг — трафик</b>',
      '',
      `Сегодня: ${s.today} | 7 дней: ${s.last_7d} | 30 дней: ${s.last_30d}`,
      `Уникальных страниц: ${s.unique_paths}`,
    ];

    if (topPages.rows.length > 0) {
      lines.push('', 'Топ страниц (7 дней):');
      for (const p of topPages.rows) {
        lines.push(`• ${p.path}: ${p.views} просмотров`);
      }
    }

    if (topSources.rows.length > 0) {
      lines.push('', 'Источники:');
      for (const src of topSources.rows) {
        lines.push(`• ${src.referrer ?? 'Прямой'}: ${src.visits}`);
      }
    }

    return { response: lines.join('\n'), data: { summary: s, topPages: topPages.rows } };
  }

  private async getContentPlan(context: AgentContext): Promise<AgencyResult> {
    // Собираем данные о туристическом контексте
    const [toursCount, activeOps] = await Promise.all([
      pool.query<{ total: string; published: string }>(`
        SELECT
          COUNT(*)::text                                         AS total,
          COUNT(*) FILTER (WHERE is_published)::text            AS published
        FROM operator_tours WHERE deleted_at IS NULL AND is_active = true
      `),
      pool.query<{ names: string }>(`
        SELECT STRING_AGG(name, ', ' ORDER BY name) AS names
        FROM partners WHERE is_active = true
        LIMIT 5
      `),
    ]);

    const t = toursCount.rows[0];
    const ops = activeOps.rows[0]?.names ?? 'операторы Камчатки';
    const platform = context.platform;

    const prompt = `Ты маркетолог туристической платформы TourHub (Камчатка, Россия).
Данные платформы: ${t.published} опубликованных туров, операторы: ${ops}.
Сезон: ${'currentMonth' in platform && platform.currentMonth ? `месяц ${platform.currentMonth}` : 'весна-лето'}.
Придумай контент-план на следующие 7 дней для Telegram-канала платформы.
Каждый день — 1 идея поста (тип контента + тема + крючок).
Формат: "День N: [тип] — тема. Крючок."
Без эмодзи. Короко. Только 7 строк.`;

    let plan = 'Контент-план временно недоступен.';
    try {
      const { text: aiResult } = await callAIWithModel([{ role: 'user', content: prompt }], this.preferredModel);
      if (aiResult) plan = aiResult.trim();
    } catch { /* silent */ }

    return {
      response: `<b>Контент-план на 7 дней</b>\n\n${plan}`,
      data: { tours: t, operators: ops },
    };
  }
}
