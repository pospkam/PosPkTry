import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/partners/[id]/verify
 * Верификация партнёра
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;

    // Проверяем существование
    const checkQuery = 'SELECT id, is_verified FROM partners WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Partner not found'
      } as ApiResponse<null>, { status: 404 });
    }

    // Верифицируем
    const verifyQuery = `
      UPDATE partners
      SET is_verified = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, is_verified
    `;

    const result = await query(verifyQuery, [id]);
    const partner = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: partner.id,
        name: partner.name,
        isVerified: partner.is_verified
      },
      message: 'Partner verified successfully'
    });

  } catch (error) {
    console.error('Error verifying partner:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify partner',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



