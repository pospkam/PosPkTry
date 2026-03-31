import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

async function notifyArtemWish(message: string, category: string, priority: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const PRIORITY_EMOJI: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };
  const CATEGORY_LABEL: Record<string, string> = {
    bug: 'Баг', feature: 'Предложение', safety: 'Безопасность', general: 'Общее',
  };
  const text = [
    `<b>МЧС / Артём — новая рекомендация</b>`,
    ``,
    `${PRIORITY_EMOJI[priority] ?? '⚪'} <b>${CATEGORY_LABEL[category] ?? category}</b>`,
    `${message.slice(0, 400)}${message.length > 400 ? '...' : ''}`,
    ``,
    `<a href="https://tourhab.ru/hub/admin/safety">Открыть дашборд</a>`,
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch { /* silent fail */ }
}

export const dynamic = 'force-dynamic';

const WishSchema = z.object({
  stakeholder: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  category: z.enum(['feature', 'bug', 'safety', 'general']).default('general'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const ReplySchema = z.object({
  wish_id: z.number(),
  admin_reply: z.string().max(2000).optional(),
  status: z.enum(['new', 'reviewed', 'in_progress', 'done', 'rejected']),
});

/**
 * GET /api/safety/wishes?stakeholder=artem
 * Список пожеланий стейкхолдера
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const stakeholder = new URL(req.url).searchParams.get('stakeholder') || 'artem';

  const { rows } = await pool.query(
    `SELECT id, stakeholder, message, category, priority, status, admin_reply, created_at, updated_at
     FROM stakeholder_wishes
     WHERE stakeholder = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [stakeholder]
  );

  return NextResponse.json({ success: true, wishes: rows });
}

/**
 * POST /api/safety/wishes
 * Добавить пожелание
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = WishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { stakeholder, message, category, priority } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO stakeholder_wishes (stakeholder, message, category, priority, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [stakeholder, message, category, priority, authResult.userId]
  );

  // Уведомить владельца платформы
  void notifyArtemWish(message, category, priority);

  return NextResponse.json({ success: true, wish: rows[0] });
}

/**
 * PUT /api/safety/wishes
 * Обновить статус / ответ на пожелание
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { wish_id, admin_reply, status } = parsed.data;

  await pool.query(
    `UPDATE stakeholder_wishes
     SET status = $2, admin_reply = COALESCE($3, admin_reply), updated_at = NOW()
     WHERE id = $1`,
    [wish_id, status, admin_reply ?? null]
  );

  return NextResponse.json({ success: true });
}
