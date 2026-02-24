import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth'; // Предполагаем, что есть утилита для получения пользователя по токену
import db from '@/database'; // Ваш DB клиент

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { secret } = await request.json();
  // Сохраняем secret в БД (зашифрованный)
  await db.users.update(user.id, { mfaSecret: encrypt(secret) }); // Используйте crypto для encryption

  return NextResponse.json({ success: true });
}
