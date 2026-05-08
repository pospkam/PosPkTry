/**
 * POST /api/operator/tours/import
 * Bulk CSV import of tours for operators.
 *
 * Expected CSV columns (header row required):
 *   name, description, price, category, difficulty, duration, season,
 *   max_group_size, min_group_size, short_description, includes, excludes
 *
 * - includes/excludes: semicolon-separated strings ("Питание;Снаряжение")
 * - Returns: { imported, skipped, errors }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'vulkani', 'geyzery', 'rybalka', 'termalnye_istochniki', 'medvedi',
  'morskie_progulki', 'vertoletnye_tury', 'trekking', 'snegohod', 'dzhip',
  'ozera', 'gory', 'reki', 'eko', 'kombo',
] as const;

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'] as const;
const VALID_SEASONS = ['winter', 'spring', 'summer', 'autumn', 'year-round'] as const;

const RowSchema = z.object({
  name:             z.string().min(3).max(255),
  description:      z.string().min(20).max(5000),
  price:            z.coerce.number().min(1000).max(1_000_000),
  category:         z.enum(VALID_CATEGORIES).optional(),
  difficulty:       z.enum(VALID_DIFFICULTIES).optional(),
  duration:         z.coerce.number().int().min(1).max(30).optional(),
  season:           z.enum(VALID_SEASONS).optional(),
  max_group_size:   z.coerce.number().int().min(1).max(100).optional(),
  min_group_size:   z.coerce.number().int().min(1).max(100).optional(),
  short_description:z.string().max(500).optional(),
  includes:         z.string().optional(),
  excludes:         z.string().optional(),
});

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      // Simple CSV parsing supporting quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current.trim());

      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

export async function POST(req: NextRequest) {
  const auth = await requireOperator(req);
  if (auth instanceof NextResponse) return auth;

  const partnerId = await getOperatorPartnerId(auth.userId);
  if (!partnerId) {
    return NextResponse.json({ error: 'Профиль оператора не найден' }, { status: 404 });
  }

  // Accept multipart/form-data with file field "csv" OR raw text/csv body
  let csvText: string;
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('csv');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Поле "csv" не найдено в форме' }, { status: 400 });
    }
    csvText = await (file as File).text();
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'CSV файл пустой' }, { status: 400 });
  }

  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV не содержит строк данных' }, { status: 400 });
  }

  if (rows.length > 200) {
    return NextResponse.json({ error: 'Максимум 200 туров за один импорт' }, { status: 400 });
  }

  const imported: string[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    const parsed = RowSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push({ row: rowNum, reason: parsed.error.issues.map(e => e.message).join('; ') });
      continue;
    }

    const d = parsed.data;
    const includesList = d.includes ? d.includes.split(';').map(s => s.trim()).filter(Boolean) : [];
    const excludesList = d.excludes ? d.excludes.split(';').map(s => s.trim()).filter(Boolean) : [];

    try {
      // Generate slug from name
      const slug = d.name.toLowerCase()
        .replace(/[а-яёА-ЯЁ]/g, (ch) => {
          const map: Record<string, string> = {
            'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
            'з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o',
            'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
            'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
          };
          return map[ch.toLowerCase()] ?? ch.toLowerCase();
        })
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + `-${Date.now().toString(36)}`;

      const res = await pool.query<{ id: string }>(
        `INSERT INTO tours (
          operator_id, name, slug, description, price, category, difficulty,
          duration, season, max_group_size, min_group_size,
          includes, excludes, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, false, NOW(), NOW()
        ) RETURNING id`,
        [
          partnerId,
          d.name,
          slug,
          d.description,
          d.price,
          d.category ?? null,
          d.difficulty ?? 'medium',
          d.duration ?? null,
          d.season ?? null,
          d.max_group_size ?? 12,
          d.min_group_size ?? 1,
          JSON.stringify(includesList),
          JSON.stringify(excludesList),
        ]
      );
      imported.push(res.rows[0].id);
    } catch (err) {
      skipped.push({
        row: rowNum,
        reason: err instanceof Error ? err.message : 'Ошибка базы данных',
      });
    }
  }

  return NextResponse.json({
    success: true,
    imported: imported.length,
    skipped: skipped.length,
    errors: skipped,
    tour_ids: imported,
    message: `Импортировано ${imported.length} туров${skipped.length ? `, пропущено ${skipped.length}` : ''}.`,
  });
}
