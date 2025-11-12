import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { getFigmaFileWithToken } from '@/lib/figma/figma-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/figma/import - Импорт дизайнов из Figma
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const { fileKey, personalAccessToken } = body;

    if (!fileKey || !personalAccessToken) {
      return NextResponse.json(
        { success: false, error: 'fileKey и personalAccessToken обязательны' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Получаем файл из Figma
    const figmaFile = await getFigmaFileWithToken(fileKey, personalAccessToken);

    // Извлекаем полезную информацию
    const extracted = {
      name: figmaFile.document?.name || 'Untitled',
      components: Object.keys(figmaFile.components || {}).length,
      styles: Object.keys(figmaFile.styles || {}).length,
      pages: figmaFile.document?.children?.length || 0
    };

    // TODO: Сохранить компоненты и стили в БД
    // TODO: Автоматически генерировать React компоненты

    return NextResponse.json({
      success: true,
      data: extracted,
      message: 'Файл Figma успешно импортирован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error importing from Figma:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка импорта из Figma' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { getFigmaFileWithToken } from '@/lib/figma/figma-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/figma/import - Импорт дизайнов из Figma
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const { fileKey, personalAccessToken } = body;

    if (!fileKey || !personalAccessToken) {
      return NextResponse.json(
        { success: false, error: 'fileKey и personalAccessToken обязательны' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Получаем файл из Figma
    const figmaFile = await getFigmaFileWithToken(fileKey, personalAccessToken);

    // Извлекаем полезную информацию
    const extracted = {
      name: figmaFile.document?.name || 'Untitled',
      components: Object.keys(figmaFile.components || {}).length,
      styles: Object.keys(figmaFile.styles || {}).length,
      pages: figmaFile.document?.children?.length || 0
    };

    // TODO: Сохранить компоненты и стили в БД
    // TODO: Автоматически генерировать React компоненты

    return NextResponse.json({
      success: true,
      data: extracted,
      message: 'Файл Figma успешно импортирован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error importing from Figma:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка импорта из Figma' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { getFigmaFileWithToken } from '@/lib/figma/figma-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/figma/import - Импорт дизайнов из Figma
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const { fileKey, personalAccessToken } = body;

    if (!fileKey || !personalAccessToken) {
      return NextResponse.json(
        { success: false, error: 'fileKey и personalAccessToken обязательны' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Получаем файл из Figma
    const figmaFile = await getFigmaFileWithToken(fileKey, personalAccessToken);

    // Извлекаем полезную информацию
    const extracted = {
      name: figmaFile.document?.name || 'Untitled',
      components: Object.keys(figmaFile.components || {}).length,
      styles: Object.keys(figmaFile.styles || {}).length,
      pages: figmaFile.document?.children?.length || 0
    };

    // TODO: Сохранить компоненты и стили в БД
    // TODO: Автоматически генерировать React компоненты

    return NextResponse.json({
      success: true,
      data: extracted,
      message: 'Файл Figma успешно импортирован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error importing from Figma:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка импорта из Figma' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { getFigmaFileWithToken } from '@/lib/figma/figma-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/figma/import - Импорт дизайнов из Figma
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const { fileKey, personalAccessToken } = body;

    if (!fileKey || !personalAccessToken) {
      return NextResponse.json(
        { success: false, error: 'fileKey и personalAccessToken обязательны' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Получаем файл из Figma
    const figmaFile = await getFigmaFileWithToken(fileKey, personalAccessToken);

    // Извлекаем полезную информацию
    const extracted = {
      name: figmaFile.document?.name || 'Untitled',
      components: Object.keys(figmaFile.components || {}).length,
      styles: Object.keys(figmaFile.styles || {}).length,
      pages: figmaFile.document?.children?.length || 0
    };

    // TODO: Сохранить компоненты и стили в БД
    // TODO: Автоматически генерировать React компоненты

    return NextResponse.json({
      success: true,
      data: extracted,
      message: 'Файл Figma успешно импортирован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error importing from Figma:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка импорта из Figma' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}





























