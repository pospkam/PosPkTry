/**
 * GET /api/admin/ai-analytics/chats
 * Список чатов Кузьмича с именами пользователей.
 * GET /api/admin/ai-analytics/chats?chat_id=X&platform=telegram — сообщения конкретного чата
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const chatId   = searchParams.get('chat_id');
    const platform = searchParams.get('platform');
    const days     = parseInt(searchParams.get('days') ?? '30', 10);

    // ── Конкретный чат: история сообщений ────────────────────────────────────
    if (chatId) {
      // Веб-чат: сообщения хранятся в JSON массиве в chat_sessions
      if (!platform || platform === 'web') {
        const { rows } = await pool.query<{
          messages: unknown;
          updated_at: string;
        }>(`
          SELECT messages, updated_at::text
          FROM chat_sessions
          WHERE session_id = $1
          LIMIT 1
        `, [chatId]);

        if (rows.length === 0) {
          return NextResponse.json({ messages: [] });
        }

        // messages — JSON массив [{role, content, created_at}, ...]
        const raw = rows[0].messages;
        let msgs: Array<{ role: string; content: string; created_at: string }> = [];
        if (Array.isArray(raw)) {
          msgs = raw.map((m: any) => ({
            role: m.role ?? 'user',
            content: m.content ?? '',
            created_at: m.created_at ?? rows[0].updated_at,
          }));
        }
        return NextResponse.json({ messages: msgs });
      }

      // Telegram / Max: сообщения в tg_conversations
      const { rows } = await pool.query<{
        role: string;
        content: string;
        created_at: string;
      }>(`
        SELECT role, content, created_at::text
        FROM tg_conversations
        WHERE chat_id = $1
          AND platform = $2
        ORDER BY created_at ASC
        LIMIT 200
      `, [chatId, platform]);

      return NextResponse.json({ messages: rows });
    }

    // ── Список чатов Telegram + Max ───────────────────────────────────────────
    const { rows: tgChats } = await pool.query<{
      chat_id: string;
      platform: string;
      user_name: string | null;
      user_msgs: string;
      total_msgs: string;
      first_msg: string;
      last_msg: string;
    }>(`
      SELECT
        chat_id::text,
        platform,
        MAX(user_name)                                      AS user_name,
        COUNT(*) FILTER (WHERE role = 'user')::text         AS user_msgs,
        COUNT(*)::text                                      AS total_msgs,
        MIN(created_at)::text                               AS first_msg,
        MAX(created_at)::text                               AS last_msg
      FROM tg_conversations
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY chat_id, platform
      ORDER BY MAX(created_at) DESC
      LIMIT 100
    `, [days]);

    // ── Список веб-сессий ────────────────────────────────────────────────────
    const { rows: webChats } = await pool.query<{
      session_id: string;
      user_id: string | null;
      user_message_count: string;
      is_authenticated: boolean;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT
        session_id,
        user_id::text,
        user_message_count::text,
        is_authenticated,
        created_at::text,
        updated_at::text
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      ORDER BY updated_at DESC
      LIMIT 100
    `, [days]);

    return NextResponse.json({
      tgChats: tgChats.map(r => ({
        chatId:    r.chat_id,
        platform:  r.platform,
        userName:  r.user_name ?? '—',
        userMsgs:  parseInt(r.user_msgs, 10),
        totalMsgs: parseInt(r.total_msgs, 10),
        firstMsg:  r.first_msg,
        lastMsg:   r.last_msg,
      })),
      webChats: webChats.map(r => ({
        sessionId:     r.session_id,
        userId:        r.user_id,
        userMsgs:      parseInt(r.user_message_count, 10),
        authenticated: r.is_authenticated,
        createdAt:     r.created_at,
        updatedAt:     r.updated_at,
      })),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
