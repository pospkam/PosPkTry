import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  source: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
}

// GET /api/admin/audit-log — unified audit log from both tables + booking_logs
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;
  const type = searchParams.get('type'); // booking | audit | partner | all
  const search = searchParams.get('search')?.trim();

  try {
    // Union from all 3 audit sources
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    let typeFilter = '';
    if (type && type !== 'all') {
      typeFilter = ` WHERE source = $${paramIdx}`;
      params.push(type);
      paramIdx++;
    }

    let searchFilter = '';
    if (search) {
      searchFilter = typeFilter ? ' AND' : ' WHERE';
      searchFilter += ` (action ILIKE $${paramIdx} OR COALESCE(resource_type, entity_type, '') ILIKE $${paramIdx} OR COALESCE(user_email, '') ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = typeFilter + searchFilter;

    // Count total
    const countResult = await query<{ total: string }>(`
      SELECT COUNT(*) as total FROM (
        SELECT id FROM audit_logs
        UNION ALL
        SELECT id::text FROM audit_log
        UNION ALL
        SELECT id::text FROM booking_logs
      ) combined_count${conditions.length ? '' : ''}
    `, []);
    // Simplified count — for filtered count we use CTE

    const cte = `
      WITH unified AS (
        SELECT
          al.id::text as id,
          'audit' as source,
          al.action,
          al.resource_type,
          al.resource_id::text as resource_id,
          NULL as entity_type,
          NULL as entity_id,
          al.details,
          NULL::jsonb as data,
          al.ip_address::text,
          al.user_agent,
          al.created_at,
          al.user_id::text,
          u1.email as user_email,
          u1.name as user_name
        FROM audit_logs al
        LEFT JOIN users u1 ON al.user_id = u1.id

        UNION ALL

        SELECT
          alog.id::text as id,
          'partner' as source,
          alog.action,
          NULL as resource_type,
          NULL as resource_id,
          alog.entity_type,
          alog.entity_id::text as entity_id,
          NULL::jsonb as details,
          alog.data,
          alog.ip_address::text,
          alog.user_agent,
          alog.created_at,
          NULL as user_id,
          NULL as user_email,
          NULL as user_name
        FROM audit_log alog

        UNION ALL

        SELECT
          bl.id::text as id,
          'booking' as source,
          bl.from_status || ' → ' || bl.to_status as action,
          'booking' as resource_type,
          bl.booking_id::text as resource_id,
          NULL as entity_type,
          NULL as entity_id,
          jsonb_build_object('comment', bl.comment, 'from_status', bl.from_status, 'to_status', bl.to_status) as details,
          NULL::jsonb as data,
          NULL as ip_address,
          NULL as user_agent,
          bl.created_at,
          bl.changed_by::text as user_id,
          u2.email as user_email,
          u2.name as user_name
        FROM booking_logs bl
        LEFT JOIN users u2 ON bl.changed_by = u2.id
      )
    `;

    const countQ = await query<{ total: string }>(
      `${cte} SELECT COUNT(*) as total FROM unified${whereClause}`,
      params
    );
    const total = parseInt(countQ.rows[0]?.total ?? '0', 10);

    const dataParams = [...params, limit, offset];
    const rows = await query<AuditRow>(
      `${cte} SELECT * FROM unified${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      dataParams
    );

    return NextResponse.json({
      success: true,
      data: {
        items: rows.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: `Ошибка загрузки аудита: ${msg}` }, { status: 500 });
  }
}
