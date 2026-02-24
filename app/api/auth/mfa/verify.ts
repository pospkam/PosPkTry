import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { verifyMfaToken } from '@/lib/mfaUtils';
import db from '@/database';

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { token: mfaToken } = await request.json();
  const verified = verifyMfaToken(decrypt(user.mfaSecret), mfaToken); // decrypt из БД

  if (verified) {
    await db.users.update(user.id, { mfaEnabled: true });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: 'Invalid token' });
}
