import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Client } from 'pg'
import crypto from 'node:crypto'
import { requireAdmin } from '@/lib/auth/middleware'

export const runtime = 'nodejs'

const ImportAssetSchema = z.object({
  url: z.string().url('Некорректный URL'),
  key: z.string().min(1, 'Ключ обязателен').optional().default('kamchatka_button'),
})

async function fetchBytes(url: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return null
  const ct = r.headers.get('content-type') || 'application/octet-stream'
  const ab = await r.arrayBuffer()
  return { bytes: Buffer.from(ab), mime: ct }
}

/**
 * POST /api/import/asset - Импорт ассетов по URL
 * AUTH: requireAdmin — опасная операция, только админ
 */
export async function POST(req: NextRequest) {
  const adminOrResponse = await requireAdmin(req);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 })
    }

    const parsed = ImportAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { url, key } = parsed.data;

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
  } catch (e: unknown) {
    return NextResponse.json({ error: 'IMPORT_FAILED', message: e instanceof Error ? e.message : String(e) || String(e) }, { status: 500 })
  }
}