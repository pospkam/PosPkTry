import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';

/**
 * GET /api/safety/alerts
 * Returns active alerts — admin only
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const alerts = await query(`
      SELECT
        ea.id,
        ea.alert_type,
        ea.severity,
        ea.title,
        ea.description,
        ea.affected_zones,
        ea.affected_locations,
        ea.created_at,
        ea.expires_at,
        array_length(ea.affected_locations, 1) as affected_route_count
      FROM external_alerts ea
      WHERE ea.expires_at > NOW()
      ORDER BY ea.severity DESC, ea.created_at DESC
      LIMIT 100
    `);

    const rows = alerts.rows as Array<{severity: number}>;
    const criticalCount = rows.filter((r) => r.severity >= 2).length;

    return Response.json({
      success: true,
      data: rows,
      meta: {
        total: rows.length,
        active_critical: criticalCount,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
