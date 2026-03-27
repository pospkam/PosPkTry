/**
 * PATCH /api/admin/operators/[id]/widget
 * Update widget settings for a partner (enable/disable, allowed domains, config).
 *
 * GET /api/admin/operators/[id]/widget
 * Return current widget settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  widget_enabled: z.boolean().optional(),
  widget_domains: z.array(z.string().max(200)).max(20).optional(),
  widget_config:  z.object({
    greeting:    z.string().max(300).optional(),
    accentColor: z.string().max(20).optional(),
    buttonText:  z.string().max(50).optional(),
    position:    z.enum(['left', 'right']).optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT slug, widget_enabled, widget_domains, widget_config
     FROM partners WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 404 });
  }

  const row = rows[0] as {
    slug: string | null;
    widget_enabled: boolean;
    widget_domains: string[];
    widget_config: Record<string, string> | null;
  };

  return NextResponse.json({ success: true, data: row });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 400 }
    );
  }

  const { widget_enabled, widget_domains, widget_config } = parsed.data;

  const sets: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];

  if (widget_enabled !== undefined) {
    vals.push(widget_enabled);
    sets.push(`widget_enabled = $${vals.length}`);
  }
  if (widget_domains !== undefined) {
    vals.push(widget_domains);
    sets.push(`widget_domains = $${vals.length}`);
  }
  if (widget_config !== undefined) {
    vals.push(JSON.stringify(widget_config));
    sets.push(`widget_config = $${vals.length}::jsonb`);
  }

  if (sets.length === 1) {
    return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 });
  }

  vals.push(id);
  await pool.query(
    `UPDATE partners SET ${sets.join(', ')} WHERE id = $${vals.length}`,
    vals
  );

  return NextResponse.json({ success: true });
}
