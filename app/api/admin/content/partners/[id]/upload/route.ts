import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { uploadToS3, deleteFromS3 } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * POST /api/admin/content/partners/[id]/upload
 * Загрузка hero или logo изображения партнёра в S3.
 * Body: multipart/form-data — поля: file (File), type ('hero' | 'logo')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Файл не передан' }, { status: 400 });
    }
    if (type !== 'hero' && type !== 'logo') {
      return NextResponse.json({ success: false, error: 'Некорректный тип: hero или logo' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Формат не поддерживается. Используйте JPEG, PNG или WebP' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Файл слишком большой (максимум 5 МБ)' }, { status: 400 });
    }

    // Verify partner exists and get current image URLs for cleanup
    const existing = await query<{ hero_image: string | null; logo_image: string | null }>(
      'SELECT hero_image, logo_image FROM partners WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Партнёр не найден' }, { status: 404 });
    }
    const row = existing.rows[0];

    // Build S3 key
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const s3Key = `partners/${id}/${type}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToS3(s3Key, buffer, file.type);

    // Update DB column
    const column = type === 'hero' ? 'hero_image' : 'logo_image';
    await query(`UPDATE partners SET ${column} = $1, updated_at = NOW() WHERE id = $2`, [url, id]);

    // Delete old S3 object if it was uploaded before (contains our S3 endpoint)
    const oldUrl = type === 'hero' ? row.hero_image : row.logo_image;
    if (oldUrl?.includes('/partners/')) {
      const oldKey = oldUrl.split(`/${process.env.S3_BUCKET}/`)[1];
      if (oldKey) {
        await deleteFromS3(oldKey).catch(() => { /* ignore cleanup errors */ });
      }
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки файла', details: safeMsg(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/content/partners/[id]/upload
 * Удаление hero или logo изображения партнёра.
 * Body: { type: 'hero' | 'logo' }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;
    const body = await request.json() as { type?: string };
    const type = body.type;

    if (type !== 'hero' && type !== 'logo') {
      return NextResponse.json({ success: false, error: 'Некорректный тип: hero или logo' }, { status: 400 });
    }

    const column = type === 'hero' ? 'hero_image' : 'logo_image';
    const existing = await query<{ hero_image: string | null; logo_image: string | null }>(
      'SELECT hero_image, logo_image FROM partners WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Партнёр не найден' }, { status: 404 });
    }

    const oldUrl = type === 'hero' ? existing.rows[0].hero_image : existing.rows[0].logo_image;
    if (oldUrl?.includes('/partners/')) {
      const oldKey = oldUrl.split(`/${process.env.S3_BUCKET}/`)[1];
      if (oldKey) await deleteFromS3(oldKey).catch(() => { /* ignore */ });
    }

    await query(`UPDATE partners SET ${column} = NULL, updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка удаления', details: safeMsg(error) },
      { status: 500 }
    );
  }
}
