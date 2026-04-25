/**
 * Database migration runner.
 *
 * Usage:
 *   npx tsx lib/database/migrate.ts
 *   npm run migrate
 *
 * - Reads all *.sql files from migrations/ sorted by name.
 * - Skips already-applied migrations (tracked in _migrations table).
 * - Detects non-transactional operations (CONCURRENTLY) and applies them
 *   without BEGIN/COMMIT.
 * - Ignores "already exists" / "duplicate key" errors at JS level.
 * - Records each successful migration in _migrations.
 */

import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations');

/** Detect migrations that cannot run inside a transaction */
function isNonTransactional(sql: string): boolean {
  return (
    /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql) ||
    /REINDEX\s+.*CONCURRENTLY/i.test(sql) ||
    /DROP\s+INDEX\s+CONCURRENTLY/i.test(sql)
  );
}

/** Check if an error is a benign "already exists" type */
function isAlreadyExistsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already exists') ||
    lower.includes('duplicate key') ||
    lower.includes('duplicate column') ||
    lower.includes('already have')
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[ERROR] DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  let appliedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Ensure tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const applied = await pool.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY name'
    );
    const appliedSet = new Set(applied.rows.map(r => r.name));

    // Read migration files
    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`[SCAN] Found ${files.length} migration files`);
    console.log(`[SKIP-ALREADY-APPLIED] ${appliedSet.size} already tracked`);

    for (const file of files) {
      if (appliedSet.has(file)) {
        skippedCount++;
        continue;
      }

      const filePath = join(MIGRATIONS_DIR, file);
      const sql = await readFile(filePath, 'utf-8');

      if (!sql.trim()) {
        console.log(`[SKIP-EXISTS] ${file} (empty file, marking as applied)`);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        skippedCount++;
        continue;
      }

      const nonTx = isNonTransactional(sql);

      if (nonTx) {
        // Non-transactional: statement by statement, no BEGIN/COMMIT
        console.log(`[APPLY-NOTX] ${file} (non-transactional)`);
        const statements = sql
          .split(/;\s*\n/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          try {
            await pool.query(stmt);
          } catch (err: any) {
            if (isAlreadyExistsError(err.message)) {
              console.log(`  [SKIP-EXISTS] ${err.message.slice(0, 80)}`);
            } else {
              console.error(`  [ERROR] ${err.message}`);
              errorCount++;
              // For non-transactional, we can't rollback — log and continue
            }
          }
        }
      } else {
        // Transactional: wrap in BEGIN/COMMIT
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
          console.log(`[APPLY] ${file}`);
        } catch (err: any) {
          await client.query('ROLLBACK');
          if (isAlreadyExistsError(err.message)) {
            console.log(`  [SKIP-EXISTS] ${err.message.slice(0, 80)}`);
            // Still record as applied so we don't retry
          } else {
            console.error(`  [ERROR] ${file}: ${err.message}`);
            errorCount++;
            process.exit(1);
          }
        } finally {
          client.release();
        }
      }

      // Record as applied
      await pool.query(
        'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [file]
      );
      appliedCount++;
    }

    console.log(`\n[SUMMARY] Applied: ${appliedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
    if (appliedCount === 0) {
      console.log('[DONE] All migrations are up to date');
    } else {
      console.log(`[DONE] ${appliedCount} migration(s) applied`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
