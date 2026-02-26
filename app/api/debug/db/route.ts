import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/db
 * Diagnosticheskij endpoint: proverka podklyucheniya k baze.
 * Udalit' posle otladki!
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const dbSsl = process.env.DATABASE_SSL || 'NOT SET';
  const nodeEnv = process.env.NODE_ENV || 'NOT SET';

  // Maskiruem parol' v URL
  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':***@');

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: nodeEnv === 'production' || dbSsl === 'true'
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 10000,
    });

    const result = await pool.query('SELECT current_database() as db, now() as time');
    await pool.end();

    return NextResponse.json({
      status: 'connected',
      database: result.rows[0].db,
      time: result.rows[0].time,
      env: {
        DATABASE_URL: maskedUrl,
        DATABASE_SSL: dbSsl,
        NODE_ENV: nodeEnv,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      error: errMsg,
      env: {
        DATABASE_URL: maskedUrl,
        DATABASE_SSL: dbSsl,
        NODE_ENV: nodeEnv,
      },
    }, { status: 500 });
  }
}
