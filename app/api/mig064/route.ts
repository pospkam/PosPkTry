import fs from 'fs';
import path from 'path';
import { pool } from '@/lib/db-pool';

/**
 * GET /api/mig064
 * Runs migration 064: Safety & Capacity Layer
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cronSecret = url.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');

  if (cronSecret !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '064_safety_capacity_layer.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;
      await pool.query(statement);
    }

    return Response.json({
      success: true,
      message: 'Migration 064 completed',
      statements_executed: statements.length,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
