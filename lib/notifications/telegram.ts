// =============================================
// СЕРВИС TELEGRAM УВЕДОМЛЕНИЙ
// Kamchatour Hub - Telegram Notification Service
// =============================================

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

export class TelegramNotificationService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not configured');
    }
  }

  // Отправка сообщения в Telegram
  async sendMessage(message: TelegramMessage): Promise<TelegramResponse> {
    if (!this.botToken) {
      return {
        success: false,
        error: 'Telegram bot not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode || 'HTML',
          reply_markup: message.replyMarkup
        })
      });

      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          messageId: data.result.message_id
        };
      } else {
        return {
          success: false,
          error: data.description || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('Telegram sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Уведомление водителю о новой заявке
  async sendDriverNotification(chatId: string, booking: {
    id: string;
    route: string;
    date: string;
    time: string;
    passengers: number;
    price: number;
    passengerName: string;
    passengerPhone: string;
    meetingPoint: string;
  }): Promise<TelegramResponse> {
    const text = `
  <b>Новая заявка на трансфер</b>

  <b>Детали поездки:</b>
• Маршрут: ${booking.route}
• Дата: ${booking.date}
• Время: ${booking.time}
• Пассажиры: ${booking.passengers}
• Цена: ${booking.price} ₽

👤 <b>Информация о пассажире:</b>
• Имя: ${booking.passengerName}
• Телефон: <a href="tel:${booking.passengerPhone}">${booking.passengerPhone}</a>
• Место встречи: ${booking.meetingPoint}

🆔 <b>ID заявки:</b> ${booking.id}
    `;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '[✓] Принять',
            callback_data: `accept_booking_${booking.id}`
          },
          {
            text: '[✗] Отклонить',
            callback_data: `reject_booking_${booking.id}`
          }
        ],
        [
          {
            text: '  Позвонить пассажиру',
            callback_data: `call_passenger_${booking.passengerPhone}`
          }
        ]
      ]
    };

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      replyMarkup
    });
  }

  // Подтверждение принятия заявки
  async sendBookingAccepted(chatId: string, booking: {
    id: string;
    route: string;
    date: string;
    time: string;
    driverName: string;
    driverPhone: string;
  }): Promise<TelegramResponse> {
    const text = `
[✓] <b>Заявка принята!</b>

  <b>Детали поездки:</b>
• Маршрут: ${booking.route}
• Дата: ${booking.date}
• Время: ${booking.time}

  <b>Назначенный водитель:</b>
• Имя: ${booking.driverName}
• Телефон: <a href="tel:${booking.driverPhone}">${booking.driverPhone}</a>

🆔 <b>ID заявки:</b> ${booking.id}

<i>Пожалуйста, будьте готовы к поездке в указанное время.</i>
    `;

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML'
    });
  }

  // Отклонение заявки
  async sendBookingRejected(chatId: string, booking: {
    id: string;
    route: string;
    reason: string;
  }): Promise<TelegramResponse> {
    const text = `
[✗] <b>Заявка отклонена</b>

  <b>Детали:</b>
• Маршрут: ${booking.route}
• Причина: ${booking.reason}

🆔 <b>ID заявки:</b> ${booking.id}

<i>Попробуйте найти альтернативный трансфер.</i>
    `;

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML'
    });
  }

  // Напоминание о поездке
  async sendTripReminder(chatId: string, trip: {
    id: string;
    route: string;
    departureTime: string;
    meetingPoint: string;
    driverName: string;
    driverPhone: string;
  }): Promise<TelegramResponse> {
    const text = `
⏰ <b>Напоминание о поездке</b>

  <b>Детали:</b>
• Маршрут: ${trip.route}
• Время отправления: ${trip.departureTime}
• Место встречи: ${trip.meetingPoint}

  <b>Водитель:</b>
• Имя: ${trip.driverName}
• Телефон: <a href="tel:${trip.driverPhone}">${trip.driverPhone}</a>

🆔 <b>ID поездки:</b> ${trip.id}

<i>Пожалуйста, будьте готовы к поездке.</i>
    `;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '  Связаться с водителем',
            callback_data: `call_driver_${trip.driverPhone}`
          }
        ],
        [
          {
            text: '📍 Показать на карте',
            callback_data: `show_map_${trip.id}`
          }
        ]
      ]
    };

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
      replyMarkup
    });
  }

  // Статистика для оператора
  async sendOperatorStats(chatId: string, stats: {
    period: string;
    totalBookings: number;
    completedTrips: number;
    totalRevenue: number;
    averageRating: number;
    topRoutes: Array<{
      route: string;
      bookings: number;
    }>;
  }): Promise<TelegramResponse> {
    const text = `
  <b>Статистика за ${stats.period}</b>

  <b>Основные показатели:</b>
• Всего заявок: <b>${stats.totalBookings}</b>
• Выполнено поездок: <b>${stats.completedTrips}</b>
• Общий доход: <b>${stats.totalRevenue} ₽</b>
• Средний рейтинг: <b>${stats.averageRating}/5</b>

🏆 <b>Популярные маршруты:</b>
${stats.topRoutes.map(route => 
  `• ${route.route}: ${route.bookings} заявок`
).join('\n')}

<i>Продолжайте в том же духе!  </i>
    `;

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML'
    });
  }

  // Уведомление об отмене поездки
  async sendTripCancellation(chatId: string, cancellation: {
    id: string;
    route: string;
    date: string;
    reason: string;
    refundAmount?: number;
  }): Promise<TelegramResponse> {
    let text = `
[✗] <b>Поездка отменена</b>

  <b>Детали:</b>
• Маршрут: ${cancellation.route}
• Дата: ${cancellation.date}
• Причина: ${cancellation.reason}

🆔 <b>ID поездки:</b> ${cancellation.id}
    `;

    if (cancellation.refundAmount) {
      text += `\n  <b>Возврат:</b> ${cancellation.refundAmount} ₽`;
    }

    text += `\n\n<i>Если у вас есть вопросы, свяжитесь с нами.</i>`;

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML'
    });
  }

  // Уведомление о завершении поездки
  async sendTripCompleted(chatId: string, trip: {
    id: string;
    route: string;
    rating?: number;
    feedback?: string;
  }): Promise<TelegramResponse> {
    const text = `
[✓] <b>Поездка завершена</b>

  <b>Детали:</b>
• Маршрут: ${trip.route}
• Время завершения: ${new Date().toLocaleString('ru-RU')}

🆔 <b>ID поездки:</b> ${trip.id}

${trip.rating ? `★ <b>Оценка:</b> ${trip.rating}/5` : ''}
${trip.feedback ? `  <b>Отзыв:</b> ${trip.feedback}` : ''}

<i>Спасибо за использование наших услуг! 🙏</i>
    `;

    return this.sendMessage({
      chatId,
      text,
      parseMode: 'HTML'
    });
  }

  // Обработка callback запросов
  async handleCallbackQuery(callbackQuery: {
    id: string;
    data: string;
    from: {
      id: number;
      username?: string;
    };
  }): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> {
    try {
      const [action, type, ...params] = callbackQuery.data.split('_');
      
      switch (action) {
        case 'accept':
          if (type === 'booking') {
            const bookingId = params[0];
            // Логика принятия заявки
            return {
              success: true,
              response: `Заявка ${bookingId} принята!`
            };
          }
          break;
          
        case 'reject':
          if (type === 'booking') {
            const bookingId = params[0];
            // Логика отклонения заявки
            return {
              success: true,
              response: `Заявка ${bookingId} отклонена.`
            };
          }
          break;
          
        case 'call':
          if (type === 'passenger' || type === 'driver') {
            const phone = params[0];
            return {
              success: true,
              response: `Звонок на номер ${phone}`
            };
          }
          break;
          
        case 'show':
          if (type === 'map') {
            const tripId = params[0];
            return {
              success: true,
              response: `Показать карту для поездки ${tripId}`
            };
          }
          break;
      }
      
      return {
        success: false,
        error: 'Unknown callback action'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Получение информации о боте
  async getBotInfo(): Promise<{
    success: boolean;
    info?: any;
    error?: string;
  }> {
    if (!this.botToken) {
      return {
        success: false,
        error: 'Telegram bot not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          info: data.result
        };
      } else {
        return {
          success: false,
          error: data.description || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Создаем глобальный экземпляр
export const telegramService = new TelegramNotificationService();

// Экспортируем типы
export type { TelegramMessage, TelegramResponse };