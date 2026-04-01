/**
 * POST /api/hub/operator/upload
 * Загружает фото тура в S3. Возвращает публичный URL.
 * Auth: operator или admin.
 * Limit: 5 MB, только image/*.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { uploadToS3, isS3Configured } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  if (!isS3Configured) {
    return NextResponse.json(
      { success: false, error: 'Хранилище не настроено. Обратитесь к администратору.' },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Неверный запрос' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, error: 'Файл не передан' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: 'Допустимы только JPEG, PNG, WebP' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: 'Файл слишком большой. Максимум 5 MB.' },
      { status: 400 }
    );
  }

  const ext = file.type.split('/')[1] ?? 'jpg';
  const key = `tours/${authOrResponse.userId}/${Date.now()}.${ext}`;

  try {
    const result = await uploadToS3(key, buffer, file.type);
    return NextResponse.json({ success: true, url: result.url });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}
