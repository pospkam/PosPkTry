/**
 * POST /api/upload/tour-photo
 * Upload a photo file for a tour. Accessible by operator and admin roles.
 * Returns the saved path that can be used as a tour photo URL.
 *
 * FormData fields:
 *   file — image file (jpg/png/webp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { isS3Configured, uploadToS3 } from '@/lib/storage/s3';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(request: NextRequest) {
  const authOrResponse = await requireRole(request, ['operator', 'admin', 'guide']);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Поле file обязательно' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
    return NextResponse.json({ error: 'Допустимые форматы: JPG, PNG, WebP' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 20 МБ)' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Safe filename: hash-based to avoid collisions
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const ext = path.extname(file.name).toLowerCase().replace('.jpeg', '.jpg') || '.jpg';
    const safeName = `tour_${hash}${ext}`;
    const s3Key = `images/tours/${safeName}`;

    let servePath: string;

    if (isS3Configured) {
      const result = await uploadToS3(s3Key, buffer, 'image/jpeg');
      servePath = result.url;
    } else {
      const toursDir = path.join(process.cwd(), 'public', 'images', 'tours');
      const tmpDir = path.join('/tmp', 'tourhab-uploads', 'images', 'tours');

      let outDir = toursDir;
      servePath = `/images/tours/${safeName}`;

      try {
        await fs.mkdir(toursDir, { recursive: true });
        await fs.access(toursDir, 2 /* W_OK */);
      } catch {
        outDir = tmpDir;
        servePath = `/api/photos/images/tours/${safeName}`;
        await fs.mkdir(tmpDir, { recursive: true });
      }

      await fs.writeFile(path.join(outDir, safeName), buffer);
    }

    return NextResponse.json({
      ok: true,
      url: servePath,
      filename: safeName,
      sizeKb: Math.round(buffer.length / 1024),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
