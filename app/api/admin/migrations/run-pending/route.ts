/**
 * POST /api/admin/migrations/run-pending
 * Apply all pending (not yet tracked) SQL migrations — admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import fs from 'fs';
import path from 'path';

function isNonTransactional(sql: string): boolean {
  return /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql);
}

function isAlreadyExistsError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('already exists') || m.includes('duplicate key') || m.includes('duplicate column');
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const body = await request.json().catch(() => ({})) as { dry_run?: boolean };
  const dryRun = body.dry_run === true;

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const allFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY name'
    );
    const applied = new Set(rows.map(r => r.name));
    const pending = allFiles.filter(f => !applied.has(f));

    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: 'Нет новых миграций', results: [] });
    }

    const results: { file: string; status: 'ok' | 'skip' | 'error'; message: string }[] = [];

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8').trim();

      if (!sql) {
        results.push({ file, status: 'skip', message: 'Empty file' });
        continue;
      }

      if (dryRun) {
        results.push({ file, status: 'ok', message: 'DRY RUN — not applied' });
        continue;
      }

      if (isNonTransactional(sql)) {
        const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
        let fileOk = true;
        for (const stmt of statements) {
          try { await pool.query(stmt); } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (!isAlreadyExistsError(msg)) {
              results.push({ file, status: 'error', message: msg.slice(0, 200) });
              fileOk = false;
              break;
            }
          }
        }
        if (fileOk) results.push({ file, status: 'ok', message: 'Applied (non-tx)' });
      } else {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
          results.push({ file, status: 'ok', message: 'Applied' });
        } catch (e: unknown) {
          await client.query('ROLLBACK');
          const msg = e instanceof Error ? e.message : String(e);
          if (isAlreadyExistsError(msg)) {
            results.push({ file, status: 'skip', message: 'Already exists' });
          } else {
            results.push({ file, status: 'error', message: msg.slice(0, 200) });
          }
        } finally {
          client.release();
        }
      }
    }

    const errors = results.filter(r => r.status === 'error').length;
    return NextResponse.json({
      success: errors === 0,
      dry_run: dryRun,
      pending: pending.length,
      results,
      summary: {
        ok: results.filter(r => r.status === 'ok').length,
        skip: results.filter(r => r.status === 'skip').length,
        error: errors,
      },
    }, { status: errors > 0 ? 400 : 200 });

  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
