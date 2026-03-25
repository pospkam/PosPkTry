/**
 * Email Service - Сервис отправки email уведомлений
 * Использует Nodemailer для SMTP
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OperatorNewBookingData {
  bookingId: string;
  tourTitle: string;
  date: Date;
  participants: number;
  totalAmount: number;
  touristName: string;
  touristEmail: string;
  specialRequests?: string | null;
  operatorEmail: string;
}

export interface BookingConfirmationData {
  bookingId: string;
  touristName: string;
  touristEmail: string;
  tourTitle: string;
  date: Date;
  participants: number;
  totalAmount: number;
  specialRequests?: string | null;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private initTransporter() {
    if (this.transporter) return this.transporter;

    const smtpHost = process.env.SMTP_HOST || 'smtp.yandex.ru';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = this.initTransporter();

      if (!transporter) {
        return { success: false, error: 'Email service not configured' };
      }

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationData): Promise<EmailResult> {
    const dateStr = data.date.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const amountStr = new Intl.NumberFormat('ru-RU').format(data.totalAmount);
    const shortId = data.bookingId.slice(0, 8).toUpperCase();

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Бронирование подтверждено</title>
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

      <!-- Шапка -->
      <tr>
        <td style="background:#D44A0C;padding:24px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.02em;">TourHab</p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Туристическая платформа Камчатки</p>
        </td>
      </tr>

      <!-- Основное сообщение -->
      <tr>
        <td style="padding:32px 32px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6B6560;text-transform:uppercase;letter-spacing:0.08em;">Бронирование принято</p>
          <h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#1A1714;line-height:1.3;">${this.esc(data.tourTitle)}</h1>
        </td>
      </tr>

      <!-- Детали бронирования -->
      <tr>
        <td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;">
                ${this.detailRow('Номер заявки', `#${shortId}`)}
                ${this.detailRow('Дата', dateStr)}
                ${this.detailRow('Участники', String(data.participants))}
                ${this.detailRow('Сумма', `${amountStr}\u00A0\u20BD`)}
                ${data.specialRequests ? this.detailRow('Пожелания', this.esc(data.specialRequests)) : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Следующие шаги -->
      <tr>
        <td style="padding:24px 32px 0;">
          <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1A1714;">Что дальше</h2>
          <p style="margin:0 0 8px;font-size:14px;color:#6B6560;line-height:1.6;">
            Ваша заявка передана оператору. В течение 24\u00A0часов он свяжется с вами для подтверждения деталей и оплаты.
          </p>
          <p style="margin:0;font-size:14px;color:#6B6560;line-height:1.6;">
            Следить за статусом бронирования можно в личном кабинете на <a href="https://tourhab.ru/hub/tourist/bookings" style="color:#D44A0C;text-decoration:none;">tourhab.ru</a>.
          </p>
        </td>
      </tr>

      <!-- Приветствие -->
      <tr>
        <td style="padding:24px 32px;">
          <p style="margin:0;font-size:14px;color:#6B6560;line-height:1.6;">
            Здравствуйте, <strong style="color:#1A1714;">${this.esc(data.touristName)}</strong>!<br>
            Спасибо за выбор TourHab. Желаем яркого путешествия на Камчатке.
          </p>
        </td>
      </tr>

      <!-- Разделитель -->
      <tr><td style="padding:0 32px;"><div style="border-top:1px solid #F0ECE7;"></div></td></tr>

      <!-- Футер -->
      <tr>
        <td style="padding:20px 32px;background:#FAFAFA;">
          <p style="margin:0;font-size:11px;color:#9A9590;line-height:1.6;">
            ООО &laquo;ПОС-СЕРВИС&raquo;, ИНН&nbsp;4101147649 &mdash; tourhab.ru<br>
            Это автоматическое письмо. Для связи: <a href="mailto:support@tourhab.ru" style="color:#D44A0C;text-decoration:none;">support@tourhab.ru</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    return this.sendEmail({
      to: data.touristEmail,
      subject: `Бронирование принято — ${data.tourTitle}`,
      html,
    });
  }

  async sendOperatorNewBooking(data: OperatorNewBookingData): Promise<EmailResult> {
    const dateStr = data.date.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const amountStr = new Intl.NumberFormat('ru-RU').format(data.totalAmount);
    const shortId = data.bookingId.slice(0, 8).toUpperCase();

    const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
      <tr>
        <td style="background:#D44A0C;padding:24px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">TourHab</p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Новая заявка на тур</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6B6560;text-transform:uppercase;letter-spacing:0.08em;">Новое бронирование</p>
          <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#1A1714;line-height:1.3;">${this.esc(data.tourTitle)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;border-radius:8px;">
            <tr>
              <td style="padding:20px 24px;">
                ${this.detailRow('Заявка', `#${shortId}`)}
                ${this.detailRow('Дата', dateStr)}
                ${this.detailRow('Участников', String(data.participants))}
                ${data.totalAmount > 0 ? this.detailRow('Сумма', `${amountStr}\u00A0\u20BD`) : ''}
                ${this.detailRow('Турист', this.esc(data.touristName))}
                ${this.detailRow('Email туриста', this.esc(data.touristEmail))}
                ${data.specialRequests ? this.detailRow('Комментарий', this.esc(data.specialRequests)) : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <a href="https://tourhab.ru/hub/operator/bookings" style="display:inline-block;background:#D44A0C;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
            Открыть в кабинете →
          </a>
        </td>
      </tr>
      <tr><td style="padding:0 32px;"><div style="border-top:1px solid #F0ECE7;"></div></td></tr>
      <tr>
        <td style="padding:16px 32px;background:#FAFAFA;">
          <p style="margin:0;font-size:11px;color:#9A9590;">
            TourHab &mdash; tourhab.ru &mdash; ООО &laquo;ПОС-СЕРВИС&raquo;
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    return this.sendEmail({
      to: data.operatorEmail,
      subject: `Новая заявка: ${data.tourTitle} — #${shortId}`,
      html,
    });
  }

  async sendBookingCancellation(data: {
    bookingId: string;
    touristName: string;
    touristEmail: string;
    tourTitle: string;
    refundAmount: number;
    refundPercent: number;
    refundReason?: string;
  }): Promise<EmailResult> {
    const amountStr = new Intl.NumberFormat('ru-RU').format(data.refundAmount);
    const shortId = data.bookingId.slice(0, 8).toUpperCase();
    const hasRefund = data.refundAmount > 0;

    const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
      <tr>
        <td style="background:#6B6560;padding:24px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">TourHab</p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Бронирование отменено</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6B6560;text-transform:uppercase;letter-spacing:0.08em;">Здравствуйте, ${this.esc(data.touristName)}</p>
          <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#1A1714;line-height:1.3;">Бронирование отменено</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6B6560;line-height:1.6;">
            Бронирование <strong>#${shortId}</strong> на тур &laquo;${this.esc(data.tourTitle)}&raquo; отменено.
          </p>
        </td>
      </tr>
      ${hasRefund ? `
      <tr>
        <td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;border-radius:8px;">
            <tr>
              <td style="padding:20px 24px;">
                ${this.detailRow('Возврат', `${amountStr}\u00A0\u20BD (${data.refundPercent}%)`)}
                ${data.refundReason ? this.detailRow('Основание', this.esc(data.refundReason)) : ''}
                ${this.detailRow('Срок', '3\u20135 рабочих дней')}
              </td>
            </tr>
          </table>
        </td>
      </tr>` : `
      <tr>
        <td style="padding:0 32px;">
          <p style="font-size:14px;color:#6B6560;line-height:1.6;">
            Согласно условиям отмены, возврат средств не предусмотрен.
          </p>
        </td>
      </tr>`}
      <tr>
        <td style="padding:24px 32px;">
          <a href="https://tourhab.ru/marketplace" style="display:inline-block;background:#D44A0C;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
            Найти другой тур →
          </a>
        </td>
      </tr>
      <tr><td style="padding:0 32px;"><div style="border-top:1px solid #F0ECE7;"></div></td></tr>
      <tr>
        <td style="padding:16px 32px;background:#FAFAFA;">
          <p style="margin:0;font-size:11px;color:#9A9590;">
            ООО &laquo;ПОС-СЕРВИС&raquo;, ИНН&nbsp;4101147649 &mdash; tourhab.ru<br>
            Вопросы: <a href="mailto:support@tourhab.ru" style="color:#D44A0C;text-decoration:none;">support@tourhab.ru</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    return this.sendEmail({
      to: data.touristEmail,
      subject: `Бронирование отменено — ${data.tourTitle}`,
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.initTransporter();
      if (!transporter) return false;
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private detailRow(label: string, value: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
      <tr>
        <td style="font-size:12px;color:#9A9590;text-transform:uppercase;letter-spacing:0.06em;width:40%;">${label}</td>
        <td style="font-size:14px;font-weight:600;color:#1A1714;">${value}</td>
      </tr>
    </table>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

export const emailService = new EmailService();
