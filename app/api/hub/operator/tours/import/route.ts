/**
 * POST /api/hub/operator/tours/import
 *
 * Bulk CSV import of operator tours.
 * Accepts multipart/form-data with a "file" field (text/csv).
 * Returns per-row results: created | skipped | error.
 *
 * Required CSV columns:
 *   title, activity_type, location_type, location_name,
 *   latitude, longitude, base_price, max_participants
 *
 * Optional:
 *   description, short_description, duration_hours, difficulty,
 *   price_unit, min_participants, season_start, season_end, tags
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOperator } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { createTour, CreateTourSchema } from '@/lib/api/operator-tours';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser (no external deps)
// ─────────────────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row → CreateTourSchema mapper
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED = ['title', 'activity_type', 'location_type', 'location_name', 'latitude', 'longitude', 'base_price', 'max_participants'] as const;

function mapRow(row: Record<string, string>): z.infer<typeof CreateTourSchema> {
  const tags = row['tags']
    ? row['tags'].split(';').map(t => t.trim()).filter(Boolean)
    : undefined;

  return CreateTourSchema.parse({
    title:             row['title'],
    description:       row['description']       || undefined,
    short_description: row['short_description'] || undefined,
    location_type:     row['location_type'],
    activity_type:     row['activity_type'],
    location_name:     row['location_name'],
    latitude:          parseFloat(row['latitude']),
    longitude:         parseFloat(row['longitude']),
    base_price:        parseFloat(row['base_price']),
    price_unit:        (row['price_unit'] as 'per_tour' | 'per_person' | 'per_day_per_person') || 'per_tour',
    max_participants:  parseInt(row['max_participants'], 10),
    min_participants:  row['min_participants'] ? parseInt(row['min_participants'], 10) : undefined,
    duration_hours:    row['duration_hours']    ? parseFloat(row['duration_hours']) : undefined,
    difficulty:        (row['difficulty'] as 'easy' | 'medium' | 'hard' | 'expert') || undefined,
    season_start:      row['season_start']      || undefined,
    season_end:        row['season_end']        || undefined,
    tags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

async function getOperatorId(userId: string): Promise<string | null> {
  const result = await query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return (result.rows[0]?.id as string) || null;
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ error: 'Не зарегистрированы как оператор' }, { status: 403 });
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Ожидается multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Поле "file" обязательно' }, { status: 400 });
  }

  const text = await (file as File).text();
  if (!text.trim()) {
    return NextResponse.json({ error: 'Файл пустой' }, { status: 400 });
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Нет строк данных' }, { status: 400 });
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: 'Максимум 200 туров за раз' }, { status: 400 });
  }

  // Validate required columns presence
  const headers = Object.keys(rows[0]);
  const missing = REQUIRED.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    return NextResponse.json({
      error: `Отсутствуют обязательные колонки: ${missing.join(', ')}`,
    }, { status: 400 });
  }

  // Process rows
  type RowResult =
    | { row: number; status: 'created'; id: unknown; title: string }
    | { row: number; status: 'error'; title: string; reason: string };

  const results: RowResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based + header row
    const raw = rows[i];
    const title = raw['title'] || `строка ${rowNum}`;

    try {
      const input = mapRow(raw);
      const tour = await createTour(operatorId, authOrResponse.userId, input);
      results.push({ row: rowNum, status: 'created', id: tour.id, title: input.title });
      created++;
    } catch (err) {
      const reason = err instanceof z.ZodError
        ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        : err instanceof Error ? err.message : 'Неизвестная ошибка';
      results.push({ row: rowNum, status: 'error', title, reason });
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    summary: { total: rows.length, created, failed },
    results,
  });
}
