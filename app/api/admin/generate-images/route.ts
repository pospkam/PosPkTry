import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import {
  generateAndStoreRouteImage,
  getRoutesWithoutImages,
} from '@/lib/services/ai-image-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for batch job

/**
 * GET  /api/admin/generate-images — статус (сколько без изображений)
 * POST /api/admin/generate-images — запустить генерацию для всех без изображений
 *   body: { batch?: number; routeId?: string; force?: boolean }
 */

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError instanceof NextResponse) return authError;

  const missing = await getRoutesWithoutImages();
  return NextResponse.json({
    success: true,
    missing: missing.length,
    routes: missing.map(r => ({ id: r.id, title: r.title, type: r.location_type })),
  });
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError instanceof NextResponse) return authError;

  const body = await req.json().catch(() => ({})) as {
    routeId?: string;
    batch?: number;
    force?: boolean;
  };

  // Single route
  if (body.routeId) {
    const { query } = await import('@/lib/database');
    const result = await query<{
      id: string; title: string; location_type: string | null; description: string;
    }>(
      'SELECT id, title, location_type, description FROM agent_route_knowledge WHERE id = $1',
      [body.routeId],
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }
    const r = result.rows[0];
    const res = await generateAndStoreRouteImage(
      r.id, r.title, r.location_type, r.description ?? '', body.force ?? false,
    );
    return NextResponse.json({ success: true, result: res });
  }

  // Batch generation
  const missing = await getRoutesWithoutImages();
  const batchSize = Math.min(body.batch ?? 10, 50); // max 50 per call
  const todo = missing.slice(0, batchSize);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const route of todo) {
    try {
      await generateAndStoreRouteImage(
        route.id, route.title, route.location_type, route.description ?? '',
      );
      results.push({ id: route.id, ok: true });
    } catch (e) {
      results.push({ id: route.id, ok: false, error: String(e) });
    }
  }

  const done = results.filter(r => r.ok).length;
  const remaining = missing.length - done;

  return NextResponse.json({
    success: true,
    processed: results.length,
    done,
    failed: results.filter(r => !r.ok).length,
    remaining,
    results,
  });
}
