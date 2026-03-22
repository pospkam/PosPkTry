import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { SystemSettingRow, EmailTemplateRow } from '@/lib/types/db-rows';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  settings: z.record(z.string(), z.record(z.string(), z.unknown())).refine(
    val => Object.keys(val).length > 0,
    'Объект settings не может быть пустым'
  ),
});

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

    const settingsResult = await query<SystemSettingRow>(settingsQuery);

    // Группируем по категориям
    const settings: Record<string, Record<string, { value: string; description: string | null; updatedAt: Date }>> = {};
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

    const templatesResult = await query<EmailTemplateRow>(templatesQuery);

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
    } as ApiResponse<unknown>);

  } catch (error) {
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
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }
    const { settings } = parsed.data;

    // Обновляем настройки
    const updatePromises = [];
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(categorySettings as Record<string, unknown>)) {
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
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении настроек'
    } as ApiResponse<null>, { status: 500 });
  }
}
