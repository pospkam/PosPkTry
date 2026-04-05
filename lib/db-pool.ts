/**
 * Shared Database Pool
 * Вынесен в отдельный файл для разрыва циклической зависимости:
 * lib/database.ts re-exports из lib/services.ts,
 * а lib/services.ts нужен pool — поэтому pool живёт здесь.
 */

import { Pool } from 'pg';
import { config } from '@/lib/config';

const useSSL = config.database.ssl || process.env.NODE_ENV === 'production';

function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  // Частая ошибка в env: значение оборачивают в кавычки
  return trimmed.replace(/^['"]+|['"]+$/g, '');
}

function sanitizeMalformedPostgresUrl(raw: string): string {
  const normalized = normalizeDatabaseUrl(raw);

  // Уже корректный DSN или не postgres-схема — возвращаем как есть.
  if (!/^postgres(ql)?:\/\//i.test(normalized)) {
    return normalized;
  }

  // Чиним случай, когда пароль содержит неэкранированные спецсимволы (#, @, >, и т.д.).
  // Используем greedy-парсинг до последнего '@' перед host:port.
  const m = normalized.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i);
  if (!m) {
    return normalized;
  }

  const [, scheme, username, passwordRaw, host, port, dbPart] = m;
  const safeUser = encodeURIComponent(username);
  const safePass = encodeURIComponent(passwordRaw);

  return `${scheme}${safeUser}:${safePass}@${host}:${port}/${dbPart}`;
}

function buildComponentFallback() {
  const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
  const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.PGDATABASE || process.env.DB_NAME || 'kamchatour';

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

function buildPoolConfig() {
  const rawDbUrl = normalizeDatabaseUrl(config.database.url || '');
  const dbUrl = sanitizeMalformedPostgresUrl(rawDbUrl);

  // Primary path: manual parse into components (stable even for malformed URL in env).
  const manual = rawDbUrl.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i)
    ?? dbUrl.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i);

  if (manual) {
    const [, , usernameRaw, passwordRaw, host, portRaw, dbPart] = manual;
    const decodeSafe = (v: string) => {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    };

    // dbPart может содержать query-параметры: "default_db?sslmode=require"
    const [dbName] = dbPart.split('?');

    return {
      user: decodeSafe(usernameRaw),
      password: decodeSafe(passwordRaw),
      host,
      port: parseInt(portRaw, 10),
      database: dbName,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

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

  // Если URL не похож на postgres-схему, используем компонентный fallback.
  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    return buildComponentFallback();
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
