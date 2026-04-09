/**
 * GET  /api/admin/email-test  — проверяет SMTP-соединение
 * POST /api/admin/email-test  — отправляет тестовое письмо на указанный адрес
 * Auth: admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { emailService } from '@/lib/notifications/email-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const ok = await emailService.verifyConnection();

  return NextResponse.json({
    success: ok,
    config: {
      host:   process.env.SMTP_HOST   ?? '(не задан)',
      port:   process.env.SMTP_PORT   ?? '(не задан)',
      secure: process.env.SMTP_SECURE ?? 'false',
      user:   process.env.SMTP_USER   ? process.env.SMTP_USER : '(не задан)',
      from:   process.env.SMTP_FROM   ?? '(не задан)',
    },
    ...(ok ? {} : { error: 'Не удалось подключиться к SMTP-серверу. Проверьте учётные данные.' }),
  });
}

const SendTestSchema = z.object({
  to: z.string().email('Некорректный email'),
});

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = SendTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    );
  }

  const result = await emailService.sendEmail({
    to:      parsed.data.to,
    subject: 'TourHab — тест SMTP',
    html: `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"></head>
<body style="font-family:Helvetica,Arial,sans-serif;background:#F5F0EB;padding:32px;">
  <table width="560" style="background:#fff;border-radius:12px;overflow:hidden;margin:0 auto;">
    <tr><td style="background:#D44A0C;padding:20px 28px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">TourHab</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">Туристическая платформа Камчатки</p>
    </td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 12px;color:#1A1714;">SMTP работает</h2>
      <p style="color:#6B6560;line-height:1.6;">
        Это тестовое письмо отправлено с <strong>${process.env.SMTP_USER ?? 'SMTP_USER не задан'}</strong>
        через <strong>${process.env.SMTP_HOST ?? 'SMTP_HOST не задан'}:${process.env.SMTP_PORT ?? '?'}</strong>.
      </p>
      <p style="color:#9A9590;font-size:12px;margin-top:20px;">
        tourhab.ru — ООО «ПОС-СЕРВИС», ИНН 4101147649
      </p>
    </td></tr>
  </table>
</body></html>`,
    text: 'TourHab SMTP тест — всё работает.',
  });

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
