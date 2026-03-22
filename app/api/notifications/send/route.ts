import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailService, EmailOptions } from '@/lib/notifications/email-service';
import { emailTemplates } from '@/lib/notifications/email-templates';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const SendEmailSchema = z.object({
  type: z.enum(['bookingConfirmation', 'paymentConfirmation', 'tourReminder', 'bookingCancellation', 'welcome', 'passwordReset', 'partnerVerification'], { errorMap: () => ({ message: 'Некорректный тип email' }) }),
  to: z.string().email('Некорректный email'),
  data: z.record(z.unknown()),
});

/**
 * POST /api/notifications/send
 * Отправка email уведомлений (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json();
    const parsed = SendEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }

    const { type, to, data } = parsed.data;

    // Получаем шаблон
    let emailData: { subject: string; html: string };

    switch (type) {
      case 'bookingConfirmation':
        emailData = emailTemplates.bookingConfirmation(data as unknown as { userName: string; tourName: string; date: Date; guests: number; totalPrice: number; bookingId: string; });
        break;
      case 'paymentConfirmation':
        emailData = emailTemplates.paymentConfirmation(data as unknown as { userName: string; amount: number; transactionId: string; bookingType: string; bookingName: string; });
        break;
      case 'tourReminder':
        emailData = emailTemplates.tourReminder(data as unknown as { userName: string; tourName: string; date: Date; time?: string; meetingPoint: string; guidePhone?: string; });
        break;
      case 'bookingCancellation':
        emailData = emailTemplates.bookingCancellation(data as unknown as { userName: string; tourName: string; date: Date; bookingId: string; refundAmount?: number; });
        break;
      case 'welcome':
        emailData = emailTemplates.welcome(data as unknown as { userName: string; userEmail: string; });
        break;
      case 'passwordReset':
        emailData = emailTemplates.passwordReset(data as unknown as { userName: string; resetLink: string; });
        break;
      case 'partnerVerification':
        emailData = emailTemplates.partnerVerification(data as unknown as { partnerName: string; category: string; });
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type'
        } as ApiResponse<null>, { status: 400 });
    }

    // Отправляем email
    const result = await emailService.sendEmail({
      to,
      subject: emailData.subject,
      html: emailData.html
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send email'
      } as ApiResponse<null>, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.messageId
      },
      message: 'Email sent successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



