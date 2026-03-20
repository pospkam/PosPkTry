/**
 * PATCH /api/admin/operators/[id]
 * Одобрить или отклонить заявку оператора
 * action: 'approve' | 'reject'
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';
import { emailService } from '@/lib/notifications/email-service';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  action:  z.enum(['approve', 'reject']),
  comment: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { action, comment } = parsed.data;

  // Получаем данные партнёра + пользователя
  const partnerRes = await query(`
    SELECT p.id, p.name AS company_name, p.profile_status,
           u.id AS user_id, u.email, u.name AS contact_name
    FROM partners p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = $1
  `, [id]);

  if (partnerRes.rows.length === 0) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 404 });
  }

  const partner = partnerRes.rows[0] as {
    id: string; company_name: string; profile_status: string;
    user_id: string; email: string; contact_name: string;
  };

  if (action === 'approve') {
    await query(`
      UPDATE partners
      SET profile_status = 'approved',
          is_verified    = TRUE,
          is_public      = TRUE,
          verified_at    = NOW(),
          verified_by    = $2,
          updated_at     = NOW()
      WHERE id = $1
    `, [id, authOrResponse.userId]);

    // Обновляем operator_applications
    await query(`
      UPDATE operator_applications
      SET status      = 'approved',
          reviewed_by = $2,
          reviewed_at = NOW()
      WHERE partner_id = $1
    `, [id, authOrResponse.userId]);

    // Email оператору
    emailService.sendEmail({
      to: partner.email,
      subject: 'Ваша заявка одобрена — TourHub',
      html: `<p>Здравствуйте, <b>${partner.contact_name}</b>!</p>
             <p>Заявка компании <b>${partner.company_name}</b> одобрена. Теперь вы можете публиковать туры.</p>
             <p><a href="https://tourhab.ru/hub/operator">Перейти в кабинет →</a></p>`,
    }).catch(() => {});

    // Telegram уведомление оператору если есть chat_id
    const tgRes = await query(
      `SELECT contacts->>'telegram_chat_id' AS chat_id FROM partners WHERE id = $1`,
      [id]
    );
    const chatId = (tgRes.rows[0] as { chat_id: string | null })?.chat_id;
    if (chatId) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (token) {
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Ваша заявка одобрена! Теперь вы можете публиковать туры на TourHub.\nhttps://tourhab.ru/hub/operator`,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, message: 'Оператор одобрен' });

  } else {
    await query(`
      UPDATE partners
      SET profile_status        = 'rejected',
          profile_review_comment = $2,
          updated_at            = NOW()
      WHERE id = $1
    `, [id, comment ?? null]);

    await query(`
      UPDATE operator_applications
      SET status         = 'rejected',
          review_comment = $2,
          reviewed_by    = $3,
          reviewed_at    = NOW()
      WHERE partner_id = $1
    `, [id, comment ?? null, authOrResponse.userId]);

    emailService.sendEmail({
      to: partner.email,
      subject: 'Статус заявки — TourHub',
      html: `<p>Здравствуйте, <b>${partner.contact_name}</b>!</p>
             <p>К сожалению, заявка компании <b>${partner.company_name}</b> не прошла проверку.</p>
             ${comment ? `<p><b>Комментарий:</b> ${comment}</p>` : ''}
             <p>По вопросам: <a href="mailto:info@tourhab.ru">info@tourhab.ru</a></p>`,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Заявка отклонена' });
  }
}
