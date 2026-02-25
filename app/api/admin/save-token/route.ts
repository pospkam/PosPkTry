import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { token, type } = await request.json();

    if (!token || !type) {
      return NextResponse.json(
        { error: 'Missing token or type' },
        { status: 400 }
      );
    }

    // Проверяем что это админ (в реальном приложении нужна проверка)
    // Здесь для простоты пропускаем

    const envPath = join(process.cwd(), '.env.local');
    let content = '';

    if (existsSync(envPath)) {
      // Читаем существующий файл
      const fs = await import('fs');
      content = fs.readFileSync(envPath, 'utf-8');
      
      // Обновляем или добавляем токен
      const lines = content.split('\n');
      const newLines = lines.map(line => {
        if (line.startsWith(`${type}=`)) {
          return `${type}=${token}`;
        }
        return line;
      });
      
      // Если токен не найден, добавляем
      if (!content.includes(`${type}=`)) {
        newLines.push(`${type}=${token}`);
      }
      
      content = newLines.join('\n');
    } else {
      content = `${type}=${token}`;
    }

    writeFileSync(envPath, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}
