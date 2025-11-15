import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/operators/verify
 * Верификация туроператора (одобрение/отклонение)
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { operatorId, action, reason } = await request.json();

    if (!operatorId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID и action обязательны'
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Action должен быть approve или reject'
      }, { status: 400 });
    }

    // Получаем данные оператора
    const operatorResult = await query(`
      SELECT 
        o.id,
        o.user_id,
        o.company_name,
        o.verification_status,
        u.email,
        u.name
      FROM operators o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [operatorId]);

    if (operatorResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Оператор не найден'
      }, { status: 404 });
    }

    const operator = operatorResult.rows[0];

    if (action === 'approve') {
      // Одобряем оператора
      await query(`
        UPDATE operators
        SET 
          verification_status = 'verified',
          verified_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [operatorId]);

      // Активируем пользователя
      await query(`
        UPDATE users
        SET is_active = true
        WHERE id = $1
      `, [operator.user_id]);

      // TODO: Отправить email об одобрении

      return NextResponse.json({
        success: true,
        message: `Оператор ${operator.company_name} успешно верифицирован`
      });

    } else {
      // Отклоняем оператора
      await query(`
        UPDATE operators
        SET 
          verification_status = 'rejected',
          rejection_reason = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [reason || 'Не указана', operatorId]);

      // Деактивируем пользователя
      await query(`
        UPDATE users
        SET is_active = false
        WHERE id = $1
      `, [operator.user_id]);

      // TODO: Отправить email об отклонении

      return NextResponse.json({
        success: true,
        message: `Заявка оператора ${operator.company_name} отклонена`
      });
    }

  } catch (error) {
    console.error('Operator verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при верификации оператора'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/operators/verify
 * Получить список операторов ожидающих верификации
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const result = await query(`
      SELECT 
        o.id,
        o.company_name,
        o.company_inn,
        o.company_address,
        o.website,
        o.description,
        o.verification_status,
        o.created_at,
        u.name as contact_name,
        u.email,
        u.phone
      FROM operators o
      JOIN users u ON o.user_id = u.id
      WHERE o.verification_status = 'pending'
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching pending operators:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении списка операторов'
    }, { status: 500 });
  }
}
