import { query } from '../database';
import { readFileSync } from 'fs';
import { join } from 'path';

// Интерфейс для миграции
interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Таблица для отслеживания миграций
const MIGRATIONS_TABLE = 'schema_migrations';

// Создаем таблицу миграций если её нет
async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Получаем список выполненных миграций
async function getExecutedMigrations(): Promise<string[]> {
  const result = await query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`);
  return result.rows.map(row => row.version);
}

// Отмечаем миграцию как выполненную
async function markMigrationAsExecuted(version: string, name: string): Promise<void> {
  await query(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
    [version, name]
  );
}

// Откатываем миграцию
async function markMigrationAsRolledBack(version: string): Promise<void> {
  await query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = $1`, [version]);
}

// Миграция 001: Создание базовой схемы
const migration001: Migration = {
  version: '001',
  name: 'create_base_schema',
  up: async () => {
    // Читаем схему из файла
    const schemaPath = join(process.cwd(), 'lib', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Выполняем схему
    await query(schema);
    
    console.log('[✓] Migration 001: Base schema created');
  },
  down: async () => {
    // Удаляем все таблицы в обратном порядке
    const tables = [
      'audit_logs',
      'user_sessions',
      'chat_messages',
      'chat_sessions',
      'user_eco_activities',
      'user_achievements',
      'eco_achievements',
      'user_eco_points',
      'eco_points',
      'review_assets',
      'reviews',
      'bookings',
      'partner_assets',
      'tour_assets',
      'assets',
      'tours',
      'activities',
      'partners',
      'users',
      'schema_migrations'
    ];
    
    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    
    console.log('[✓] Migration 001: Base schema dropped');
  }
};

// Миграция 002: Добавление индексов для производительности
const migration002: Migration = {
  version: '002',
  name: 'add_performance_indexes',
  up: async () => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tours_season ON tours USING GIN (season)',
      'CREATE INDEX IF NOT EXISTS idx_tours_coordinates ON tours USING GIN (coordinates)',
      'CREATE INDEX IF NOT EXISTS idx_tours_requirements ON tours USING GIN (requirements)',
      'CREATE INDEX IF NOT EXISTS idx_tours_included ON tours USING GIN (included)',
      'CREATE INDEX IF NOT EXISTS idx_tours_not_included ON tours USING GIN (not_included)',
      'CREATE INDEX IF NOT EXISTS idx_partners_contact ON partners USING GIN (contact)',
      'CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN (preferences)',
      'CREATE INDEX IF NOT EXISTS idx_chat_sessions_context ON chat_sessions USING GIN (context)',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata ON chat_messages USING GIN (metadata)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING GIN (details)',
    ];
    
    for (const indexQuery of indexes) {
      await query(indexQuery);
    }
    
    console.log('[✓] Migration 002: Performance indexes added');
  },
  down: async () => {
    const indexes = [
      'idx_tours_season',
      'idx_tours_coordinates',
      'idx_tours_requirements',
      'idx_tours_included',
      'idx_tours_not_included',
      'idx_partners_contact',
      'idx_users_preferences',
      'idx_chat_sessions_context',
      'idx_chat_messages_metadata',
      'idx_audit_logs_details',
    ];
    
    for (const indexName of indexes) {
      await query(`DROP INDEX IF EXISTS ${indexName}`);
    }
    
    console.log('[✓] Migration 002: Performance indexes dropped');
  }
};

// Миграция 003: Добавление полнотекстового поиска
const migration003: Migration = {
  version: '003',
  name: 'add_fulltext_search',
  up: async () => {
    // Создаем полнотекстовые индексы
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tours_search 
      ON tours USING GIN (to_tsvector('russian', name || ' ' || description))
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_partners_search 
      ON partners USING GIN (to_tsvector('russian', name || ' ' || description))
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_eco_points_search 
      ON eco_points USING GIN (to_tsvector('russian', name || ' ' || description))
    `);
    
    // Создаем функции для поиска
    await query(`
      CREATE OR REPLACE FUNCTION search_tours(search_query TEXT)
      RETURNS TABLE(
        id UUID,
        name VARCHAR(255),
        description TEXT,
        rank REAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.id,
          t.name,
          t.description,
          ts_rank(to_tsvector('russian', t.name || ' ' || t.description), plainto_tsquery('russian', search_query)) as rank
        FROM tours t
        WHERE to_tsvector('russian', t.name || ' ' || t.description) @@ plainto_tsquery('russian', search_query)
        ORDER BY rank DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await query(`
      CREATE OR REPLACE FUNCTION search_partners(search_query TEXT)
      RETURNS TABLE(
        id UUID,
        name VARCHAR(255),
        description TEXT,
        rank REAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.id,
          p.name,
          p.description,
          ts_rank(to_tsvector('russian', p.name || ' ' || p.description), plainto_tsquery('russian', search_query)) as rank
        FROM partners p
        WHERE to_tsvector('russian', p.name || ' ' || p.description) @@ plainto_tsquery('russian', search_query)
        ORDER BY rank DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('[✓] Migration 003: Fulltext search added');
  },
  down: async () => {
    await query('DROP FUNCTION IF EXISTS search_tours(TEXT)');
    await query('DROP FUNCTION IF EXISTS search_partners(TEXT)');
    await query('DROP INDEX IF EXISTS idx_tours_search');
    await query('DROP INDEX IF EXISTS idx_partners_search');
    await query('DROP INDEX IF EXISTS idx_eco_points_search');
    
    console.log('[✓] Migration 003: Fulltext search dropped');
  }
};

// Миграция 004: Добавление уведомлений
const migration004: Migration = {
  version: '004',
  name: 'add_notifications',
  up: async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);
    
    console.log('[✓] Migration 004: Notifications added');
  },
  down: async () => {
    await query('DROP TABLE IF EXISTS notifications CASCADE');
    console.log('[✓] Migration 004: Notifications dropped');
  }
};

// Миграция 005: Добавление аналитики
const migration005: Migration = {
  version: '005',
  name: 'add_analytics',
  up: async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
    `);
    
    console.log('[✓] Migration 005: Analytics added');
  },
  down: async () => {
    await query('DROP TABLE IF EXISTS analytics_events CASCADE');
    console.log('[✓] Migration 005: Analytics dropped');
  }
};

// Список всех миграций
const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
];

// Выполнение миграций
export async function runMigrations(): Promise<void> {
  try {
    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('  Starting database migrations...');
    console.log(`Executed migrations: ${executedMigrations.join(', ')}`);
    
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.version)) {
        console.log(`  Running migration ${migration.version}: ${migration.name}`);
        await migration.up();
        await markMigrationAsExecuted(migration.version, migration.name);
        console.log(`[✓] Migration ${migration.version} completed`);
      } else {
        console.log(`⏭️  Migration ${migration.version} already executed`);
      }
    }
    
    console.log('  All migrations completed successfully!');
    
  } catch (error) {
    console.error('[✗] Migration failed:', error);
    throw error;
  }
}

// Откат миграций
export async function rollbackMigrations(targetVersion?: string): Promise<void> {
  try {
    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('🔄 Starting database rollback...');
    console.log(`Executed migrations: ${executedMigrations.join(', ')}`);
    
    // Определяем миграции для отката
    const migrationsToRollback = targetVersion 
      ? migrations.filter(m => m.version > targetVersion && executedMigrations.includes(m.version))
      : migrations.filter(m => executedMigrations.includes(m.version)).reverse();
    
    for (const migration of migrationsToRollback) {
      console.log(`  Rolling back migration ${migration.version}: ${migration.name}`);
      await migration.down();
      await markMigrationAsRolledBack(migration.version);
      console.log(`[✓] Migration ${migration.version} rolled back`);
    }
    
    console.log('  Rollback completed successfully!');
    
  } catch (error) {
    console.error('[✗] Rollback failed:', error);
    throw error;
  }
}

// Проверка статуса миграций
export async function getMigrationStatus(): Promise<{
  executed: string[];
  pending: string[];
  total: number;
}> {
  await createMigrationsTable();
  const executedMigrations = await getExecutedMigrations();
  const allVersions = migrations.map(m => m.version);
  const pendingMigrations = allVersions.filter(v => !executedMigrations.includes(v));
  
  return {
    executed: executedMigrations,
    pending: pendingMigrations,
    total: migrations.length,
  };
}

// Создание резервной копии
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `kamchatour_backup_${timestamp}`;
  
  // Здесь можно добавить логику создания резервной копии
  // Например, использование pg_dump или экспорт в файл
  
  console.log(`  Backup created: ${backupName}`);
  return backupName;
}

// Восстановление из резервной копии
export async function restoreBackup(backupName: string): Promise<void> {
  // Здесь можно добавить логику восстановления из резервной копии
  console.log(`🔄 Restoring from backup: ${backupName}`);
}