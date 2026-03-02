import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/tours/[id] -- poluchenie tura po ID
// Public by design: tour detail page for discovery.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // SELECT * dlya sovmestimosti s obema skhemami (camelCase / snake_case)
    const result = await query(`SELECT * FROM tours WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден',
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];

    let images: string[] = [];
    const rawImages = row.images;
    if (rawImages) {
      try {
        images = typeof rawImages === 'string' ? JSON.parse(rawImages) : (Array.isArray(rawImages) ? rawImages : []);
      } catch {
        images = [];
      }
    }

    // Mapping: podderzhka obeih skhem (production camelCase + dev snake_case)
    const tour = {
      id: row.id,
      name: row.title || row.name || '',
      title: row.title || row.name || '',
      description: row.fullDescription || row.description || '',
      shortDescription: row.description || row.short_description || '',
      category: row.category || '',
      difficulty: row.difficulty || 'medium',
      duration: row.minDuration || row.duration || 0,
      price: parseFloat(row.pricePerDay || row.price || 0),
      priceOriginal: parseFloat(row.priceOriginal || row.pricePerDay || row.price || 0),
      currency: row.currency || 'RUB',
      season: row.season || [],
      coordinates: row.coordinates || [],
      requirements: row.requirements || [],
      included: row.included || [],
      notIncluded: row.notIncluded || row.not_included || [],
      maxGroupSize: row.maxGroupSize || row.max_group_size || 20,
      minGroupSize: row.minGroupSize || row.min_group_size || 1,
      rating: parseFloat(row.rating) || 0,
      reviewCount: row.review_count || row.reviewCount || 0,
      isActive: row.is_active ?? true,
      images,
      slug: row.slug || row.id,
      locationName: row.locationName || row.location_name || '',
      partnerId: row.partnerId || row.partner_id || null,
      createdAt: new Date(row.createdAt || row.created_at || Date.now()),
      updatedAt: new Date(row.updatedAt || row.updated_at || Date.now()),
    };

    return NextResponse.json({
      success: true,
      data: tour,
    } as ApiResponse<typeof tour>);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TOUR_DETAIL_GET]', msg);
    return NextResponse.json({
      success: false,
      error: 'Не удалось загрузить тур',
    } as ApiResponse<null>, { status: 500 });
  }
}
