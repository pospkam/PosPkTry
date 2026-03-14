import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateRouteSchema = z.object({
  isVisible: z.boolean(),
});

/**
 * PUT /api/admin/content/routes/[id]
 * Переключение видимости маршрута (is_visible).
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await context.params;

    const body = await request.json();
    const parsed = UpdateRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные' },
        { status: 400 }
      );
    }

    const result = await query<{ id: string; title: string; is_visible: boolean }>(
      `UPDATE agent_route_knowledge
       SET is_visible = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, is_visible`,
      [parsed.data.isVisible, id]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Маршрут не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления маршрута' },
      { status: 500 }
    );
  }
}
