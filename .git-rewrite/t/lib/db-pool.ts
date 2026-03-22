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

  // Парсим URL вручную для поддержки спецсимволов в пароле
  const match = dbUrl.match(/^postgresql:\/\/([^:]+):(.+)@([^:\/]+):?(\d+)?\/(.+?)(\?.*)?$/);
  if (match) {
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4] || '5432'),
      database: match[5],
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
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
