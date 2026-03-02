import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile, getTouristTravelStats } from '@/lib/auth/tourist-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/profile - Get tourist profile with stats
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const stats = await getTouristTravelStats(userOrResponse.userId);

    const achievementsResult = await query(
      `SELECT * FROM tourist_achievements WHERE tourist_id = $1 ORDER BY earned_at DESC`,
      [profile.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        profile,
        stats,
        achievements: achievementsResult.rows
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching tourist profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tourist/profile - Update tourist profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'full_name', 'date_of_birth', 'gender', 'nationality', 'phone',
      'avatar_url', 'bio', 'languages', 'interests',
      'fitness_level', 'dietary_restrictions', 'medical_conditions', 'allergies',
      'experience_level', 'preferred_group_size', 'budget_range', 'preferred_seasons',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'home_address', 'home_city', 'home_country', 'home_postal_code',
      'travel_insurance_provider', 'travel_insurance_policy', 'travel_insurance_expiry',
      'preferences', 'settings'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = field;
        
        if (['languages', 'interests', 'dietary_restrictions', 'preferred_seasons'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::text[]`);
          values.push(body[field]);
        } else if (['preferences', 'settings'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(body[field]));
        } else {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(body[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет полей для обновления' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    values.push(profile.id);

    const result = await query(
      `UPDATE tourist_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error updating tourist profile:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
