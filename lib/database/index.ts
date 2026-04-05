import { pool } from '@/lib/db-pool';

export const query = async <T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: Number(result.rowCount || 0) };
  } finally {
    client.release();
  }
};
