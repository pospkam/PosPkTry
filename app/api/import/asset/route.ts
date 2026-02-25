import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

async function fetchBytes(url: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return null
  const ct = r.headers.get('content-type') || 'application/octet-stream'
  const ab = await r.arrayBuffer()
  return { bytes: Buffer.from(ab), mime: ct }
}

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const url = String(body?.url || '').trim()
    const key = String(body?.key || '').trim() || 'kamchatka_button'
    if (!url) return NextResponse.json({ error: 'NO_URL' }, { status: 400 })

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return NextResponse.json({ error: 'NO_DATABASE_URL' }, { status: 500 })

    const file = await fetchBytes(url)
    if (!file) return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 400 })

    const sha = crypto.createHash('sha256').update(file.bytes).digest('hex')

    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()

    await client.query(`create table if not exists assets (
      id uuid primary key default gen_random_uuid(),
      key text unique not null,
      bytes bytea not null,
      mime text,
      sha256 text,
      source_url text,
      created_at timestamptz default now()
    );`)

    await client.query(
      `insert into assets(key, bytes, mime, sha256, source_url)
       values ($1,$2,$3,$4,$5)
       on conflict (key) do update set bytes=excluded.bytes, mime=excluded.mime, sha256=excluded.sha256, source_url=excluded.source_url, created_at=now()`,
      [key, file.bytes, file.mime, sha, url]
    )

    await client.end()
    return NextResponse.json({ ok: true, key, sha256: sha, mime: file.mime, bytes: file.bytes.length })
  } catch (e: any) {
    return NextResponse.json({ error: 'IMPORT_FAILED', message: e?.message || String(e) }, { status: 500 })
  }
}