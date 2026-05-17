import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  place_ids: z.array(z.string().uuid()).optional(),
  route_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  is_public: z.boolean().optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Неверные данные' }, { status: 400 });
  }

  const data = parsed.data;
  const sets: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];

  const add = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

  if (data.title !== undefined) add('title', data.title);
  if (data.description !== undefined) add('description', data.description);
  if (data.cover_image !== undefined) add('cover_image', data.cover_image || null);
  if (data.place_ids !== undefined) add('place_ids', data.place_ids);
  if (data.route_ids !== undefined) add('route_ids', data.route_ids);
  if (data.tags !== undefined) add('tags', data.tags);
  if (data.is_public !== undefined) add('is_public', data.is_public);

  vals.push(id);
  const { rowCount } = await pool.query(
    `UPDATE collections SET ${sets.join(', ')} WHERE id = $${vals.length}`,
    vals
  );

  if (!rowCount) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 });
  }

  await pool.query('DELETE FROM collections WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
