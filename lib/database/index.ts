import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const query = async <T = Record<string, any>>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: Number(result.rowCount || 0) };
  } finally {
    client.release();
  }
};
