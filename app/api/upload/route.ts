import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload - Загрузка изображений
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
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
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    // Создаем директорию если не существует
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Директория уже существует
    }

    for (const file of files) {
      // Валидация типа файла
      if (!file.type.startsWith('image/')) {
        continue; // Пропускаем не-изображения
      }

      // Валидация размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({
          success: false,
          error: 'Файл слишком большой (максимум 5MB)'
        } as ApiResponse<null>, { status: 400 });
      }

      // Генерируем уникальное имя
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}-${randomStr}.${extension}`;

      // Сохраняем файл
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, buffer);

      // Добавляем URL в результат
      uploadedFiles.push(`/uploads/${filename}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      },
      message: 'Файлы успешно загружены'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при загрузке файлов'
    } as ApiResponse<null>, { status: 500 });
  }
}

