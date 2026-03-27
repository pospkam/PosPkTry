/**
 * TEMPORARY: One-shot endpoint to apply migration 085.
 * Self-documents that it should be deleted after use.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

const STATEMENTS = [
  `UPDATE operator_tours SET
    not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
    what_to_bring = '["Тёплая многослойная одежда","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров (летом)","Личная аптечка","Документы (паспорт)"]'::jsonb,
    photos = ARRAY[
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/2025-01-27_142444.jpg',
      '/images/fishingkam/2025-01-27_142551.jpg'
    ]
  WHERE id IN (1, 2, 3) AND deleted_at IS NULL`,

  `UPDATE operator_tours SET
    not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
    what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
    photos = ARRAY[
      '/images/fishingkam/2025-02-10_151416.jpg',
      '/images/fishingkam/2025-02-10_151421.jpg',
      '/images/fishingkam/2025-02-10_151433.jpg',
      '/images/fishingkam/2025-01-27_142653.jpg',
      '/images/fishingkam/2025-01-27_142814.jpg'
    ]
  WHERE id IN (4, 5, 6) AND deleted_at IS NULL`,

  `UPDATE operator_tours SET
    not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки"]'::jsonb,
    what_to_bring = '["Одежда по сезону","Удобная обувь","Солнцезащитные очки","Средства гигиены","Документы (паспорт)","Наличные для сувениров"]'::jsonb,
    photos = ARRAY[
      '/images/fishingkam/2025-01-27_142510_1.jpg',
      '/images/fishingkam/2025-01-27_142551_1.jpg',
      '/images/fishingkam/2025-01-27_142818_1.jpg',
      '/images/fishingkam/2025-02-10_151441.jpg',
      '/images/fishingkam/2025-02-10_151450.jpg'
    ]
  WHERE id IN (7, 8, 9, 10, 11) AND deleted_at IS NULL`,
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-key');
  if (secret !== 'octo-085-apply') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: string[] = [];
  for (const stmt of STATEMENTS) {
    try {
      const r = await pool.query(stmt);
      results.push(`OK (${r.rowCount} rows)`);
    } catch (e) {
      results.push(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
