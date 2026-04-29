/**
 * Bootstrap _migrations tracking table on production.
 * Reads all .sql files from migrations/, creates _migrations table,
 * and marks every existing file as already applied.
 * 
 * Usage: DATABASE_URL=<prod> npx tsx scripts/bootstrap-migrations-tracking.ts
 */

import { Pool } from 'pg';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Create tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Table _migrations created (or already exists)');

    // 2. Read migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${files.length} migration files in migrations/`);

    // 3. Check what's already tracked
    const applied = await pool.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY name'
    );
    const appliedSet = new Set(applied.rows.map(r => r.name));
    console.log(`📋 Already tracked: ${appliedSet.size}`);

    // 4. Insert missing
    let inserted = 0;
    let skipped = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped++;
        continue;
      }
      await pool.query(
        'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [file]
      );
      inserted++;
    }

    // 5. Final count
    const final = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM _migrations'
    );
    const total = parseInt(final.rows[0].count);

    console.log(`\n📊 Summary:`);
    console.log(`   Files in migrations/: ${files.length}`);
    console.log(`   Already tracked: ${skipped}`);
    console.log(`   Newly inserted: ${inserted}`);
    console.log(`   Total in _migrations: ${total}`);

    if (total === files.length) {
      console.log(`\n✅ Bootstrap complete! Tracking is in sync.`);
    } else {
      console.log(`\n⚠️  Mismatch: ${files.length} files vs ${total} tracked records`);
    }

    // 6. Show first/last 5
    const sample = await pool.query<{ name: string }>(
      `SELECT name FROM _migrations ORDER BY name LIMIT 5`
    );
    console.log(`\n   First 5: ${sample.rows.map(r => r.name).join(', ')}`);

    const last5 = await pool.query<{ name: string }>(
      `SELECT name FROM _migrations ORDER BY name DESC LIMIT 5`
    );
    console.log(`   Last 5: ${last5.rows.map(r => r.name).join(', ')}`);

  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
