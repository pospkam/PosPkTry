import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getCarsPartnerId, ensureCarsPartnerExists, getCarsStats } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

const UpdateCarsProfileSchema = z.object({
  companyName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Некорректный email').optional(),
  website: z.string().optional(),
  workingHours: z.record(z.unknown()).optional(),
  socialMedia: z.record(z.unknown()).optional(),
  bankDetails: z.record(z.unknown()).optional(),
  legalInfo: z.record(z.unknown()).optional(),
});

/**
 * GET /api/cars/profile - Get cars partner profile with stats
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getCarsPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Профиль партнера не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Get profile data
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

    // Get statistics
    const stats = await getCarsStats(partnerId);

    return NextResponse.json({
      success: true,
      data: {
        profile: profileResult.rows[0],
        stats
      }
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error fetching cars profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cars/profile - Update cars partner profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await ensureCarsPartnerExists(userOrResponse.userId);

    const body = await request.json();
    const parsed = UpdateCarsProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

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
      legalInfo
    } = parsed.data;

    const updates: string[] = [];
    const values: unknown[] = [];
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
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error updating cars profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
