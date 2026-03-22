import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile, getTouristTravelStats } from '@/lib/auth/tourist-helpers';

const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Имя не может быть пустым').optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  avatar_url: z.string().optional(),
  languages: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  fitness_level: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  experience_level: z.string().optional(),
  preferred_group_size: z.string().optional(),
  budget_range: z.string().optional(),
  preferred_seasons: z.array(z.string()).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  home_address: z.string().optional(),
  home_city: z.string().optional(),
  home_country: z.string().optional(),
  home_postal_code: z.string().optional(),
  travel_insurance_provider: z.string().optional(),
  travel_insurance_policy: z.string().optional(),
  travel_insurance_expiry: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

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
    } as ApiResponse<unknown>);
  } catch (error) {
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

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const validatedBody = parsed.data;

    const updates: string[] = [];
    const values: unknown[] = [];
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
      const value = validatedBody[field as keyof typeof validatedBody];
      if (value !== undefined) {
        const dbField = field;
        
        if (['languages', 'interests', 'dietary_restrictions', 'preferred_seasons'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::text[]`);
          values.push(value);
        } else if (['preferences', 'settings'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(value);
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
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
