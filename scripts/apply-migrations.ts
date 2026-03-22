#!/usr/bin/env node
/**
 * scripts/apply-migrations.ts
 *
 * Apply pending database migrations directly (no HTTP overhead)
 *
 * Usage:
 *   npx ts-node scripts/apply-migrations.ts 054 064 066 [--dry-run] [--verbose]
 *
 * Examples:
 *   # Dry run to see what will be applied
 *   npx ts-node scripts/apply-migrations.ts 054 064 066 --dry-run
 *
 *   # Apply all three migrations
 *   npx ts-node scripts/apply-migrations.ts 054 064 066
 *
 *   # Apply with verbose output
 *   npx ts-node scripts/apply-migrations.ts 054 --verbose
 */

import { pool } from '../lib/db-pool';
import fs from 'fs';
import path from 'path';

interface MigrationResult {
  number: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  duration_ms?: number;
}

const results: MigrationResult[] = [];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

// Extract migration numbers
const migrations = args.filter(a => /^\d{3}$/.test(a));

if (migrations.length === 0) {
  console.log('Usage: npx ts-node scripts/apply-migrations.ts <number> [<number>...] [--dry-run] [--verbose]');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/apply-migrations.ts 054 064 066');
  process.exit(1);
}

function readMigrationFile(migrationNumber: string): string | null {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  try {
    const files = fs.readdirSync(migrationsDir);
    const migFile = files.find(f => f.startsWith(`${migrationNumber}_`));
    if (!migFile) return null;
    return fs.readFileSync(path.join(migrationsDir, migFile), 'utf-8');
  } catch (error) {
    return null;
  }
}

async function applyMigrations() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`DATABASE MIGRATIONS`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Mode:        ${dryRun ? '🔍 DRY RUN (no changes)' : '🔥 LIVE (will apply)'}`);
  console.log(`Migrations:  ${migrations.join(', ')}`);
  console.log(`Verbose:     ${verbose ? 'ON' : 'OFF'}`);
  console.log(`${'='.repeat(80)}\n`);

  for (const mig of migrations) {
    const startTime = Date.now();

    try {
      const sql = readMigrationFile(mig);
      if (!sql) {
        results.push({
          number: mig,
          status: 'error',
          message: '❌ Migration file not found',
        });
        continue;
      }

      if (dryRun) {
        if (verbose) console.log(`DRY RUN: Migration ${mig} would execute (${sql.length} bytes)`);
        results.push({
          number: mig,
          status: 'skipped',
          message: '⏭️  DRY RUN (not applied)',
          duration_ms: 0,
        });
        continue;
      }

      // Apply migration
      if (verbose) console.log(`Applying migration ${mig}...`);
      await pool.query(sql);

      const duration = Date.now() - startTime;
      results.push({
        number: mig,
        status: 'success',
        message: `✅ Applied in ${duration}ms`,
        duration_ms: duration,
      });
      console.log(`✅ Migration ${mig}: SUCCESS (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        number: mig,
        status: 'error',
        message: `❌ ${errorMsg}`,
        duration_ms: duration,
      });
      console.error(`❌ Migration ${mig}: ERROR`);
      if (verbose) console.error(`   ${errorMsg}\n`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}`);

  const applied = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`Total:      ${results.length}`);
  console.log(`Applied:    ${applied} ✅`);
  console.log(`Failed:     ${failed} ❌`);
  console.log(`Skipped:    ${skipped} ⏭️`);

  if (applied + skipped > 0) {
    const totalDuration = results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
    console.log(`Duration:   ${totalDuration}ms`);
  }

  console.log(`${'='.repeat(80)}\n`);

  // Exit code
  if (failed > 0) {
    console.log('💥 SOME MIGRATIONS FAILED');
    process.exit(1);
  }

  if (dryRun) {
    console.log('✅ DRY RUN OK — ready to apply for real');
    process.exit(0);
  }

  console.log('✅ ALL MIGRATIONS APPLIED SUCCESSFULLY');
  process.exit(0);
}

// Run
applyMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
