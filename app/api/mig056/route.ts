import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  let sql: string;
  try {
    sql = fs.readFileSync(
      path.join(process.cwd(), 'migrations/056_marketplace_view_operator_tours.sql'),
      'utf8'
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Cannot read SQL file', detail: String(e) }, { status: 500 });
  }

  try {
    await pool.query(sql);
  } catch (e) {
    return NextResponse.json({ success: false, error: 'SQL error', detail: String(e) }, { status: 500 });
  }

  // Проверяем результат
  const cols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'operator_tours'
      AND column_name IN (
        'agent_route_id','price_old','price_unit','difficulty',
        'included','not_included','what_to_bring','photos',
        'tour_image','short_description','rating','review_count'
      )
    ORDER BY column_name
  `);

  const view = await pool.query(`
    SELECT COUNT(*) AS n FROM information_schema.views
    WHERE table_name = 'v_route_marketplace'
  `);

  return NextResponse.json({
    success: true,
    migration: '056_operator_tours_columns_fix',
    columns_added: cols.rows,
    view_exists: Number(view.rows[0]?.n) > 0,
  });
}
