import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/database';
import * as TOTP from 'totp-generator';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { token: mfaToken } = await request.json();
    if (!mfaToken || typeof mfaToken !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Получаем сохранённый MFA secret из БД
    const result = await query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [session.user.id]
    );

    const user = result.rows[0];
    if (!user?.mfa_secret) {
      return NextResponse.json({ error: 'MFA not configured' }, { status: 400 });
    }

    // Проверяем TOTP-токен (используем secret напрямую — в production шифровать)
    const { otp } = TOTP.TOTP.generate(user.mfa_secret);
    const verified = otp === mfaToken;

    if (verified) {
      await query(
        'UPDATE users SET mfa_enabled = true WHERE id = $1',
        [session.user.id]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
  } catch (error) {
    console.error('[MFA_VERIFY]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}