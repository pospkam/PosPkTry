import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { EmailTemplateRow, EmailTemplateUpdateRow } from '@/lib/types/db-rows';
import { z } from 'zod';

const UpdateEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Название шаблона обязательно'),
  subject: z.string().min(1, 'Тема письма обязательна'),
  type: z.string().min(1, 'Тип шаблона обязателен'),
  htmlContent: z.string().min(1, 'HTML-содержимое обязательно'),
  textContent: z.string().optional().default(''),
  variables: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/email-templates/[id] - Получение конкретного email шаблона
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await params;

    const templateQuery = `
      SELECT id, name, subject, type, html_content, text_content, variables, is_active, created_at, updated_at
      FROM email_templates
      WHERE id = $1
    `;

    const templateResult = await query<EmailTemplateRow>(templateQuery, [id]);

    if (templateResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Email шаблон не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = templateResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        template: {
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
        }
      }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении email шаблона'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/email-templates/[id] - Обновление email шаблона
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateEmailTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }
    const { name, subject, type, htmlContent, textContent, variables, isActive } = parsed.data;

    const updateQuery = `
      UPDATE email_templates
      SET name = $1, subject = $2, type = $3, html_content = $4, text_content = $5,
          variables = $6, is_active = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING id, updated_at
    `;

    const result = await query<EmailTemplateUpdateRow>(updateQuery, [
      name,
      subject,
      type,
      htmlContent,
      textContent || '',
      JSON.stringify(variables || []),
      isActive,
      id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Email шаблон не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const template = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.id,
        updatedAt: template.updated_at
      },
      message: 'Email шаблон обновлен успешно'
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении email шаблона'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/email-templates/[id] - Удаление email шаблона
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await params;

    const deleteQuery = `
      DELETE FROM email_templates
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Email шаблон не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email шаблон удален успешно'
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении email шаблона'
    } as ApiResponse<null>, { status: 500 });
  }
}

