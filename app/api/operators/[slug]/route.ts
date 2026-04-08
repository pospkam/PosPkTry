/**
 * GET /api/operators/[slug]
 * Полный публичный профиль оператора.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import type { OperatorProfileRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length > 100) {
    return NextResponse.json({ success: false, error: 'Неверный slug' }, { status: 400 });
  }

  try {
    const aliases = slug === 'fishingkam'
      ? ['fishingkam', 'kamchatskaya-rybalka']
      : slug === 'kamchatskaya-rybalka'
        ? ['kamchatskaya-rybalka', 'fishingkam']
        : [slug];

    const result = await query<OperatorProfileRow>(
      `SELECT id, slug, name, category, description, short_description,
              hero_image, gallery, services, features, faq, season_info,
              reviews_data, contacts, location, legal_info, contact,
              rating::text, review_count::text, is_verified, created_at::text
       FROM partners
       WHERE slug = ANY($1) AND is_public = TRUE
       ORDER BY CASE
         WHEN slug = $2 THEN 0
         WHEN slug = 'kamchatskaya-rybalka' THEN 1
         WHEN slug = 'fishingkam' THEN 2
         ELSE 3
       END
       LIMIT 1`,
      [aliases, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Оператор не найден' }, { status: 404 });
    }

    const r = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id:               r.id,
        slug:             r.slug,
        name:             r.name,
        category:         r.category,
        description:      r.description,
        shortDescription: r.short_description,
        heroImage:        r.hero_image,
        gallery:          r.gallery ?? [],
        services:         r.services ?? [],
        features:         r.features ?? [],
        faq:              r.faq ?? [],
        seasonInfo:       r.season_info ?? [],
        reviewsData:      r.reviews_data ?? [],
        contacts:         r.contacts ?? [],
        location:         r.location,
        legalInfo:        r.legal_info,
        contact:          r.contact,
        rating:           parseFloat(r.rating ?? '0'),
        reviewCount:      parseInt(r.review_count ?? '0'),
        isVerified:       r.is_verified,
        createdAt:        r.created_at,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки профиля', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
