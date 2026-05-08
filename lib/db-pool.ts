/**
 * Shared Database Pool — LAZY initialization
 * Не создаёт подключение к БД при импорте модуля.
 * Подключение происходит только при первом запросе.
 * Критично для Timeweb: сервер должен стартовать <3 мин.
 */

import { Pool } from 'pg';
import { config } from '@/lib/config';

const useSSL = config.database.ssl || process.env.NODE_ENV === 'production';

function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.replace(/^['"]+|['"]+$/g, '');
}

function sanitizeMalformedPostgresUrl(raw: string): string {
  const normalized = normalizeDatabaseUrl(raw);
  if (!/^postgres(ql)?:\/\//i.test(normalized)) return normalized;
  const m = normalized.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i);
  if (!m) return normalized;
  const [, scheme, usernameRaw, passwordRaw, host, port, dbPart] = m;
  return `${scheme}${encodeURIComponent(usernameRaw)}:${encodeURIComponent(passwordRaw)}@${host}:${port}/${dbPart}`;
}

function buildPoolConfig() {
  const rawDbUrl = normalizeDatabaseUrl(config.database.url || '');
  const dbUrl = sanitizeMalformedPostgresUrl(rawDbUrl);
  const manual = rawDbUrl.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i)
    ?? dbUrl.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i);

  if (manual) {
    const [, , usernameRaw, passwordRaw, host, portRaw, dbPart] = manual;
    const decodeSafe = (v: string) => { try { return decodeURIComponent(v); } catch { return v; } };
    const [dbName] = dbPart.split('?');
    return { user: decodeSafe(usernameRaw), password: decodeSafe(passwordRaw), host, port: parseInt(portRaw, 10), database: dbName, ssl: useSSL ? { rejectUnauthorized: false } : false, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };
  }

  try {
    const parsed = new URL(dbUrl);
    if (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') {
      return { user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), host: parsed.hostname, port: parsed.port ? parseInt(parsed.port, 10) : 5432, database: parsed.pathname.replace(/^\//, ''), ssl: useSSL ? { rejectUnauthorized: false } : false, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };
    }
  } catch { /* fall through */ }

  return { connectionString: dbUrl, ssl: useSSL ? { rejectUnauthorized: false } : false, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };
}

// Lazy pool — connection created only on first use
let _pool: Pool | null = null;
function getPool(): Pool { if (!_pool) _pool = new Pool(buildPoolConfig()); return _pool; }

export const pool = {
  connect: (...args: unknown[]) => getPool().connect(...args as [any]),
  query: (...args: unknown[]) => getPool().query(...args as [string, unknown[]?]),
  end: () => _pool?.end(),
  on: (...args: unknown[]) => getPool().on(...args as ['error' | 'connect' | 'acquire' | 'remove' | 'release', (...args: unknown[]) => void]),
} as unknown as Pool;
