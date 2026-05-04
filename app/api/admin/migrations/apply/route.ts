/**
 * POST /api/admin/migrations/apply
 * Apply pending database migrations (admin only)
 *
 * CRITICAL: This modifies production schema
 * Only accessible with admin JWT + explicit migration names
 *
 * Auth: admin role required
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const ApplyMigrationsSchema = z.object({
  migrations: z.array(z.string().regex(/^\d{3}$/)).min(1),
  dry_run: z.boolean().default(false),
});

/**
 * Read migration SQL file safely
 */
function readMigrationFile(migrationNumber: string): string | null {
  const migrationsDir = path.join(process.cwd(), 'migrations');

  try {
    const files = fs.readdirSync(migrationsDir);
    const migFile = files.find(f => f.startsWith(`${migrationNumber}_`));

    if (!migFile) return null;

    const filepath = path.join(migrationsDir, migFile);
    return fs.readFileSync(filepath, 'utf-8');
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authOrResponse = await requireAdmin(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const body = await request.json();
    const parsed = ApplyMigrationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { migrations, dry_run } = parsed.data;
    const results: Array<{ migration: string; status: 'success' | 'error'; message: string }> = [];


    for (const mig of migrations) {
      try {
        const sql = readMigrationFile(mig);
        if (!sql) {
          results.push({
            migration: mig,
            status: 'error',
            message: 'Migration file not found',
          });
          continue;
        }

        if (dry_run) {
          results.push({
            migration: mig,
            status: 'success',
            message: 'DRY RUN OK (not applied)',
          });
          continue;
        }

        // Execute migration
        await pool.query(sql);

        results.push({
          migration: mig,
          status: 'success',
          message: 'Applied successfully',
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          migration: mig,
          status: 'error',
          message: errorMsg,
        });

      }
    }

    const hasErrors = results.some(r => r.status === 'error');

    return NextResponse.json(
      {
        success: !hasErrors,
        dry_run,
        results,
        summary: {
          total: results.length,
          applied: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
        },
      },
      { status: hasErrors ? 400 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Migration application failed' },
      { status: 500 }
    );
  }
}
