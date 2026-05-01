/**
 * POST /api/admin/intelligence-feed/[id]/action
 *
 * Body: { action: 'toggle_done' | 'archive' | 'unarchive' | 'send_to_kiloclaw', itemIdx?: number }
 *
 * Мутирует value в agent_memory:
 *   - toggle_done: переключает action_items[itemIdx].done
 *   - archive / unarchive: меняет memory_tier (3 = cold/archived, 2 = warm/active) и value.archived
 *   - send_to_kiloclaw: отправляет action-item в Telegram боту KiloClaw и ставит sent_to_kiloclaw=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

type Action = 'toggle_done' | 'archive' | 'unarchive' | 'send_to_kiloclaw';

interface Body {
  action: Action;
  itemIdx?: number;
}

async function sendToKiloClaw(opts: {
  memoryKey: string;
  domain: string | null;
  urgency: string;
  itemText: string;
  priority: string;
  summary: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured' };
  }

  const urgencyEmoji: Record<string, string> = {
    critical: '🔥',
    high: '⚠️',
    medium: '📌',
    low: '📝',
  };
  const prio = opts.priority.toLowerCase();
  const prioLabel = prio === 'высокий' || prio === 'high' ? '🔴 высокий'
    : prio === 'средний' || prio === 'medium' ? '🟡 средний'
    : prio === 'низкий' || prio === 'low' ? '🟢 низкий'
    : prio;

  const text = [
    `🤖 Задача из разведки`,
    `${urgencyEmoji[opts.urgency] ?? '📌'} ${opts.domain ?? 'intel'} · ${opts.urgency}`,
    '',
    `**${opts.itemText}**`,
    `Приоритет: ${prioLabel}`,
    '',
    opts.summary ? `Контекст: ${opts.summary}` : '',
    '',
    `#kiloclaw #intel-todo`,
    `ref: ${opts.memoryKey}`,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, error: `Telegram ${res.status}: ${json.description ?? 'unknown'}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(request);
  if (authErr instanceof NextResponse) return authErr;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Body;
  const action = body.action;

  if (!action) {
    return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
  }

  try {
    // Load current value
    const { rows: current } = await pool.query<{ value: Record<string, unknown>; key: string }>(
      `SELECT value, key FROM agent_memory WHERE id = $1 AND memory_type = 'intelligence' LIMIT 1`,
      [id],
    );
    if (current.length === 0) {
      return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    }
    const row = current[0];
    const value = { ...(row.value as Record<string, unknown>) };
    const memoryKey = row.key;

    if (action === 'archive' || action === 'unarchive') {
      value.archived = action === 'archive';
      const newTier = action === 'archive' ? 3 : 2;
      await pool.query(
        `UPDATE agent_memory SET value = $1, memory_tier = $2, updated_at = NOW() WHERE id = $3`,
        [JSON.stringify(value), newTier, id],
      );
      return NextResponse.json({ success: true, archived: value.archived });
    }

    if (action === 'toggle_done') {
      const idx = body.itemIdx;
      if (typeof idx !== 'number') {
        return NextResponse.json({ success: false, error: 'itemIdx is required' }, { status: 400 });
      }
      const rawItems = Array.isArray(value.action_items) ? value.action_items as unknown[] : [];
      // Normalize string items to object form in-place
      const itemsObj: Record<string, unknown>[] = rawItems.map(a => {
        if (typeof a === 'string') {
          const m = a.match(/^\s*\[([^\]]+)\]\s*[—–-]\s*(.+)$/);
          return m
            ? { text: m[2].trim(), priority: m[1].trim(), done: false }
            : { text: a.trim(), priority: 'medium', done: false };
        }
        return { ...(a as Record<string, unknown>) };
      });
      if (idx < 0 || idx >= itemsObj.length) {
        return NextResponse.json({ success: false, error: 'itemIdx out of range' }, { status: 400 });
      }
      const cur = itemsObj[idx];
      cur.done = !cur.done;
      if (cur.done) cur.completed_at = new Date().toISOString();
      else delete cur.completed_at;
      value.action_items = itemsObj;
      await pool.query(
        `UPDATE agent_memory SET value = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(value), id],
      );
      return NextResponse.json({ success: true, done: itemsObj[idx].done });
    }

    if (action === 'send_to_kiloclaw') {
      const idx = body.itemIdx;
      if (typeof idx !== 'number') {
        return NextResponse.json({ success: false, error: 'itemIdx is required' }, { status: 400 });
      }
      const rawItems = Array.isArray(value.action_items) ? value.action_items as unknown[] : [];
      const itemsObj: Record<string, unknown>[] = rawItems.map(a => {
        if (typeof a === 'string') {
          const m = a.match(/^\s*\[([^\]]+)\]\s*[—–-]\s*(.+)$/);
          return m
            ? { text: m[2].trim(), priority: m[1].trim(), done: false, sent_to_kiloclaw: false }
            : { text: a.trim(), priority: 'medium', done: false, sent_to_kiloclaw: false };
        }
        return { ...(a as Record<string, unknown>) };
      });
      if (idx < 0 || idx >= itemsObj.length) {
        return NextResponse.json({ success: false, error: 'itemIdx out of range' }, { status: 400 });
      }
      const item = itemsObj[idx] as Record<string, unknown>;

      const sendRes = await sendToKiloClaw({
        memoryKey,
        domain: (value.domain as string) ?? null,
        urgency: (value.urgency as string) ?? (value.severity as string) ?? 'medium',
        itemText: (item.text as string) ?? '(empty)',
        priority: (item.priority as string) ?? 'medium',
        summary: (value.summary as string) ?? (value.title as string) ?? null,
      });

      if (!sendRes.ok) {
        return NextResponse.json({ success: false, error: sendRes.error }, { status: 500 });
      }

      itemsObj[idx] = { ...item, sent_to_kiloclaw: true, sent_at: new Date().toISOString() };
      value.action_items = itemsObj;
      await pool.query(
        `UPDATE agent_memory SET value = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(value), id],
      );
      return NextResponse.json({ success: true, sent: true });
    }

    return NextResponse.json({ success: false, error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[intelligence-feed/action] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'server error' }, { status: 500 });
  }
}
