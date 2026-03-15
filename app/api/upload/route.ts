import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { isS3Configured, uploadToS3 } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload - Загрузка изображений
 * AUTH: requireAuth — только авторизованные пользователи
 * Storage: S3 (production) → public/uploads/ (dev fallback)
 */
export async function POST(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Файлы не найдены'
      } as ApiResponse<null>, { status: 400 });
    }

    const uploadedFiles: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({
          success: false,
          error: 'Файл слишком большой (максимум 5MB)'
        } as ApiResponse<null>, { status: 400 });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop() ?? 'jpg';
      const filename = `${timestamp}-${randomStr}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      if (isS3Configured) {
        const key = `uploads/${filename}`;
        const contentType = file.type || 'image/jpeg';
        const result = await uploadToS3(key, buffer, contentType);
        uploadedFiles.push(result.url);
      } else {
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch {
          // dir exists
        }
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);
        uploadedFiles.push(`/uploads/${filename}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      },
      message: 'Файлы успешно загружены'
    } as ApiResponse<unknown>);

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при загрузке файлов'
    } as ApiResponse<null>, { status: 500 });
  }
}
