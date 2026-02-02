import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/templates
 * Get message templates
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const result = await query(
      `SELECT *
       FROM message_templates
       WHERE user_id = $1 AND is_active = true
       ORDER BY usage_count DESC, name ASC`,
      [userId]
    );

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      content: row.content,
      templateType: row.template_type,
      variables: row.variables,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { templates }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении шаблонов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/templates
 * Create message template
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, content, templateType, variables } = body;

    if (!name || !content) {
      return NextResponse.json({
        success: false,
        error: 'name и content обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO message_templates (
        user_id, name, subject, content, template_type, variables
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        userId,
        name,
        subject,
        content,
        templateType,
        JSON.stringify(variables || [])
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Шаблон создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании шаблона'
    } as ApiResponse<null>, { status: 500 });
  }
}
