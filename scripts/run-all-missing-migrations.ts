#!/usr/bin/env node
/**
 * scripts/run-all-missing-migrations.ts
 *
 * Idempotent migration runner: applies all .sql files in migrations/ that haven't been run yet
 * Safe: uses transactions, rolls back on error
 *
 * Usage:
 *   npx ts-node scripts/run-all-missing-migrations.ts [--dry-run] [--verbose]
 */

import { pool } from '../lib/db-pool';
import fs from 'fs';
import path from 'path';

interface Migration {
  filename: string;
  number: string;
  applied: boolean;
}

const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

async function getAllMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && /^\d{3,4}/.test(f))
    .sort();

  return files.map(filename => ({
    filename,
    number: filename.split('_')[0],
    applied: false,
  }));
}

async function checkAppliedMigrations(migrations: Migration[]): Promise<Migration[]> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query('SELECT version FROM schema_migrations');
    const applied = new Set(result.rows.map(r => r.version));

    return migrations.map(m => ({
      ...m,
      applied: applied.has(m.number),
    }));
  } catch (error) {
    return migrations;
  }
}

async function runMigrations() {

  try {
    let migrations = await getAllMigrations();
    migrations = await checkAppliedMigrations(migrations);

    const pending = migrations.filter(m => !m.applied);


    if (pending.length === 0) {
      process.exit(0);
    }

    pending.forEach(m => console.log(`  - ${m.filename}`));

    if (dryRun) {
      process.exit(0);
    }

    // Apply pending migrations

    for (const mig of pending) {
      const filepath = path.join(process.cwd(), 'migrations', mig.filename);
      const sql = fs.readFileSync(filepath, 'utf-8');
      const startTime = Date.now();

      try {
        // Use transaction for safety
        await pool.query('BEGIN');

        if (verbose) console.log(`  Running: ${mig.filename}...`);
        await pool.query(sql);

        // Record migration
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [mig.number]
        );

        await pool.query('COMMIT');

        const duration = Date.now() - startTime;
      } catch (error) {
        await pool.query('ROLLBACK');
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }


    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

runMigrations();
