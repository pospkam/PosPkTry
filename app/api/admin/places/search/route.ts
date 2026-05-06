/**
 * GET /api/admin/places/search?q=...
 *
 * Search places by name (admin tool for photo upload UI).
 * Returns id, name, location_type, has_photo (whether ai_route_images exists).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const where = q.length > 0 ? `WHERE p.name ILIKE $1` : '';
  const params: (string | number)[] = q.length > 0 ? [`%${q}%`, limit] : [limit];
  const limitPlaceholder = q.length > 0 ? '$2' : '$1';

  const result = await pool.query<{
    id: string;
    ark_id: string | null;
    name: string;
    location_type: string | null;
    has_photo: boolean;
  }>(
    `SELECT
       p.id,
       p.ark_id,
       p.name,
       p.location_type,
       (ari.route_id IS NOT NULL) AS has_photo
     FROM places p
     LEFT JOIN ai_route_images ari ON ari.route_id = p.ark_id
     ${where}
     ORDER BY p.name ASC
     LIMIT ${limitPlaceholder}`,
    params,
  );

  return NextResponse.json({
    items: result.rows.map((r) => ({
      id: r.id,
      arkId: r.ark_id,
      name: r.name,
      locationType: r.location_type,
      hasPhoto: r.has_photo,
      photoUrl: r.has_photo && r.ark_id ? `/api/images/route/${r.ark_id}` : null,
    })),
  });
}
