import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  url: z.string().url(),
  source_type: z.enum(['rss', 'search_tavily', 'search_brave']).default('rss'),
  domain: z.enum(['ai_tech', 'travel_industry', 'competitors']),
  label: z.string().min(1).max(200),
  search_query: z.string().max(500).optional(),
  ai_filter: z.string().max(2000).optional(),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url().optional(),
  label: z.string().min(1).max(200).optional(),
  domain: z.enum(['ai_tech', 'travel_industry', 'competitors']).optional(),
  source_type: z.enum(['rss', 'search_tavily', 'search_brave']).optional(),
  search_query: z.string().max(500).optional(),
  ai_filter: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/admin/intelligence-sources
 * List all intelligence sources with optional filters
 */
export async function GET(request: NextRequest) {
  const adminOrRes = await requireAdmin(request);
  if (adminOrRes instanceof NextResponse) return adminOrRes;

  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const activeOnly = searchParams.get('active') === 'true';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (domain) {
      conditions.push(`domain = $${idx++}`);
      params.push(domain);
    }
    if (activeOnly) {
      conditions.push(`active = true`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query<{
      id: string; url: string; source_type: string; domain: string; label: string;
      search_query: string | null; ai_filter: string | null; active: boolean;
      last_fetched_at: string | null; last_error: string | null; fetch_error_count: number;
      created_at: string; updated_at: string;
    }>(
      `SELECT id, url, source_type, domain, label, search_query, ai_filter, active,
              last_fetched_at, last_error, fetch_error_count, created_at, updated_at
       FROM intelligence_sources ${where}
       ORDER BY domain, source_type, created_at`,
      params
    );

    return NextResponse.json({ success: true, sources: rows });
  } catch (err) {
    console.error('[admin/intelligence-sources] GET failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Ошибка загрузки источников' }, { status: 500 });
  }
}

/**
 * POST /api/admin/intelligence-sources
 * Add a new intelligence source
 */
export async function POST(request: NextRequest) {
  const adminOrRes = await requireAdmin(request);
  if (adminOrRes instanceof NextResponse) return adminOrRes;

  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);

    const { rows } = await query<{ id: string }>(
      `INSERT INTO intelligence_sources (url, source_type, domain, label, search_query, ai_filter)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.url, data.source_type, data.domain, data.label, data.search_query ?? null, data.ai_filter ?? null]
    );

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Ошибка создания';
    if (msg.includes('duplicate key')) {
      return NextResponse.json({ success: false, error: 'Этот URL уже добавлен' }, { status: 409 });
    }
    console.error('[admin/intelligence-sources] POST failed:', msg);
    return NextResponse.json({ success: false, error: 'Ошибка создания источника' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/intelligence-sources
 * Update an existing source
 */
export async function PATCH(request: NextRequest) {
  const adminOrRes = await requireAdmin(request);
  if (adminOrRes instanceof NextResponse) return adminOrRes;

  try {
    const body = await request.json();
    const data = UpdateSchema.parse(body);
    const { id, ...fields } = data;

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет полей для обновления' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE intelligence_sources SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      params
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    console.error('[admin/intelligence-sources] PATCH failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Ошибка обновления' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/intelligence-sources
 * Deactivate a source (soft-delete)
 */
export async function DELETE(request: NextRequest) {
  const adminOrRes = await requireAdmin(request);
  if (adminOrRes instanceof NextResponse) return adminOrRes;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await query(
      `UPDATE intelligence_sources SET active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/intelligence-sources] DELETE failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Ошибка удаления' }, { status: 500 });
  }
}
