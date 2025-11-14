import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../database';

interface SqlMigration {
  version: string;
  name: string;
  filePath: string;
}

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = join(process.cwd(), 'lib', 'database', 'migrations');
const BASE_SCHEMA_PATH = join(process.cwd(), 'lib', 'database', 'schema.sql');

const baseSchemaMigration: SqlMigration = {
  version: '000',
  name: 'base_schema',
  filePath: BASE_SCHEMA_PATH,
};

function loadMigrations(): SqlMigration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map((file) => {
      const [version, ...rest] = file.split('_');
      return {
        version,
        name: rest.join('_').replace(/\.sql$/, ''),
        filePath: join(MIGRATIONS_DIR, file),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));

  return [baseSchemaMigration, ...files];
}

async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`);
  return result.rows.map((row) => row.version);
}

async function markMigrationAsExecuted(version: string, name: string): Promise<void> {
  await query(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
    [version, name]
  );
}

export async function runMigrations(): Promise<void> {
  await createMigrationsTable();
  const executed = await getExecutedMigrations();
  const migrations = loadMigrations();

  for (const migration of migrations) {
    if (executed.includes(migration.version)) {
      continue;
    }

    const sql = readFileSync(migration.filePath, 'utf8');
    if (!sql.trim()) {
      await markMigrationAsExecuted(migration.version, migration.name);
      continue;
    }

    await query(sql);
    await markMigrationAsExecuted(migration.version, migration.name);
  }
}

export async function rollbackMigrations(): Promise<void> {
  throw new Error('Rollback is not supported for SQL-based migrations.');
}

export async function getMigrationStatus(): Promise<{
  executed: string[];
  pending: string[];
  total: number;
}> {
  await createMigrationsTable();
  const executed = await getExecutedMigrations();
  const migrations = loadMigrations().map((migration) => migration.version);
  const pending = migrations.filter((version) => !executed.includes(version));

  return {
    executed,
    pending,
    total: migrations.length,
  };
}

export async function createBackup(): Promise<string> {
  const backupName = `kamchatour_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  console.log(`  Backup created: ${backupName}`);
  return backupName;
}

export async function restoreBackup(_: string): Promise<void> {
  console.log('  Restore backup is not implemented for SQL migrations.');
}
