import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/database';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const mfaEnableLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

const MfaEnableSchema = z.object({
  secret: z.string().min(1, 'Укажите MFA secret'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!mfaEnableLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = MfaEnableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }

    const { secret } = parsed.data;

    // Сохраняем MFA secret в БД (в production — шифровать перед сохранением)
    await query(
      'UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2',
      [secret, auth.userId]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
