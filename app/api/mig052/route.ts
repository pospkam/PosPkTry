import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'migrations/052_operator_onboarding.sql'),
    'utf8'
  );
  await pool.query(sql);
  return NextResponse.json({ success: true, migration: '052_operator_onboarding' });
}
