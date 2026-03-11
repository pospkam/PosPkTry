import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth/middleware';

/** Only these env var names may be written via this endpoint. */
const ALLOWED_TOKEN_TYPES = new Set(['TIMEWEB_TOKEN']);

export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }

    const { token, type } = await request.json();

    if (!token || !type) {
      return NextResponse.json({ error: 'Missing token or type' }, { status: 400 });
    }

    // Whitelist: only pre-approved env var names are writable
    if (!ALLOWED_TOKEN_TYPES.has(String(type))) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 });
    }

    // Prevent newline injection into .env.local
    const safeToken = String(token);
    if (/[\r\n]/.test(safeToken)) {
      return NextResponse.json({ error: 'Token must not contain newlines' }, { status: 400 });
    }

    const envPath = join(process.cwd(), '.env.local');
    const content = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';

    const lines = content.split('\n');
    let found = false;
    const newLines = lines.map(line => {
      if (line.startsWith(`${type}=`)) {
        found = true;
        return `${type}=${safeToken}`;
      }
      return line;
    });

    if (!found) {
      newLines.push(`${type}=${safeToken}`);
    }

    writeFileSync(envPath, newLines.join('\n'));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}
