import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/email-templates - Получение всех email шаблонов
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const templatesQuery = `
      SELECT id, name, subject, type, html_content, text_content, variables, is_active, created_at, updated_at
      FROM email_templates
      ORDER BY type, name
    `;

    const templatesResult = await query(templatesQuery);

    return NextResponse.json({
      success: true,
      data: {
        templates: templatesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          subject: row.subject,
          type: row.type,
          htmlContent: row.html_content,
          textContent: row.text_content,
          variables: JSON.parse(row.variables || '[]'),
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении email шаблонов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/admin/settings/email-templates - Создание нового email шаблона
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, type, htmlContent, textContent, variables } = body;

    if (!name || !subject || !type || !htmlContent) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать name, subject, type и htmlContent'
      } as ApiResponse<null>, { status: 400 });
    }

    const createQuery = `
      INSERT INTO email_templates (
        name, subject, type, html_content, text_content, variables, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, created_at
    `;

    const result = await query(createQuery, [
      name,
      subject,
      type,
      htmlContent,
      textContent || '',
      JSON.stringify(variables || []),
      true
    ]);

    const template = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.id,
        createdAt: template.created_at
      },
      message: 'Email шаблон создан успешно'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании email шаблона'
    } as ApiResponse<null>, { status: 500 });
  }
}

