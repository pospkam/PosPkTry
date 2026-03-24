/**
 * AdminAgency — агент для администратора платформы.
 *
 * Возможности:
 *   admin_digest — ежедневный дайджест: лиды, брони, туры без слотов, просмотры
 *   admin_leads  — сводка по лидам за 7 дней
 *   admin_health — состояние AI: успешность, паттерны, обратная связь
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import { PatternRecognition } from '../learning/pattern-recognition';
import { FeedbackLoop } from '../learning/feedback-loop';
import { ObservationLogger } from '../observation-logger';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

// ── Типы строк БД ─────────────────────────────────────────────────────────────────

interface LeadsStats {
  total: number;
  new_count: number;
  contacted: number;
  converted: number;
  last_7d: number;
}

interface BookingsStats {
  today: number;
  last_7d: number;
  revenue_7d: string | null;
}

interface TourRow {
  id: number;
  title: string;
}

interface WeatherAlertRow {
  id: string;
  message: string;
  severity: string;
  created_at: Date;
}

interface PageViewsStats {
  today: number;
  last_7d: number;
}

// ── AdminAgency ─────────────────────────────────────────────────────────────────────

export class AdminAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'admin_digest': return this.getDigest();
      case 'admin_leads':  return this.getLeadsSummary();
      case 'admin_health': return this.getHealth();
      default:             return { response: 'AdminAgency: команда не поддерживается.' };
    }
  }

  // ── /digest ──────────────────────────────────────────────────────────────────────

  async getDigest(): Promise<AgencyResult> {
    try {
      const [leads, bookings, emptyTours, weather, views] = await Promise.all([
        this.fetchLeadsStats().catch(() =>
          ({ total: 0, new_count: 0, contacted: 0, converted: 0, last_7d: 0 })
        ),
        this.fetchBookingsStats().catch(() =>
          ({ today: 0, last_7d: 0, revenue_7d: null })
        ),
        this.fetchToursWithoutSlots().catch(() => [] as TourRow[]),
        this.fetchWeatherAlerts().catch(() => [] as WeatherAlertRow[]),
        this.fetchPageViews().catch(() =>
          ({ today: 0, last_7d: 0 })
        ),
      ]);

      const data = { leads, bookings, emptyTours, weather, views };

      let sharedInsights = '';
      if (this.tools.recallSharedMemory) {
        try {
          const mem = await this.tools.recallSharedMemory('insight', 5);
          if (mem.success && mem.details?.entries) {
            const entries = mem.details.entries as Array<{ agent_id: string; key: string; value: Record<string, unknown> }>;
            sharedInsights = entries.map(e => `[${e.agent_id}] ${e.key}`).join(', ');
          }
        } catch { /* non-critical */ }
      }

      const prompt = buildDigestPrompt(data);
      const insightsAddendum = sharedInsights ? `\n\nИнсайты от других агентов: ${sharedInsights}` : '';
      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}${insightsAddendum}` : `${prompt}${insightsAddendum}`;
      const aiText = await callAIWaterfall([{ role: 'user', content: fullPrompt }]);

      const date = new Date().toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      const response = `<b>Дайджест TourHub — ${date}</b>\n\n${aiText ?? formatFallbackDigest(data)}`;

      // Send formatted digest notification via toolkit (non-blocking)
      if (this.tools.sendDigestNotification) {
        try {
          await this.tools.sendDigestNotification(response);
        } catch { /* tool failure is non-blocking */ }
      }

      return { response, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        response: `<b>Дайджест недоступен</b>\n\nОшибка: ${msg}\n\nДанные будут доступны после восстановления системы.`,
        data: {}
      };
    }
  }

  // ── /leads ─────────────────────────────────────────────────────────────────────

  async getLeadsSummary(): Promise<AgencyResult> {
    const stats = await this.fetchLeadsStats();
    const response = [
      '<b>Лиды (7 дней)</b>',
      `Всего: ${stats.last_7d}`,
      `Новых: ${stats.new_count} | Обработано: ${stats.contacted} | Конвертировано: ${stats.converted}`,
    ].join('\n');
    return { response, data: { leads: stats } };
  }

  // ── /health ────────────────────────────────────────────────────────────────────

  async getHealth(): Promise<AgencyResult> {
    const [patterns, feedback, successRate] = await Promise.all([
      new PatternRecognition().detectPatterns(24),
      new FeedbackLoop().getSummary(24),
      new ObservationLogger().getSuccessRate('platform-agent', 24),
    ]);

    const lines: string[] = ['<b>Состояние системы AI</b>', ''];

    const pct = Math.round(successRate * 100);
    lines.push(`Успешность 24ч: ${pct}%`);

    if (feedback.total_feedback > 0) {
      const sat = Math.round(feedback.overall_satisfaction * 100);
      lines.push(`Удовлетворённость: ${sat}% (${feedback.total_feedback} отзывов)`);
      if (feedback.worst_intent) {
        lines.push(`Проблемный интент: ${feedback.worst_intent}`);
      }
    }

    if (patterns.length > 0) {
      const criticals = patterns.filter(p => p.severity === 'critical');
      const warnings  = patterns.filter(p => p.severity === 'warning');
      lines.push('');
      lines.push('Паттерны:');
      for (const p of [...criticals, ...warnings].slice(0, 4)) {
        const tag = p.severity === 'critical' ? '[!]' : '[~]';
        lines.push(`${tag} ${p.description}`);
      }
    } else {
      lines.push('Нарушений паттернов не обнаружено.');
    }

    return {
      response: lines.join('\n'),
      data:     { patterns, feedback, successRate },
    };
  }

  // ── Запросы к БД ────────────────────────────────────────────────────────────────────

  private async fetchLeadsStats(): Promise<LeadsStats> {
    const { rows } = await pool.query<LeadsStats>(`
      SELECT
        COUNT(*)::int                                                           AS total,
        COUNT(*) FILTER (WHERE status = 'new')::int                            AS new_count,
        COUNT(*) FILTER (WHERE status = 'contacted')::int                      AS contacted,
        COUNT(*) FILTER (WHERE status = 'converted')::int                      AS converted,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int   AS last_7d
      FROM leads
    `);
    return rows[0] ?? { total: 0, new_count: 0, contacted: 0, converted: 0, last_7d: 0 };
  }

  private async fetchBookingsStats(): Promise<BookingsStats> {
    const { rows } = await pool.query<BookingsStats>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW()::date)::int                  AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int    AS last_7d,
        SUM(final_price) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS revenue_7d
      FROM operator_bookings
      WHERE booking_status NOT IN ('cancelled')
    `);
    return rows[0] ?? { today: 0, last_7d: 0, revenue_7d: null };
  }

  private async fetchToursWithoutSlots(): Promise<TourRow[]> {
    const nextMonthStart = new Date();
    nextMonthStart.setDate(1);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
    const dateStr = nextMonthStart.toISOString().slice(0, 10);

    const { rows } = await pool.query<TourRow>(`
      SELECT t.id, t.title
      FROM operator_tours t
      WHERE t.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM tour_availability a
          WHERE a.operator_tour_id = t.id
            AND a.date >= $1::date
            AND a.date < ($1::date + INTERVAL '1 month')
            AND a.is_available = TRUE
        )
      LIMIT 5
    `, [dateStr]);
    return rows;
  }

  private async fetchWeatherAlerts(): Promise<WeatherAlertRow[]> {
    const { rows } = await pool.query<WeatherAlertRow>(`
      SELECT
        id::text,
        COALESCE(alert_type, '') || CASE WHEN severity IS NOT NULL THEN ' / ' || severity ELSE '' END AS message,
        COALESCE(severity, 'low') AS severity,
        created_at
      FROM weather_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY severity DESC, created_at DESC
      LIMIT 3
    `);
    return rows;
  }

  private async fetchPageViews(): Promise<PageViewsStats> {
    const { rows } = await pool.query<PageViewsStats>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW()::date)::int                 AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int   AS last_7d
      FROM page_views
    `);
    return rows[0] ?? { today: 0, last_7d: 0 };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────

interface DigestData {
  leads: LeadsStats;
  bookings: BookingsStats;
  emptyTours: TourRow[];
  weather: WeatherAlertRow[];
  views: PageViewsStats;
}

function buildDigestPrompt(data: DigestData): string {
  return `Ты аналитик туристической платформы Камчатки TourHub. Составь краткий дайджест на русском.

Данные:
- Лиды за 7 дней: ${data.leads.last_7d} (новых: ${data.leads.new_count}, ждут ответа: ${data.leads.new_count}, конвертировано: ${data.leads.converted})
- Бронирования: сегодня ${data.bookings.today}, за неделю ${data.bookings.last_7d}${data.bookings.revenue_7d ? `, выручка ${data.bookings.revenue_7d} руб` : ''}
- Туры без слотов на следующий месяц (${data.emptyTours.length}): ${data.emptyTours.map(t => t.title).join(', ') || 'нет'}
- Погодные предупреждения сегодня: ${data.weather.length > 0 ? data.weather.map(w => w.message).join('; ') : 'нет'}
- Просмотры страниц: сегодня ${data.views.today}, за неделю ${data.views.last_7d}

Формат ответа (строго):
1. 3-4 строки с ключевыми метриками — кратко
2. Раздел "Рекомендации:" с 2-3 действиями пронумерованными
Без эмодзи. Без markdown-звёздочек. Максимум 200 слов.`;
}

function formatFallbackDigest(data: DigestData): string {
  const lines: string[] = [
    `Лиды (7 дней): ${data.leads.last_7d} | Новых: ${data.leads.new_count} | Конвертировано: ${data.leads.converted}`,
    `Бронирования: сегодня ${data.bookings.today} | неделя ${data.bookings.last_7d}`,
    `Просмотры: сегодня ${data.views.today} | неделя ${data.views.last_7d}`,
  ];
  if (data.emptyTours.length > 0) {
    lines.push(`Туры без слотов: ${data.emptyTours.map(t => t.title).join(', ')}`);
  }
  if (data.weather.length > 0) {
    lines.push(`Погодные предупреждения: ${data.weather.length}`);
  }
  return lines.join('\n');
}
