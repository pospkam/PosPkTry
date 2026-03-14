import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BulkSchema = z.object({
  ids:       z.array(z.string().uuid()).min(1).max(200),
  isVisible: z.boolean(),
});

/**
 * POST /api/admin/content/routes/bulk
 * Массовое переключение видимости маршрутов.
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json();
    const parsed = BulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные: нужен массив ids и isVisible' },
        { status: 400 }
      );
    }

    const result = await query<{ count: string }>(
      `UPDATE agent_route_knowledge
       SET is_visible = $1, updated_at = NOW()
       WHERE id = ANY($2::uuid[])
       RETURNING id`,
      [parsed.data.isVisible, parsed.data.ids]
    );

    return NextResponse.json({
      success: true,
      data: { updated: result.rows.length },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления маршрутов' },
      { status: 500 }
    );
  }
}
