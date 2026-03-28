/**
 * Apply a SQL migration file directly to the database.
 * Usage: node scripts/apply-migration.mjs migrations/108_fix_zero_coordinates.sql
 */
import pg from 'pg';
import fs from 'fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/apply-migration.mjs <file.sql>'); process.exit(1); }

const sql = fs.readFileSync(file, 'utf8');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const result = await pool.query(sql);
  const affected = Array.isArray(result) ? result.map(r => r.rowCount).join(', ') : result.rowCount;
  console.log(`Applied ${file} — rows affected: ${affected}`);
} finally {
  await pool.end();
}
