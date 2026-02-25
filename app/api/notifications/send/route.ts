import { NextRequest, NextResponse } from 'next/server';
import { emailService, EmailOptions } from '@/lib/notifications/email-service';
import { emailTemplates } from '@/lib/notifications/email-templates';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface SendEmailRequest {
  type: 'bookingConfirmation' | 'paymentConfirmation' | 'tourReminder' | 'bookingCancellation' | 'welcome' | 'passwordReset' | 'partnerVerification';
  to: string;
  data: any;
}

/**
 * POST /api/notifications/send
 * Отправка email уведомлений
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();

    if (!body.type || !body.to || !body.data) {
      return NextResponse.json({
        success: false,
        error: 'Type, to, and data are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем шаблон
    let emailData: { subject: string; html: string };

    switch (body.type) {
      case 'bookingConfirmation':
        emailData = emailTemplates.bookingConfirmation(body.data);
        break;
      case 'paymentConfirmation':
        emailData = emailTemplates.paymentConfirmation(body.data);
        break;
      case 'tourReminder':
        emailData = emailTemplates.tourReminder(body.data);
        break;
      case 'bookingCancellation':
        emailData = emailTemplates.bookingCancellation(body.data);
        break;
      case 'welcome':
        emailData = emailTemplates.welcome(body.data);
        break;
      case 'passwordReset':
        emailData = emailTemplates.passwordReset(body.data);
        break;
      case 'partnerVerification':
        emailData = emailTemplates.partnerVerification(body.data);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type'
        } as ApiResponse<null>, { status: 400 });
    }

    // Отправляем email
    const result = await emailService.sendEmail({
      to: body.to,
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
    console.error('Error sending email:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



