/**
 * GET /api/mig057
 * Applies migration 057: adds transportation JSONB column to operator_tours
 * Seeds fishingkam tours with boat transportation data
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await pool.query(`
      ALTER TABLE operator_tours
        ADD COLUMN IF NOT EXISTS transportation JSONB DEFAULT '[]'
    `);

    // Seed fishingkam tours with boat transportation (they're river fishing tours)
    await pool.query(`
      UPDATE operator_tours ot
      SET transportation = '[{"type":"boat","price_add":3000,"duration_hours":2},{"type":"walking","price_add":0,"duration_hours":1}]'::jsonb
      FROM partners p
      WHERE ot.operator_id = p.id
        AND p.slug = 'kamchatskaya-rybalka'
        AND (ot.transportation IS NULL OR ot.transportation = '[]'::jsonb)
    `);

    const check = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'operator_tours' AND column_name = 'transportation'
    `);

    const count = await pool.query(`
      SELECT COUNT(*) as updated
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      WHERE p.slug = 'kamchatskaya-rybalka'
        AND ot.transportation != '[]'::jsonb
    `);

    return NextResponse.json({
      success: true,
      migration: '057_operator_tours_transportation',
      column_added: check.rows.length > 0,
      fishingkam_tours_updated: Number(count.rows[0]?.updated ?? 0),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
