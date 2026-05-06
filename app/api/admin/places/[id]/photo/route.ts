/**
 * POST /api/admin/places/[id]/photo
 *
 * Upload a photo for a place. Server-side resize to canonical 1280x720 via sharp,
 * UPSERT into ai_route_images (linked to place via route_id = places.ark_id).
 *
 * FormData:
 *   file — image (jpg/png/webp/heic), up to 20 MB
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const JPEG_QUALITY = 85;

interface Props { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id: placeId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(placeId)) {
    return NextResponse.json({ error: 'Неверный ID места' }, { status: 400 });
  }

  // Resolve ark_id (which is what ai_route_images.route_id references).
  const placeRow = await pool.query<{ ark_id: string | null; name: string }>(
    `SELECT ark_id, name FROM places WHERE id = $1 LIMIT 1`,
    [placeId],
  );
  if (placeRow.rows.length === 0) {
    return NextResponse.json({ error: 'Место не найдено' }, { status: 404 });
  }
  const arkId = placeRow.rows[0]!.ark_id;
  if (!arkId) {
    return NextResponse.json(
      { error: 'У места нет ark_id — невозможно привязать фото. Обратитесь к разработчику.' },
      { status: 422 },
    );
  }

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

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 20 МБ)' }, { status: 400 });
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Допустимые форматы: JPG, PNG, WebP, HEIC' },
      { status: 400 },
    );
  }

  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await sharp(input, { failOn: 'truncated' })
      .rotate() // honour EXIF orientation
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка обработки изображения';
    return NextResponse.json({ error: `Не удалось обработать файл: ${msg}` }, { status: 400 });
  }

  // UPSERT — replace existing AI-generated image if any.
  await pool.query(
    `INSERT INTO ai_route_images (route_id, image_data, mime_type, prompt, model, width, height)
     VALUES ($1, $2, 'image/jpeg', $3, 'manual-upload', $4, $5)
     ON CONFLICT (route_id) DO UPDATE
       SET image_data = EXCLUDED.image_data,
           mime_type  = EXCLUDED.mime_type,
           prompt     = EXCLUDED.prompt,
           model      = EXCLUDED.model,
           width      = EXCLUDED.width,
           height     = EXCLUDED.height,
           created_at = now()`,
    [arkId, processed, `manual upload by admin for ${placeRow.rows[0]!.name}`, TARGET_WIDTH, TARGET_HEIGHT],
  );

  return NextResponse.json({
    ok: true,
    placeId,
    arkId,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
    sizeKb: Math.round(processed.length / 1024),
    url: `/api/images/route/${arkId}?t=${Date.now()}`,
  });
}
