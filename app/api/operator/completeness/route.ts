/**
 * GET /api/operator/completeness
 * Check tour completeness: which required/recommended fields are missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface TourCompletion {
  tour_id: string;
  tour_title: string;
  is_published: boolean;
  required_score: number; // 0-100: title, description, price, activity_type, tour_image
  recommended_score: number; // 0-100: short_desc, season, difficulty, included, etc
  total_score: number; // weighted: 70% required, 30% recommended
  missing_required: string[];
  missing_recommended: string[];
}

export async function GET(request: NextRequest) {
  const userOrResponse = await requireOperator(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const userId = userOrResponse.userId;

  try {
    const partnerRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const partnerId = partnerRes.rows[0]?.id;
    if (!partnerId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { rows: tours } = await pool.query<any>(
      `SELECT
         id, title, description, short_description,
         base_price, max_participants, min_participants,
         location_type, activity_type, location_name,
         latitude, longitude, duration_hours, difficulty,
         season_start, season_end, duration_type,
         included, not_included, what_to_bring,
         tour_image, photos, price_old, price_unit,
         transportation, is_published
       FROM operator_tours
       WHERE operator_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [partnerId]
    );

    const completions: TourCompletion[] = tours.map(tour => {
      // REQUIRED fields (70% of total score)
      const required = {
        title: !!tour.title?.trim(),
        description: !!tour.description?.trim() && tour.description.length >= 20,
        base_price: tour.base_price && tour.base_price > 0,
        activity_type: !!tour.activity_type,
        tour_image: !!tour.tour_image || (tour.photos && Array.isArray(tour.photos) && tour.photos.length > 0),
      };

      const requiredFilled = Object.values(required).filter(Boolean).length;
      const requiredScore = (requiredFilled / Object.keys(required).length) * 100;

      const missingRequired = Object.entries(required)
        .filter(([, filled]) => !filled)
        .map(([field]) => field);

      // RECOMMENDED fields (30% of total score)
      const recommended = {
        short_description: !!tour.short_description?.trim(),
        season_dates: !!tour.season_start && !!tour.season_end,
        difficulty: !!tour.difficulty,
        included: tour.included && Array.isArray(tour.included) && tour.included.length > 0,
        not_included: tour.not_included && Array.isArray(tour.not_included) && tour.not_included.length > 0,
        what_to_bring: tour.what_to_bring && Array.isArray(tour.what_to_bring) && tour.what_to_bring.length > 0,
        location_name: !!tour.location_name?.trim(),
        coordinates: tour.latitude && tour.longitude,
        duration_hours: tour.duration_hours && tour.duration_hours > 0,
        price_unit: !!tour.price_unit,
        transportation: tour.transportation && Array.isArray(tour.transportation) && tour.transportation.length > 0,
      };

      const recommendedFilled = Object.values(recommended).filter(Boolean).length;
      const recommendedScore = (recommendedFilled / Object.keys(recommended).length) * 100;

      const missingRecommended = Object.entries(recommended)
        .filter(([, filled]) => !filled)
        .map(([field]) => field);

      // Weighted total (required 70%, recommended 30%)
      const totalScore = (requiredScore * 0.7 + recommendedScore * 0.3);

      return {
        tour_id: tour.id,
        tour_title: tour.title,
        is_published: tour.is_published,
        required_score: Math.round(requiredScore),
        recommended_score: Math.round(recommendedScore),
        total_score: Math.round(totalScore),
        missing_required: missingRequired,
        missing_recommended: missingRecommended,
      };
    });

    // Calculate operator-level stats
    const avgTotalScore = completions.length > 0
      ? Math.round(completions.reduce((sum, t) => sum + t.total_score, 0) / completions.length)
      : 0;

    const fullyComplete = completions.filter(t => t.total_score === 100).length;
    const criticallyIncomplete = completions.filter(t => t.required_score < 100).length;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalTours: completions.length,
          avgTotalScore,
          fullyComplete,
          criticallyIncomplete,
          publishedTours: completions.filter(t => t.is_published).length,
        },
        tours: completions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch completeness data' },
      { status: 500 }
    );
  }
}
