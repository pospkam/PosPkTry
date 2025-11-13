import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { logger } from '@/lib/monitoring/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/monitoring/logs - Получение логов (только для админа)
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const level = searchParams.get('level');

    let logs = logger.getRecentLogs(limit);

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    return NextResponse.json({
      success: true,
      data: { logs, count: logs.length }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения логов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}