import { Pool, PoolClient } from 'pg';
import { config } from '@/lib/config';

// Создаем пул соединений с базой данных
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20, // Максимальное количество соединений
  idleTimeoutMillis: 30000, // Таймаут неактивных соединений
  connectionTimeoutMillis: 2000, // Таймаут установки соединения
});

// Экспортируем функцию для получения пула (для миграционных скриптов)
export function getPool(): Pool {
  return pool;
}

// Интерфейс для результата запроса
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
  command: string;
}

// Функция для выполнения запросов
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Функция для выполнения транзакций
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Функция для проверки соединения с БД
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Функция для получения информации о таблицах
export async function getTableInfo(): Promise<QueryResult<{
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}>> {
  return query(`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
}

// Функция для получения статистики таблиц
export async function getTableStats(): Promise<QueryResult<{
  table_name: string;
  row_count: number;
  table_size: string;
}>> {
  return query(`
    SELECT 
      schemaname,
      tablename as table_name,
      n_tup_ins + n_tup_upd + n_tup_del as row_count,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
    FROM pg_stat_user_tables
    ORDER BY tablename
  `);
}

// Функция для создания индексов
export async function createIndexes(): Promise<void> {
  const indexes = [
    // Индексы для таблицы activities
    'CREATE INDEX IF NOT EXISTS idx_activities_key ON activities(key)',
    'CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)',
    
    // Индексы для таблицы partners
    'CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category)',
    'CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at)',
    
    // Индексы для таблицы assets
    'CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON assets(sha256)',
    'CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at)',
  ];

  for (const indexQuery of indexes) {
    try {
      await query(indexQuery);
      console.log(`Index created: ${indexQuery}`);
    } catch (error) {
      console.error(`Failed to create index: ${indexQuery}`, error);
    }
  }
}

// Функция для очистки старых данных
export async function cleanupOldData(): Promise<void> {
  const cleanupQueries = [
    // Удаляем старые сессии (старше 30 дней)
    `DELETE FROM user_sessions WHERE created_at < NOW() - INTERVAL '30 days'`,
    
    // Удаляем старые логи (старше 90 дней)
    `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'`,
  ];

  for (const cleanupQuery of cleanupQueries) {
    try {
      const result = await query(cleanupQuery);
      console.log(`Cleanup completed: ${result.rowCount} rows affected`);
    } catch (error) {
      console.error(`Cleanup failed: ${cleanupQuery}`, error);
    }
  }
}

// Функция для получения метрик производительности
export async function getPerformanceMetrics(): Promise<QueryResult<{
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  min_time: number;
  max_time: number;
}>> {
  return query(`
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      min_time,
      max_time
    FROM pg_stat_statements
    ORDER BY total_time DESC
    LIMIT 10
  `);
}

// Функция для мониторинга активных соединений
export async function getActiveConnections(): Promise<QueryResult<{
  pid: number;
  usename: string;
  application_name: string;
  client_addr: string;
  state: string;
  query_start: Date;
  query: string;
}>> {
  return query(`
    SELECT 
      pid,
      usename,
      application_name,
      client_addr,
      state,
      query_start,
      query
    FROM pg_stat_activity
    WHERE state = 'active'
    ORDER BY query_start DESC
  `);
}

// Функция для проверки целостности данных
export async function checkDataIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // Проверяем дубликаты в activities
    const duplicateActivities = await query(`
      SELECT key, COUNT(*) as count
      FROM activities
      GROUP BY key
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateActivities.rows.length > 0) {
      issues.push(`Found ${duplicateActivities.rows.length} duplicate activity keys`);
    }
    
    // Проверяем дубликаты в partners
    const duplicatePartners = await query(`
      SELECT name, category, COUNT(*) as count
      FROM partners
      GROUP BY name, category
      HAVING COUNT(*) > 1
    `);
    
    if (duplicatePartners.rows.length > 0) {
      issues.push(`Found ${duplicatePartners.rows.length} duplicate partner names`);
    }
    
    // Проверяем ссылочную целостность
    const orphanedAssets = await query(`
      SELECT COUNT(*) as count
      FROM assets a
      LEFT JOIN activities act ON a.id = act.icon_asset_id
      LEFT JOIN partners p ON a.id = p.logo_asset_id
      WHERE act.id IS NULL AND p.id IS NULL
    `);
    
    if (orphanedAssets.rows[0].count > 0) {
      issues.push(`Found ${orphanedAssets.rows[0].count} orphaned assets`);
    }
    
  } catch (error) {
    issues.push(`Data integrity check failed: ${error}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Функция для экспорта данных
export async function exportData(tableName: string): Promise<QueryResult<any>> {
  return query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
}

// Функция для импорта данных
export async function importData(
  tableName: string,
  data: any[],
  columns: string[]
): Promise<void> {
  if (data.length === 0) return;
  
  const placeholders = data.map((_, index) => {
    const rowPlaceholders = columns.map((_, colIndex) => 
      `$${index * columns.length + colIndex + 1}`
    ).join(', ');
    return `(${rowPlaceholders})`;
  }).join(', ');
  
  const queryText = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES ${placeholders}
    ON CONFLICT DO NOTHING
  `;
  
  const values = data.flatMap(row => columns.map(col => row[col]));
  
  await query(queryText, values);
}

// Закрытие пула соединений
export async function closePool(): Promise<void> {
  await pool.end();
}

// Экспорт пула для прямого использования
export { pool };