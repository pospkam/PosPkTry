/**
 * GET /api/hub/marketplace/tours
 * Public API: Get all available tours for marketplace
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  search:        z.string().max(200).optional(),
  activity_type: z.string().max(60).optional(),
  location_type: z.string().max(60).optional(),
  sort:          z.enum(['recommended', 'price_asc', 'price_desc', 'recent']).default('recommended'),
  difficulty:    z.enum(['easy', 'medium', 'hard']).optional(),
  duration_type: z.enum(['day', 'half_day', 'multi_day']).optional(),
  price_min:     z.coerce.number().min(0).optional(),
  price_max:     z.coerce.number().min(0).optional(),
  id:            z.coerce.number().int().optional(),
  limit:         z.coerce.number().int().min(1).max(100).default(50),
  offset:        z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      search, activity_type, location_type, sort,
      difficulty, duration_type, price_min, price_max,
      id, limit, offset,
    } = parsed.data;

    const selectFields = `
        ot.id,
        ot.title,
        ot.description,
        ot.short_description,
        ot.base_price,
        ot.price_old,
        ot.price_unit,
        ot.activity_type,
        ot.location_type,
        ot.location_name,
        ot.tour_image,
        ot.max_participants,
        ot.duration_hours,
        ot.duration_type,
        ot.multi_day_count,
        ot.difficulty,
        ot.included,
        ot.season_start,
        ot.season_end,
        p.name as operator_name,
        p.id as operator_id,
        COUNT(ob.id)::INT as bookings_count,
        EXISTS (
          SELECT 1 FROM tour_availability ta
          WHERE ta.operator_tour_id = ot.id
            AND ta.date >= CURRENT_DATE
            AND ta.deleted_at IS NULL
            AND (ta.available_slots - COALESCE(ta.booked_slots, 0)) > 0
        ) as has_availability`;

    const from = `
      FROM operator_tours ot
      JOIN partners p ON ot.operator_id = p.id
      LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id`;

    const conditions: string[] = [
      'ot.deleted_at IS NULL',
      'ot.is_active = true',
      'ot.is_published = true',
    ];
    const params: unknown[] = [];
    let idx = 1;

    if (id != null) {
      conditions.push(`ot.id = $${idx++}`);
      params.push(id);
    }
    if (activity_type) {
      conditions.push(`ot.activity_type = $${idx++}`);
      params.push(activity_type);
    }
    if (location_type) {
      conditions.push(`ot.location_type = $${idx++}`);
      params.push(location_type);
    }
    if (difficulty) {
      conditions.push(`ot.difficulty = $${idx++}`);
      params.push(difficulty);
    }
    if (duration_type) {
      conditions.push(`ot.duration_type = $${idx++}`);
      params.push(duration_type);
    }
    if (price_min != null) {
      conditions.push(`ot.base_price >= $${idx++}`);
      params.push(price_min);
    }
    if (price_max != null) {
      conditions.push(`ot.base_price <= $${idx++}`);
      params.push(price_max);
    }
    if (search) {
      conditions.push(`(ot.title ILIKE $${idx} OR ot.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const orderBy =
      sort === 'price_asc'  ? 'ot.base_price ASC, ot.title ASC' :
      sort === 'price_desc' ? 'ot.base_price DESC, ot.title ASC' :
      sort === 'recent'     ? 'ot.created_at DESC' :
      /* recommended */       'has_availability DESC, ot.created_at DESC';

    const dataQuery = `
      SELECT ${selectFields} ${from} ${where}
      GROUP BY ot.id, p.id
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}`;
    const dataParams = [...params, limit, offset];

    const countQuery = `
      SELECT COUNT(DISTINCT ot.id)::INT as total
      ${from} ${where}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, params),
    ]);

    const res = NextResponse.json({
      success: true,
      tours: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
      count: dataResult.rows.length,
      limit,
      offset,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to fetch tours', detail: message },
      { status: 500 },
    );
  }
}
