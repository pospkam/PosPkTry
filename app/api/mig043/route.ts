import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    await query(`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
          CHECK (status IN ('new','contacted','qualified','converted','lost')),
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at DESC)
    `);

    return NextResponse.json({ success: true, message: 'Migration 043 applied: leads.status + notes + updated_at added' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
