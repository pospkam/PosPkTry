import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/jwt';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const EarnSchema = z.object({
  source: z.enum(['review', 'photo', 'first_booking']),
  entityId: z.string().optional(),
});

/**
 * POST /api/loyalty/earn — начислить баллы за активность
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    if (!limiter.check(ip)) {
      return NextResponse.json({ success: false, error: 'Слишком много запросов' }, { status: 429 });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = EarnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Некорректные данные', details: parsed.error.flatten() }, { status: 400 });
    }

    const { source, entityId } = parsed.data;
    const result = await loyaltySystem.earnActivityPoints(user.userId, source, entityId);

    return NextResponse.json({ success: result.success, data: result }, { status: result.success ? 200 : 409 });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка начисления баллов' }, { status: 500 });
  }
}
