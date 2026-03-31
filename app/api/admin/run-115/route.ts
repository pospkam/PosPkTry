/**
 * TEMP: run-115 — apply outreach_queue migration
 * DELETE after applying.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'run-outreach-115') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const migrationPath = join(process.cwd(), 'migrations', '115_outreach_queue.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    return NextResponse.json({
      success: true,
      message: 'Migration 115 applied: outreach_queue table created',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
