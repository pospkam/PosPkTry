/**
 * POST /api/admin/videos/upload
 *
 * Загружает видео для категории карточки на главной странице.
 * Поля FormData:
 *   file     — видео (.webm / .mp4)
 *   category — slug категории (vulkani, rybalka, …)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import path from 'path';
import fs from 'fs/promises';
import { isS3Configured, uploadToS3 } from '@/lib/storage/s3';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = [
  'vulkani', 'geyzery', 'rybalka', 'termalnye_istochniki',
  'medvedi', 'morskie_progulki', 'vertoletnye_tury', 'trekking',
  'snegohod', 'dzhip', 'lakes', 'mountains', 'rivers', 'eco',
];

const ALLOWED_TYPES = ['video/webm', 'video/mp4', 'video/quicktime'];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const UploadSchema = z.object({
  category: z.string().refine(v => ALLOWED_CATEGORIES.includes(v), {
    message: 'Неизвестная категория',
  }),
});

export async function POST(request: NextRequest) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

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

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Только WebM или MP4' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 50 МБ)' }, { status: 400 });
  }

  const parsed = UploadSchema.safeParse({ category: formData.get('category') });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { category } = parsed.data;
  const ext = file.type === 'video/mp4' || file.type === 'video/quicktime' ? 'mp4' : 'webm';
  const filename = `${category}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let servePath: string;

    if (isS3Configured) {
      const result = await uploadToS3(`videos/${filename}`, buffer, file.type);
      servePath = result.url;
    } else {
      const videosDir = path.join(process.cwd(), 'public', 'videos');
      await fs.mkdir(videosDir, { recursive: true });
      await fs.writeFile(path.join(videosDir, filename), buffer);
      servePath = `/videos/${filename}`;
    }

    return NextResponse.json({
      ok: true,
      category,
      filename,
      servePath,
      sizeKb: Math.round(buffer.length / 1024),
      format: ext,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
