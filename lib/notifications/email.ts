// =============================================
// СЕРВИС EMAIL УВЕДОМЛЕНИЙ
// Kamchatour Hub - Email Notification Service
// =============================================

import nodemailer from 'nodemailer';

interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  // Отправка email
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    try {
      const info = await this.transporter.sendMail({
        from: `"Kamchatour Hub" <${process.env.SMTP_USER}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Подтверждение бронирования трансфера
  async sendBookingConfirmation(email: string, booking: {
    id: string;
    confirmationCode: string;
    route: string;
    date: string;
    time: string;
    passengers: number;
    price: number;
    driverName: string;
    driverPhone: string;
    meetingPoint: string;
  }): Promise<EmailResponse> {
    const subject = `[✓] Подтверждение бронирования трансфера #${booking.confirmationCode}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Подтверждение бронирования</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: #ffd700; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .driver-info { background: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
          .button { background: #ffd700; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>  Kamchatour Hub</h1>
            <h2>Бронирование подтверждено</h2>
          </div>
          
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Ваше бронирование трансфера успешно подтверждено.</p>
            
            <div class="booking-details">
              <h3>Детали поездки</h3>
              <p><strong>Код бронирования:</strong> ${booking.confirmationCode}</p>
              <p><strong>Маршрут:</strong> ${booking.route}</p>
              <p><strong>Дата:</strong> ${booking.date}</p>
              <p><strong>Время:</strong> ${booking.time}</p>
              <p><strong>Количество пассажиров:</strong> ${booking.passengers}</p>
              <p><strong>Цена:</strong> ${booking.price} ₽</p>
              <p><strong>Место встречи:</strong> ${booking.meetingPoint}</p>
            </div>
            
            <div class="driver-info">
              <h3>Информация о водителе</h3>
              <p><strong>Имя:</strong> ${booking.driverName}</p>
              <p><strong>Телефон:</strong> <a href="tel:${booking.driverPhone}">${booking.driverPhone}</a></p>
            </div>
            
            <p>Если у вас есть вопросы, свяжитесь с нами по телефону или email.</p>
            
            <div class="footer">
              <p>С уважением,<br>Команда Kamchatour Hub</p>
              <p>  +7 (XXX) XXX-XX-XX | 📧 info@tourhab.ru</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Подтверждение бронирования трансфера #${booking.confirmationCode}

Детали поездки:
- Маршрут: ${booking.route}
- Дата: ${booking.date}
- Время: ${booking.time}
- Пассажиры: ${booking.passengers}
- Цена: ${booking.price} ₽
- Место встречи: ${booking.meetingPoint}

Информация о водителе:
- Имя: ${booking.driverName}
- Телефон: ${booking.driverPhone}

С уважением,
Команда Kamchatour Hub
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  // Назначение водителя
  async sendDriverAssignment(email: string, assignment: {
    route: string;
    date: string;
    time: string;
    passengers: number;
    passengerName: string;
    passengerPhone: string;
    meetingPoint: string;
  }): Promise<EmailResponse> {
    const subject = `  Назначение на поездку - ${assignment.route}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Назначение на поездку</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: #ffd700; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .assignment-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .passenger-info { background: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>  Kamchatour Hub</h1>
            <h2>Новое назначение</h2>
          </div>
          
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вам назначена новая поездка.</p>
            
            <div class="assignment-details">
              <h3>Детали поездки</h3>
              <p><strong>Маршрут:</strong> ${assignment.route}</p>
              <p><strong>Дата:</strong> ${assignment.date}</p>
              <p><strong>Время:</strong> ${assignment.time}</p>
              <p><strong>Количество пассажиров:</strong> ${assignment.passengers}</p>
              <p><strong>Место встречи:</strong> ${assignment.meetingPoint}</p>
            </div>
            
            <div class="passenger-info">
              <h3>Информация о пассажире</h3>
              <p><strong>Имя:</strong> ${assignment.passengerName}</p>
              <p><strong>Телефон:</strong> <a href="tel:${assignment.passengerPhone}">${assignment.passengerPhone}</a></p>
            </div>
            
            <p>Пожалуйста, подтвердите получение назначения в мобильном приложении.</p>
            
            <div class="footer">
              <p>С уважением,<br>Команда Kamchatour Hub</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Детали маршрута
  async sendRouteDetails(email: string, route: {
    name: string;
    from: string;
    to: string;
    distance: number;
    duration: number;
    stops: Array<{
      name: string;
      address: string;
      time: string;
    }>;
    features: string[];
  }): Promise<EmailResponse> {
    const subject = `  Детали маршрута - ${route.name}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Детали маршрута</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: #ffd700; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .route-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .stops { background: #f0f8ff; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .features { background: #f0fff0; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>  Kamchatour Hub</h1>
            <h2>Детали маршрута</h2>
          </div>
          
          <div class="content">
            <div class="route-details">
              <h3>${route.name}</h3>
              <p><strong>Откуда:</strong> ${route.from}</p>
              <p><strong>Куда:</strong> ${route.to}</p>
              <p><strong>Расстояние:</strong> ${route.distance} км</p>
              <p><strong>Время в пути:</strong> ${route.duration} минут</p>
            </div>
            
            <div class="stops">
              <h3>Остановки</h3>
              ${route.stops.map(stop => `
                <p><strong>${stop.name}</strong><br>
                ${stop.address}<br>
                <em>Время: ${stop.time}</em></p>
              `).join('')}
            </div>
            
            <div class="features">
              <h3>Особенности маршрута</h3>
              <ul>
                ${route.features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            
            <div class="footer">
              <p>С уважением,<br>Команда Kamchatour Hub</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Отмена поездки
  async sendTripCancellation(email: string, cancellation: {
    route: string;
    date: string;
    reason: string;
    refundAmount?: number;
    refundMethod?: string;
  }): Promise<EmailResponse> {
    const subject = `[✗] Отмена поездки - ${cancellation.route}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Отмена поездки</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: #ffd700; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .cancellation-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .refund-info { background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>  Kamchatour Hub</h1>
            <h2>Поездка отменена</h2>
          </div>
          
          <div class="content">
            <p>Здравствуйте!</p>
            <p>К сожалению, ваша поездка была отменена.</p>
            
            <div class="cancellation-details">
              <h3>Детали отмены</h3>
              <p><strong>Маршрут:</strong> ${cancellation.route}</p>
              <p><strong>Дата:</strong> ${cancellation.date}</p>
              <p><strong>Причина:</strong> ${cancellation.reason}</p>
            </div>
            
            ${cancellation.refundAmount ? `
            <div class="refund-info">
              <h3>Возврат средств</h3>
              <p><strong>Сумма возврата:</strong> ${cancellation.refundAmount} ₽</p>
              <p><strong>Способ возврата:</strong> ${cancellation.refundMethod || 'На карту'}</p>
              <p>Возврат будет обработан в течение 3-5 рабочих дней.</p>
            </div>
            ` : ''}
            
            <p>Если у вас есть вопросы, свяжитесь с нами.</p>
            
            <div class="footer">
              <p>С уважением,<br>Команда Kamchatour Hub</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Еженедельная статистика для оператора
  async sendWeeklyStats(email: string, stats: {
    week: string;
    totalBookings: number;
    completedTrips: number;
    totalRevenue: number;
    averageRating: number;
    topRoutes: Array<{
      route: string;
      bookings: number;
    }>;
  }): Promise<EmailResponse> {
    const subject = `  Еженедельная статистика - ${stats.week}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Еженедельная статистика</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: #ffd700; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #ffd700; }
          .top-routes { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>  Kamchatour Hub</h1>
            <h2>Еженедельная статистика</h2>
          </div>
          
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Ваша статистика за неделю ${stats.week}:</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${stats.totalBookings}</div>
                <div>Всего заявок</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.completedTrips}</div>
                <div>Выполнено поездок</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.totalRevenue} ₽</div>
                <div>Общий доход</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.averageRating}</div>
                <div>Средний рейтинг</div>
              </div>
            </div>
            
            <div class="top-routes">
              <h3>Популярные маршруты</h3>
              ${stats.topRoutes.map(route => `
                <p><strong>${route.route}</strong> - ${route.bookings} заявок</p>
              `).join('')}
            </div>
            
            <div class="footer">
              <p>С уважением,<br>Команда Kamchatour Hub</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }
}

// Создаем глобальный экземпляр
export const emailService = new EmailNotificationService();

// Экспортируем типы
export type { EmailMessage, EmailResponse };