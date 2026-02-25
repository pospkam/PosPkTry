import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export const runtime = 'nodejs'

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(_req: NextRequest) {
  const url = process.env.DATABASE_URL
  if (!url) return NextResponse.json({ error: 'NO_DATABASE_URL' }, { status: 500 })
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const tables = await client.query(
      `select table_schema, table_name
         from information_schema.tables
        where table_schema not in ('pg_catalog','information_schema')
        order by 1,2`)
    const rows = await client.query(
      `select relname as table, reltuples::bigint as approx_rows
         from pg_class where relkind='r' order by 1`)
    return NextResponse.json({ tables: tables.rows, approx: rows.rows })
  } catch (e: any) {
    return NextResponse.json({ error: 'DB_FAILED', message: e?.message }, { status: 500 })
  } finally {
    try { await client.end() } catch {}
  }
}