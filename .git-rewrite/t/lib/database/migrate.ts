/**
 * Database migration runner.
 *
 * Usage:
 *   npx tsx lib/database/migrate.ts
 *
 * - Creates `_migrations` tracking table on first run.
 * - Reads all *.sql files from lib/database/migrations/ sorted by name.
 * - Skips already-applied migrations.
 * - Applies new ones inside a transaction and records them.
 */

import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Ensure tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const applied = await pool.query<{ name: string }>(
      `SELECT name FROM _migrations ORDER BY name`
    );
    const appliedSet = new Set(applied.rows.map((r) => r.name));

    // Read migration files
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const filePath = join(MIGRATIONS_DIR, file);
      const sql = await readFile(filePath, 'utf-8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO _migrations (name) VALUES ($1)`,
          [file]
        );
        await client.query('COMMIT');
        console.error(`[migrate] Applied: ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] FAILED: ${file}`);
        console.error(err);
        process.exit(1);
      } finally {
        client.release();
      }
    }

    if (count === 0) {
      console.error('[migrate] No new migrations to apply.');
    } else {
      console.error(`[migrate] Done. Applied ${count} migration(s).`);
    }
  } finally {
    await pool.end();
  }
}

main();
