import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { emailService } from '@/lib/notifications/email-service';
import { OperatorVerifyRow, OperatorActionRow } from '@/lib/types/db-rows';
import { z } from 'zod';

const VerifyOperatorSchema = z.object({
  operatorId: z.string().min(1, 'ID оператора обязателен'),
  action: z.enum(['approve', 'reject'], { errorMap: () => ({ message: 'Действие должно быть approve или reject' }) }),
  reason: z.string().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/operators/verify
 * Верификация туроператора (одобрение/отклонение)
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const body = await request.json();
    const parsed = VerifyOperatorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      }, { status: 400 });
    }
    const { operatorId, action, reason } = parsed.data;

    // Получаем данные оператора
    const operatorResult = await query<OperatorActionRow>(`
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

      // Отправляем email об одобрении
      if (operator.email) {
        try {
          await emailService.sendEmail({
            to: operator.email,
            subject: 'Ваша заявка на регистрацию оператора одобрена — KamchatourHub',
            html: `
              <h2>Поздравляем! Ваша заявка одобрена</h2>
              <p>Здравствуйте, <strong>${operator.name}</strong>!</p>
              <p>Компания <strong>${operator.company_name}</strong> успешно верифицирована на платформе KamchatourHub.</p>
              <p>Теперь вы можете войти в личный кабинет и начать размещать туры.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/login" style="color:#00D4FF">Войти в кабинет</a></p>
            `,
          });
        } catch {
          // Не прерываем выполнение при ошибке email
        }
      }

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

      // Отправляем email об отклонении
      if (operator.email) {
        try {
          await emailService.sendEmail({
            to: operator.email,
            subject: 'Ваша заявка на регистрацию оператора отклонена — KamchatourHub',
            html: `
              <h2>Заявка отклонена</h2>
              <p>Здравствуйте, <strong>${operator.name}</strong>!</p>
              <p>К сожалению, заявка компании <strong>${operator.company_name}</strong> не прошла верификацию.</p>
              ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ''}
              <p>Если у вас есть вопросы, свяжитесь с нами: <a href="mailto:support@kamhub.ru">support@kamhub.ru</a></p>
            `,
          });
        } catch {
          // Не прерываем выполнение при ошибке email
        }
      }

      return NextResponse.json({
        success: true,
        message: `Заявка оператора ${operator.company_name} отклонена`
      });
    }

  } catch (error) {
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

    const result = await query<OperatorVerifyRow>(`
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
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении списка операторов'
    }, { status: 500 });
  }
}
