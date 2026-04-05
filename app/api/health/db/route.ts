import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db-pool'

export const runtime = 'nodejs'

// AUTH: Public — infra/utility endpoint for DB connectivity check
export async function GET(_req: NextRequest) {
  try {
    const tables = await pool.query(
      `select table_schema, table_name
         from information_schema.tables
        where table_schema not in ('pg_catalog','information_schema')
        order by 1,2`)
    const rows = await pool.query(
      `select relname as table, reltuples::bigint as approx_rows
         from pg_class where relkind='r' order by 1`)
    return NextResponse.json({ tables: tables.rows, approx: rows.rows })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'DB_FAILED', message: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}