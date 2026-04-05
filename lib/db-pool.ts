/**
 * Shared Database Pool
 * Вынесен в отдельный файл для разрыва циклической зависимости:
 * lib/database.ts re-exports из lib/services.ts,
 * а lib/services.ts нужен pool — поэтому pool живёт здесь.
 */

import { Pool } from 'pg';
import { config } from '@/lib/config';

const useSSL = config.database.ssl || process.env.NODE_ENV === 'production';

function buildPoolConfig() {
  const dbUrl = config.database.url;

  // Надежный парсинг URL: корректно обрабатывает URL-encoded username/password.
  // Это критично для паролей со спецсимволами.
  try {
    const parsed = new URL(dbUrl);
    if (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') {
      return {
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 5432,
        database: parsed.pathname.replace(/^\//, ''),
        ssl: useSSL ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    }
  } catch {
    // Fallback ниже на connectionString
  }

  // Fallback: стандартный connectionString (для URL без спецсимволов)
  return {
    connectionString: dbUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export const pool = new Pool(buildPoolConfig());
