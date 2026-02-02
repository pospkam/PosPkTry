import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings - Получение системных настроек
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    // Получаем все настройки из базы данных
    const settingsQuery = `
      SELECT key, value, description, category, updated_at
      FROM system_settings
      ORDER BY category, key
    `;

    const settingsResult = await query(settingsQuery);

    // Группируем по категориям
    const settings: any = {};
    settingsResult.rows.forEach(row => {
      if (!settings[row.category]) {
        settings[row.category] = {};
      }
      settings[row.category][row.key] = {
        value: row.value,
        description: row.description,
        updatedAt: row.updated_at
      };
    });

    // Email шаблоны
    const templatesQuery = `
      SELECT id, name, subject, type, variables, is_active, updated_at
      FROM email_templates
      ORDER BY type, name
    `;

    const templatesResult = await query(templatesQuery);

    return NextResponse.json({
      success: true,
      data: {
        settings,
        emailTemplates: templatesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          subject: row.subject,
          type: row.type,
          variables: JSON.parse(row.variables || '[]'),
          isActive: row.is_active,
          updatedAt: row.updated_at
        }))
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении настроек'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings - Обновление системных настроек
 */
export async function PUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Необходимо передать объект settings'
      } as ApiResponse<null>, { status: 400 });
    }

    // Обновляем настройки
    const updatePromises = [];
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(categorySettings as any)) {
        const updateQuery = `
          INSERT INTO system_settings (key, value, category, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `;
        updatePromises.push(query(updateQuery, [key, value, category]));
      }
    }

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Настройки обновлены успешно'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении настроек'
    } as ApiResponse<null>, { status: 500 });
  }
}
