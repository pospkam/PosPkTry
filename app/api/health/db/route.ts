import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export const runtime = 'nodejs'

// AUTH: Public — infra/utility endpoint for DB connectivity check
export async function GET(_req: NextRequest) {
  const raw = process.env.DATABASE_URL || '';
  const m = raw.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i);

  if (!raw) {
    return NextResponse.json({ ok: false, error: 'NO_DATABASE_URL' }, { status: 500 });
  }

  if (!m) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MALFORMED_DATABASE_URL',
        diagnostics: {
          length: raw.length,
          startsWith: raw.slice(0, 32),
          hasHash: raw.includes('#'),
          hasAt: raw.includes('@'),
          hasSpace: /\s/.test(raw),
        },
      },
      { status: 500 }
    );
  }

  const [, , userRaw, passRaw, host, portRaw, dbPart] = m;
  const decodeSafe = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };

  const client = new Client({
    host,
    port: parseInt(portRaw, 10),
    user: decodeSafe(userRaw),
    password: decodeSafe(passRaw),
    database: dbPart,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const ping = await client.query('select 1 as ok');
    return NextResponse.json({ ok: true, ping: ping.rows[0] })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'DB_FAILED', message: e instanceof Error ? e.message : String(e) }, { status: 500 })
  } finally {
    try { await client.end() } catch {}
  }
}