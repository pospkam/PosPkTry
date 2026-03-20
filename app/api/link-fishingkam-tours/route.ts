import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find the fishingkam route UUID
    const routeRes = await pool.query(
      `SELECT id FROM agent_route_knowledge
       WHERE route_dedupe_key = 'rybolovnaya-baza-kamchatskaya-rybalka|55.4441|159.5874'
       LIMIT 1`
    );

    if (routeRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'fishingkam route not found in agent_route_knowledge' }, { status: 404 });
    }

    const routeId = routeRes.rows[0].id as string;

    // Find the operator ID for kamchatskaya-rybalka
    const opRes = await pool.query(
      `SELECT id FROM partners WHERE slug = 'kamchatskaya-rybalka' LIMIT 1`
    );

    if (opRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'operator kamchatskaya-rybalka not found' }, { status: 404 });
    }

    const operatorId = opRes.rows[0].id as string;

    // Update all operator_tours for this operator that have no agent_route_id yet
    const updateRes = await pool.query(
      `UPDATE operator_tours
       SET agent_route_id = $1
       WHERE operator_id = $2 AND agent_route_id IS NULL
       RETURNING id, title`,
      [routeId, operatorId]
    );

    return NextResponse.json({
      success: true,
      route_id: routeId,
      operator_id: operatorId,
      updated: updateRes.rows.length,
      tours: updateRes.rows,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
