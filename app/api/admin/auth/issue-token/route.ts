/**
 * POST /api/admin/auth/issue-token
 * Выдать admin JWT для разовых операций обслуживания
 * Защита: только по спец ключу из env
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';

const TokenSchema = z.object({
  secret: z.string().min(20),
  expiresIn: z.number().min(60).max(86400).default(3600),
});

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_TOKEN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_TOKEN_SECRET not configured' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Проверка спец ключа (timing-safe против brute-force атаки)
  const a = Buffer.from(adminSecret);
  const b = Buffer.from(parsed.data.secret);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return NextResponse.json({ error: 'JWT_SECRET not configured' }, { status: 500 });
  }

  try {
    const payload = {
      userId: 'admin-maintenance',
      email: 'system@tourhab.ru',
      role: 'admin',
    };

    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + parsed.data.expiresIn)
      .sign(secret);

    return NextResponse.json({
      success: true,
      token,
      expiresIn: parsed.data.expiresIn,
      type: 'Bearer',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Token generation failed' },
      { status: 500 }
    );
  }
}
