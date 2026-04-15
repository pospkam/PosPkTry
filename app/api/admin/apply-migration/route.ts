/**
 * POST /api/admin/apply-migration
 * Applies migration 083 (AI Lead Processor columns) to the database.
 * Requires admin JWT or CRON_SECRET header.
 * Idempotent: uses ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireRole } from '@/lib/auth/middleware';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const authResult = await requireRole(req, ['admin']);
    if (authResult instanceof NextResponse) return authResult;
  }

  try {
    const body = await req.json().catch(() => ({})) as { migration?: string; sql?: string };

    let sql: string;

    if (body.sql && typeof body.sql === 'string' && body.sql.length > 0) {
      // Inline SQL mode — execute directly (max 10KB for safety)
      sql = body.sql.substring(0, 10_000);
    } else {
      // File mode — read from migrations directory
      const migName = body.migration?.replace(/[^a-zA-Z0-9_\-.]/g, '') || '083_lead_processor.sql';
      let migFile = path.join(process.cwd(), 'migrations', migName);
      if (!fs.existsSync(migFile)) {
        migFile = path.join(process.cwd(), 'lib', 'database', 'migrations', migName);
      }
      sql = fs.readFileSync(migFile, 'utf-8');
    }

    // Split on semicolons and run each statement (skip empty)
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results: string[] = [];
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        results.push('OK');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Ignore "already exists" errors — migration is idempotent
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          results.push('SKIP (already exists)');
        } else {
          results.push(`ERROR: ${msg}`);
        }
      }
    }

    const errors = results.filter(r => r.startsWith('ERROR'));
    return NextResponse.json({
      success: errors.length === 0,
      stats: { total: results.length, errors: errors.length },
      results: results.map((r, i) => `[${i + 1}] ${r}`),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Ошибка применения миграции' },
      { status: 500 }
    );
  }
}
