import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const raw = process.env.DATABASE_URL || '';
  const trimmed = raw.trim();

  const regex = /^(postgres(?:ql)?:\/\/)([^:/?#]+):(.+)@([^:/?#]+):(\d+)\/(.+)$/i;
  const m = trimmed.match(regex);

  const masked = (() => {
    if (!m) return null;
    const [, scheme, user, pass, host, port, db] = m;
    return {
      scheme,
      userPrefix: user.slice(0, 2),
      passPrefix: pass.slice(0, 2),
      passLen: pass.length,
      host,
      port,
      db,
    };
  })();

  return NextResponse.json({
    hasValue: Boolean(raw),
    length: raw.length,
    startsWith: raw.slice(0, 20),
    hasHash: raw.includes('#'),
    hasAt: raw.includes('@'),
    hasSpace: /\s/.test(raw),
    regexMatch: Boolean(m),
    parsedMasked: masked,
  });
}
