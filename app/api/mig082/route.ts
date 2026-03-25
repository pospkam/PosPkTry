import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), 'migrations', '082_widget_partners.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(sql);
    return NextResponse.json({ success: true, message: 'Migration 082 applied: widget_partners' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
