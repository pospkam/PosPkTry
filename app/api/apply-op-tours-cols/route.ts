import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alters = [
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS short_description VARCHAR(500)`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS price_old DECIMAL(10,2)`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS price_unit VARCHAR(50) DEFAULT 'per_person'`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50)`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS included TEXT[]`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS not_included TEXT[]`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS what_to_bring TEXT[]`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS photos TEXT[]`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS tour_image VARCHAR(500)`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS agent_route_id UUID REFERENCES agent_route_knowledge(id) ON DELETE SET NULL`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2)`,
      `ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS idx_op_tours_agent_route ON operator_tours(agent_route_id) WHERE agent_route_id IS NOT NULL`,
    ];

    for (const sql of alters) {
      await pool.query(sql);
    }

    await pool.query('DROP VIEW IF EXISTS v_route_marketplace');
    await pool.query(`CREATE VIEW v_route_marketplace AS
SELECT
  ark.id AS route_id, ark.route_dedupe_key AS route_slug,
  ark.title AS route_title, ark.category AS route_category,
  ark.description AS route_description, ark.lat, ark.lng, ark.payload AS metadata,
  ot.id AS tour_id, ot.title AS tour_name,
  COALESCE(ot.short_description, ot.description) AS tour_short_desc,
  ot.tour_image, ot.base_price AS tour_price_base, ot.price_old,
  COALESCE(ot.price_unit,'per_person') AS price_unit,
  COALESCE(ot.price_old, ot.base_price) AS effective_price,
  ot.duration_hours AS tour_duration_hours, ot.duration_type, ot.multi_day_count,
  ot.difficulty AS tour_difficulty, ot.max_participants AS max_group_size,
  ot.min_participants AS min_group_size,
  COALESCE(ot.rating,0) AS tour_rating, COALESCE(ot.review_count,0) AS tour_review_count,
  ot.included, ot.season_start, ot.season_end,
  p.id AS operator_id, COALESCE(p.company_name, p.name) AS operator_name,
  p.slug AS operator_slug, p.hero_image AS operator_hero_image,
  COALESCE(p.rating,0) AS operator_rating, COALESCE(p.review_count,0) AS operator_review_count,
  COALESCE(p.commission_current, p.commission_rate, 15.00) AS commission_rate,
  p.is_verified AS operator_verified,
  ns.date AS next_departure_date, ns.available_slots AS next_departure_slots,
  ns.price_override AS next_departure_price,
  (COALESCE(ot.rating,0)*0.7+(1.0-COALESCE(p.commission_current,p.commission_rate,0.15)/100.0)*0.3) AS marketplace_score
FROM operator_tours ot
JOIN partners p ON p.id=ot.operator_id
JOIN agent_route_knowledge ark ON ark.id=ot.agent_route_id
LEFT JOIN LATERAL (
  SELECT ta.date, ta.available_slots, ta.base_price_override AS price_override
  FROM tour_availability ta
  WHERE ta.operator_tour_id=ot.id AND ta.is_cancelled=FALSE
    AND ta.available_slots>COALESCE(ta.booked_slots,0) AND ta.date>=CURRENT_DATE
  ORDER BY ta.date ASC LIMIT 1
) ns ON TRUE
WHERE ot.is_active=TRUE AND ot.is_published=TRUE AND ot.deleted_at IS NULL AND p.is_public=TRUE`);

    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='operator_tours'
        AND column_name IN ('agent_route_id','price_old','difficulty','included','photos','tour_image')
      ORDER BY column_name`);

    return NextResponse.json({
      success: true,
      migration: '056_operator_tours_columns',
      columns: check.rows.map((r: Record<string, unknown>) => r.column_name),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
