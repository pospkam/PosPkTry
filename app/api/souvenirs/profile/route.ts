import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getSouvenirPartnerId, ensureSouvenirPartnerExists, getSouvenirStats } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/souvenirs/profile - Get souvenir partner profile with stats
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getSouvenirPartnerId(userOrResponse.id);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Профиль партнера не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const profileResult = await query(
      `SELECT 
        p.*,
        u.email,
        u.phone,
        u.full_name
       FROM partners p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [partnerId]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const stats = await getSouvenirStats(partnerId);

    return NextResponse.json({
      success: true,
      data: {
        profile: profileResult.rows[0],
        stats
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenir profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/souvenirs/profile - Update souvenir partner profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await ensureSouvenirPartnerExists(userOrResponse.id);

    const body = await request.json();
    const {
      companyName,
      description,
      address,
      phone,
      email,
      website,
      workingHours,
      socialMedia,
      bankDetails,
      legalInfo,
      shippingInfo,
      returnPolicy
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (companyName !== undefined) {
      updates.push(`company_name = $${paramIndex}`);
      values.push(companyName);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(address);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (website !== undefined) {
      updates.push(`website = $${paramIndex}`);
      values.push(website);
      paramIndex++;
    }

    if (workingHours !== undefined) {
      updates.push(`working_hours = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(workingHours));
      paramIndex++;
    }

    if (socialMedia !== undefined) {
      updates.push(`social_media = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(socialMedia));
      paramIndex++;
    }

    if (bankDetails !== undefined) {
      updates.push(`bank_details = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(bankDetails));
      paramIndex++;
    }

    if (legalInfo !== undefined) {
      updates.push(`legal_info = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(legalInfo));
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет полей для обновления' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    values.push(partnerId);

    const result = await query(
      `UPDATE partners SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error updating souvenir profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
