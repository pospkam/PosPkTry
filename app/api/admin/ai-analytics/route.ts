/**
 * GET /api/admin/ai-analytics
 * Аналитика Кузьмича по всем каналам: Telegram, Max, Сайт.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const [
      tgStats,
      tgTrend,
      tgRatings,
      webStats,
      webTrend,
      memoryStats,
      actionsStats,
      topActivities,
    ] = await Promise.all([

      // ── Telegram + Max статистика ────────────────────────────────────────────
      pool.query<{
        platform: string;
        unique_chats: string;
        total_msgs: string;
        user_msgs: string;
        last_msg: string;
      }>(`
        SELECT
          platform,
          COUNT(DISTINCT chat_id)::text                  AS unique_chats,
          COUNT(*)::text                                 AS total_msgs,
          COUNT(*) FILTER (WHERE role = 'user')::text    AS user_msgs,
          MAX(created_at)::text                          AS last_msg
        FROM tg_conversations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY platform
      `),

      // ── Тренд Telegram+Max за 14 дней ────────────────────────────────────────
      pool.query<{ day: string; platform: string; chats: string; msgs: string }>(`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'DD.MM') AS day,
          platform,
          COUNT(DISTINCT chat_id)::text                   AS chats,
          COUNT(*) FILTER (WHERE role = 'user')::text     AS msgs
        FROM tg_conversations
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE_TRUNC('day', created_at), platform
        ORDER BY DATE_TRUNC('day', created_at)
      `),

      // ── Рейтинги (👍/👎) ──────────────────────────────────────────────────────
      pool.query<{ rating: string; cnt: string }>(`
        SELECT rating::text, COUNT(*)::text AS cnt
        FROM tg_ratings
        GROUP BY rating
      `).catch(() => ({ rows: [] as { rating: string; cnt: string }[] })),

      // ── Сайт: статистика chat_sessions ───────────────────────────────────────
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

      // ── Тренд сайта за 14 дней ───────────────────────────────────────────────
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

      // ── Память пользователей ─────────────────────────────────────────────────
      pool.query<{
        total_with_memory: string; with_notes: string; avg_sessions: string;
      }>(`
        SELECT
          COUNT(*)                                          AS total_with_memory,
          COUNT(*) FILTER (WHERE ai_notes IS NOT NULL
            AND ai_notes != '')                             AS with_notes,
          ROUND(AVG(sessions_count), 1)                    AS avg_sessions
        FROM user_ai_memory
      `),

      // ── События AI за 30 дней ────────────────────────────────────────────────
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

      // ── Топ активностей из памяти ─────────────────────────────────────────────
      pool.query<{ activity: string; cnt: string }>(`
        SELECT UNNEST(preferred_activities) AS activity, COUNT(*) AS cnt
        FROM user_ai_memory
        WHERE preferred_activities IS NOT NULL
        GROUP BY activity
        ORDER BY cnt DESC
        LIMIT 8
      `),
    ]);

    // UTM (опционально, migration 136)
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

    // ── Build channel map ─────────────────────────────────────────────────────
    interface ChannelStats {
      uniqueChats: number;
      totalMsgs: number;
      userMsgs: number;
      lastMsg: string | null;
    }
    const channels: Record<string, ChannelStats> = {
      telegram: { uniqueChats: 0, totalMsgs: 0, userMsgs: 0, lastMsg: null },
      max:      { uniqueChats: 0, totalMsgs: 0, userMsgs: 0, lastMsg: null },
    };
    for (const row of tgStats.rows) {
      const key = row.platform === 'max' ? 'max' : 'telegram';
      channels[key] = {
        uniqueChats: parseInt(row.unique_chats, 10),
        totalMsgs:   parseInt(row.total_msgs, 10),
        userMsgs:    parseInt(row.user_msgs, 10),
        lastMsg:     row.last_msg,
      };
    }

    // ── Ratings breakdown ─────────────────────────────────────────────────────
    let thumbsUp = 0;
    let thumbsDown = 0;
    for (const r of tgRatings.rows) {
      const n = parseInt(r.rating, 10);
      const cnt = parseInt(r.cnt, 10);
      if (n >= 4) thumbsUp += cnt;
      else thumbsDown += cnt;
    }

    // ── Web sessions ──────────────────────────────────────────────────────────
    const s = webStats.rows[0] ?? {};
    const m = memoryStats.rows[0] ?? {};

    const actionsMap: Record<string, number> = {};
    for (const row of actionsStats.rows) {
      actionsMap[row.action_type] = parseInt(row.cnt, 10);
    }

    return NextResponse.json({
      channels,
      tgTrend: tgTrend.rows.map(r => ({
        day:      r.day,
        platform: r.platform,
        chats:    parseInt(r.chats, 10),
        msgs:     parseInt(r.msgs, 10),
      })),
      ratings: { thumbsUp, thumbsDown },
      sessions: {
        total:         parseInt(s.total ?? '0', 10),
        authenticated: parseInt(s.authenticated ?? '0', 10),
        guests:        parseInt(s.guests ?? '0', 10),
        avgMessages:   parseFloat(s.avg_messages ?? '0'),
        totalMessages: parseInt(s.total_messages ?? '0', 10),
      },
      webTrend: webTrend.rows.map(r => ({
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
