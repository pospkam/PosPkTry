/**
 * GET /api/hub/marketplace/tours
 * Public API: Get all available tours for marketplace
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activity = searchParams.get('activity_type');
    const location = searchParams.get('location_type');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT
        ot.id,
        ot.title,
        ot.description,
        ot.base_price,
        ot.activity_type,
        ot.location_type,
        ot.location,
        ot.tour_image,
        p.name as operator_name,
        p.id as operator_id,
        COUNT(ob.id)::INT as bookings_count
      FROM operator_tours ot
      JOIN partners p ON ot.partner_id = p.id
      LEFT JOIN operator_bookings ob ON ob.tour_id = ot.id
      WHERE ot.deleted_at IS NULL AND ot.is_active = true
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (activity) {
      query += ` AND ot.activity_type = $${paramCount++}`;
      params.push(activity);
    }

    if (location) {
      query += ` AND ot.location_type = $${paramCount++}`;
      params.push(location);
    }

    if (search) {
      query += ` AND (ot.title ILIKE $${paramCount} OR ot.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY ot.id, p.id ORDER BY ot.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      tours: result.rows,
      count: result.rows.length,
      limit,
      offset
    });
  } catch (err) {
    console.error('[Marketplace API]', err);
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}
