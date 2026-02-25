import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile } from '@/lib/auth/tourist-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/achievements - Get tourist achievements
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

    const result = await query(
      `SELECT * FROM tourist_achievements WHERE tourist_id = $1 ORDER BY earned_at DESC`,
      [profile.id]
    );

    const categorized = {
      trips: result.rows.filter(a => a.achievement_type.startsWith('trips_') || a.achievement_type === 'first_trip'),
      exploration: result.rows.filter(a => ['volcanoes_visited', 'bears_seen', 'hot_springs_visited'].includes(a.achievement_type)),
      seasonal: result.rows.filter(a => ['winter_explorer', 'summer_adventurer'].includes(a.achievement_type)),
      community: result.rows.filter(a => ['photographer', 'reviewer', 'group_leader'].includes(a.achievement_type)),
      style: result.rows.filter(a => ['early_bird', 'big_spender', 'budget_traveler', 'solo_traveler', 'family_oriented', 'extreme_seeker', 'cultural_enthusiast'].includes(a.achievement_type))
    };

    return NextResponse.json({
      success: true,
      data: {
        all: result.rows,
        categorized,
        total_points: profile.loyalty_points,
        current_tier: profile.loyalty_tier
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении достижений' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
