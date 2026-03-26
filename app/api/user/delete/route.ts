/**
 * POST /api/user/delete
 *
 * GDPR / 152-ФЗ: запрос на удаление аккаунта.
 * Soft-delete: данные анонимизируются через 30 дней.
 * Auth: текущий пользователь.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

const Schema = z.object({
  reason: z.string().max(500).optional(),
  confirm: z.literal(true, { errorMap: () => ({ message: 'Требуется подтверждение: confirm: true' }) }),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.userId;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 422 }
    );
  }

  const deleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 дней

  // Помечаем аккаунт к удалению: scheduled_delete_at + причина в metadata
  await pool.query(
    `UPDATE users
     SET
       metadata = COALESCE(metadata, '{}') ||
         jsonb_build_object(
           'deletion_requested_at', NOW()::text,
           'deletion_scheduled_at', $1::text,
           'deletion_reason',       $2
         ),
       updated_at = NOW()
     WHERE id = $3`,
    [deleteAt.toISOString(), parse.data.reason ?? null, userId]
  );

  return NextResponse.json({
    success: true,
    message: 'Запрос принят. Аккаунт и все данные будут удалены через 30 дней.',
    scheduled_at: deleteAt.toISOString(),
  });
}
