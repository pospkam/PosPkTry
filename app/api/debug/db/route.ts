import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const nodeEnv = process.env.NODE_ENV || 'NOT SET';

  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':***@');

  try {
    const { Pool } = require('pg');

    const match = dbUrl.match(/^postgresql:\/\/([^:]+):(.+)@([^:\/]+):?(\d+)?\/(.+?)(\?.*)?$/);
    let poolConfig;

    if (match) {
      poolConfig = {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4] || '5432'),
        database: match[5],
        ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
      };
    } else {
      poolConfig = {
        connectionString: dbUrl,
        ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
      };
    }

    const pool = new Pool(poolConfig);
    const result = await pool.query('SELECT current_database() as db, now() as time');
    await pool.end();

    return NextResponse.json({
      status: 'connected',
      database: result.rows[0].db,
      time: result.rows[0].time,
      env: { DATABASE_URL: maskedUrl, NODE_ENV: nodeEnv },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown',
      env: { DATABASE_URL: maskedUrl, NODE_ENV: nodeEnv },
    }, { status: 500 });
  }
}
