import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'scripts/seed-kamchatka-routes-full.sql'),
    'utf8'
  );
  await pool.query(sql);

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total FROM agent_route_knowledge WHERE is_visible = TRUE`
  );

  return NextResponse.json({
    success: true,
    migration: 'seed_kamchatka_routes_full',
    total_visible: result.rows[0]?.total ?? 0,
  });
}
