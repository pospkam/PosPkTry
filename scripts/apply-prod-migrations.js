#!/usr/bin/env node
/**
 * scripts/apply-prod-migrations.js (compiled JS, no TypeScript issues)
 *
 * Apply migrations directly to production via DATABASE_URL
 * No local PostgreSQL required
 *
 * Usage:
 *   node scripts/apply-prod-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\n🚀 Applying migrations to production...\n');

    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Read all migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && /^\d{3,4}/.test(f))
      .sort();

    let applied = 0;

    for (const filename of files) {
      const version = filename.split('_')[0];

      // Check if already applied
      const result = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (result.rows.length > 0) {
        console.log(`  ⏭️  ${filename}`);
        continue;
      }

      // Read and apply migration
      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');

      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        console.log(`  ✅ ${filename}`);
        applied++;
      } catch (error) {
        console.error(`  ❌ ${filename}: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n✅ Applied ${applied} new migrations\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message, '\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
