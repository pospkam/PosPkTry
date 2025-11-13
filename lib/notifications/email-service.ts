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

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Инициализация SMTP транспорта
   */
  private initTransporter() {
    if (this.transporter) return this.transporter;

    const smtpHost = process.env.SMTP_HOST || 'smtp.yandex.ru';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPass) {
      console.error('SMTP credentials not configured');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      from: smtpFrom
    });

    return this.transporter;
  }

  /**
   * Отправка email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = this.initTransporter();

      if (!transporter) {
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });

      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Проверка конфигурации
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.initTransporter();
      if (!transporter) return false;

      await transporter.verify();
      console.log('SMTP connection verified');
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Простое преобразование HTML в текст
   */
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

// Singleton instance
export const emailService = new EmailService();



