/**
 * GET /api/admin/ai-analytics
 * Аналитика по AI-чату Кузьмич: сессии, память, воронка, провайдеры.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const [sessionsStats, sessionsTrend, memoryStats, actionsStats, topActivities] =
      await Promise.all([

        // --- Общая статистика сессий ---
        pool.query<{
          total: string; authenticated: string; guests: string;
          avg_messages: string; total_messages: string;
        }>(`
          SELECT
            COUNT(*)                                              AS total,
            COUNT(*) FILTER (WHERE is_authenticated = true)      AS authenticated,
            COUNT(*) FILTER (WHERE is_authenticated = false)      AS guests,
            ROUND(AVG(user_message_count), 1)                    AS avg_messages,
            SUM(user_message_count)                              AS total_messages
          FROM chat_sessions
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `),

        // --- Тренд сессий за 14 дней ---
        pool.query<{ day: string; total: string; auth: string }>(`
          SELECT
            TO_CHAR(DATE_TRUNC('day', created_at), 'DD.MM') AS day,
            COUNT(*)                                         AS total,
            COUNT(*) FILTER (WHERE is_authenticated = true) AS auth
          FROM chat_sessions
          WHERE created_at >= NOW() - INTERVAL '14 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY DATE_TRUNC('day', created_at)
        `),

        // --- Статистика памяти пользователей ---
        pool.query<{
          total_with_memory: string; with_notes: string;
          avg_sessions: string; top_activities: string;
        }>(`
          SELECT
            COUNT(*)                                         AS total_with_memory,
            COUNT(*) FILTER (WHERE ai_notes IS NOT NULL
              AND ai_notes != '')                            AS with_notes,
            ROUND(AVG(sessions_count), 1)                   AS avg_sessions,
            (
              SELECT STRING_AGG(act, ', ' ORDER BY cnt DESC)
              FROM (
                SELECT UNNEST(preferred_activities) AS act, COUNT(*) AS cnt
                FROM user_ai_memory
                WHERE preferred_activities IS NOT NULL
                GROUP BY act
                ORDER BY cnt DESC
                LIMIT 5
              ) top
            )                                               AS top_activities
          FROM user_ai_memory
        `),

        // --- Действия аналитики (последние 30 дней) ---
        pool.query<{ action_type: string; cnt: string }>(`
          SELECT action_type, COUNT(*) AS cnt
          FROM ai_actions_log
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND action_type IN (
              'payment_confirmed', 'booking_created', 'tour_recommended',
              'vision_analysis', 'memory_synth', 'lead_qualified',
              'chat_limit_reached'
            )
          GROUP BY action_type
          ORDER BY cnt DESC
        `),

        // --- Топ активностей из памяти ---
        pool.query<{ activity: string; cnt: string }>(`
          SELECT UNNEST(preferred_activities) AS activity, COUNT(*) AS cnt
          FROM user_ai_memory
          WHERE preferred_activities IS NOT NULL
          GROUP BY activity
          ORDER BY cnt DESC
          LIMIT 8
        `),
      ]);

    // UTM breakdown (опционально — колонки появятся после migration 136)
    const utmSources: Array<{ source: string; cnt: number }> = [];
    try {
      const { rows } = await pool.query<{ source: string; cnt: string }>(`
        SELECT utm_source AS source, COUNT(*) AS cnt
        FROM chat_sessions
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND utm_source IS NOT NULL
        GROUP BY utm_source
        ORDER BY cnt DESC
        LIMIT 8
      `);
      utmSources.push(...rows.map(r => ({ source: r.source, cnt: parseInt(r.cnt, 10) })));
    } catch { /* migration 136 not applied yet */ }

    const s = sessionsStats.rows[0] ?? {};
    const m = memoryStats.rows[0] ?? {};

    // Мапим ai_actions_log в enum
    const actionsMap: Record<string, number> = {};
    for (const row of actionsStats.rows) {
      actionsMap[row.action_type] = parseInt(row.cnt, 10);
    }

    return NextResponse.json({
      sessions: {
        total:         parseInt(s.total ?? '0', 10),
        authenticated: parseInt(s.authenticated ?? '0', 10),
        guests:        parseInt(s.guests ?? '0', 10),
        avgMessages:   parseFloat(s.avg_messages ?? '0'),
        totalMessages: parseInt(s.total_messages ?? '0', 10),
      },
      trend: sessionsTrend.rows.map(r => ({
        day:  r.day,
        total: parseInt(r.total, 10),
        auth:  parseInt(r.auth, 10),
      })),
      memory: {
        totalWithMemory: parseInt(m.total_with_memory ?? '0', 10),
        withNotes:       parseInt(m.with_notes ?? '0', 10),
        avgSessions:     parseFloat(m.avg_sessions ?? '0'),
      },
      actions: actionsMap,
      topActivities: topActivities.rows.map(r => ({
        activity: r.activity,
        cnt: parseInt(r.cnt, 10),
      })),
      utmSources,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
