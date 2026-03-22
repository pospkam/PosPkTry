import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getAdminAlerts } from '@/lib/admin/alerts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/alerts
 * Anomaly-based alerts for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const alerts = await getAdminAlerts();
    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки алертов' },
      { status: 500 }
    );
  }
}
