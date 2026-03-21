import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = readFileSync(join(process.cwd(), 'migrations/060_user_trips_flights.sql'), 'utf8');
    await pool.query(sql);
    return NextResponse.json({ success: true, message: 'Migration 060 applied: flight columns added to user_trips' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
