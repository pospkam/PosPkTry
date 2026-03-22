import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

/** Only these env var names may be written via this endpoint. */
const ALLOWED_TOKEN_TYPES = new Set(['TIMEWEB_TOKEN']);

const SaveTokenSchema = z.object({
  token: z.string().min(1, 'Токен обязателен').refine(val => !/[\r\n]/.test(val), 'Токен не должен содержать переносы строк'),
  type: z.enum(['TIMEWEB_TOKEN'], { errorMap: () => ({ message: 'Недопустимый тип токена' }) }),
});

export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }

    const body = await request.json();
    const parsed = SaveTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const { token, type } = parsed.data;

    const safeToken = token;

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
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}
