import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { secret } = await request.json();
    if (!secret || typeof secret !== 'string') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 400 });
    }

    // Сохраняем MFA secret в БД (в production — шифровать перед сохранением)
    await query(
      'UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2',
      [secret, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
