/**
 * POST /api/analytics/affiliate-clicks
 * Track affiliate link clicks for revenue analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

const ClickSchema = z.object({
  partner: z.string().max(50),      // 'aviasales', 'hotellook', 'tripster', etc
  source: z.string().max(100),       // 'homepage', 'route-detail', 'operator-page'
  subId: z.string().max(100).optional(),
  referrer: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ClickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { partner, source, subId, referrer } = parsed.data;
    const ipAddr = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Log click
    await pool.query(
      `INSERT INTO affiliate_clicks (partner, source, sub_id, referrer, ip_addr, clicked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [partner, source, subId || null, referrer || null, ipAddr]
    );

    return NextResponse.json({ success: true });
  } catch (err) {

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/analytics/affiliate-clicks?days=7
 * Get affiliate click stats
 */
export async function GET(request: NextRequest) {
  try {
    const days = request.nextUrl.searchParams.get('days') || '7';
    const daysNum = Math.min(parseInt(days), 90);

    const result = await pool.query(
      `SELECT
         partner,
         source,
         COUNT(*) as clicks,
         COUNT(DISTINCT ip_addr) as unique_visitors,
         DATE(clicked_at) as date
       FROM affiliate_clicks
       WHERE clicked_at > NOW() - INTERVAL '1 day' * $1
       GROUP BY partner, source, DATE(clicked_at)
       ORDER BY clicked_at DESC, clicks DESC`,
      [daysNum]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err) {

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
