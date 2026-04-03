/**
 * GET /api/admin/operators — очередь заявок операторов
 * Возвращает partners с profile_status + данные из operator_applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('pending'),
  limit:  z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const sp = request.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    status: sp.get('status') ?? 'pending',
    limit:  sp.get('limit')  ?? 50,
    offset: sp.get('offset') ?? 0,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });

  const { status, limit, offset } = parsed.data;
  const hasStatusFilter = status !== 'all';
  const params: (string | number)[] = hasStatusFilter ? [status, limit, offset] : [limit, offset];

  const rows = await query(`
    SELECT
      p.id,
      p.name            AS company_name,
      p.contacts->>'telegram_chat_id' AS telegram_chat_id,
      p.category,
      p.description,
      p.profile_status,
      p.applied_at,
      p.is_verified,
      p.is_public,
      p.profile_review_comment,
      u.email,
      u.name            AS contact_name,
      u.created_at      AS registered_at,
      oa.id             AS application_id,
      oa.contact_phone,
      oa.contact_email,
      oa.inn,
      oa.status         AS application_status,
      oa.review_comment AS application_review_comment,
      oa.reviewed_at,
      p.slug,
      p.widget_enabled,
      p.widget_domains
    FROM partners p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN operator_applications oa ON oa.partner_id = p.id
    WHERE u.role = 'operator'
      ${hasStatusFilter ? 'AND p.profile_status = $1' : ''}
    ORDER BY p.applied_at DESC NULLS LAST, p.created_at DESC
    LIMIT $${hasStatusFilter ? 2 : 1} OFFSET $${hasStatusFilter ? 3 : 2}
  `, params);

  const countRow = await query(`
    SELECT COUNT(*) AS total
    FROM partners p
    JOIN users u ON u.id = p.user_id
    WHERE u.role = 'operator'
      ${hasStatusFilter ? 'AND p.profile_status = $1' : ''}
  `, hasStatusFilter ? [status] : []);

  return NextResponse.json({
    success: true,
    data: rows.rows,
    meta: {
      total:  parseInt((countRow.rows[0]?.total as string) ?? '0', 10),
      limit,
      offset,
    },
  });
}
