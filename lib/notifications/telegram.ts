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
  // Токен читается при каждом вызове — защита от cold start race condition
  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get baseUrl(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
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

  // Уведомление партнёру о новом рыболовном туре (с кнопками Подтвердить / Отменить)
  async sendTourBookingNotification(chatId: string, booking: {
    id: string;
    tourName: string;
    departureDate: string;
    participants: number;
    totalAmount: number;
    touristName: string;
    touristEmail: string;
    specialRequests?: string | null;
  }): Promise<TelegramResponse> {
    const date = new Date(booking.departureDate).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const lines: string[] = [
      '🎣 <b>Новое бронирование тура!</b>',
      '',
      `<b>Тур:</b> ${booking.tourName}`,
      `<b>Дата заезда:</b> ${date}`,
      `<b>Участников:</b> ${booking.participants} чел.`,
      `<b>Сумма:</b> ${booking.totalAmount.toLocaleString('ru-RU')} ₽`,
      '',
      `👤 <b>Гость:</b> ${booking.touristName}`,
      `📧 ${booking.touristEmail}`,
    ];
    if (booking.specialRequests) {
      lines.push(`\n📝 <i>${booking.specialRequests}</i>`);
    }
    lines.push('', `🆔 ID: <code>${booking.id}</code>`);

    const replyMarkup = {
      inline_keyboard: [[
        { text: '✅ Подтвердить', callback_data: `confirm_${booking.id}` },
        { text: '❌ Отменить',    callback_data: `cancel_${booking.id}`  },
      ]],
    };

    return this.sendMessage({ chatId, text: lines.join('\n'), parseMode: 'HTML', replyMarkup });
  }

  // Ответ боту — убирает спиннер с inline-кнопки после нажатия
  async answerCallback(callbackQueryId: string, text?: string): Promise<void> {
    if (!this.botToken) return;
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text ?? '' }),
    }).catch(() => { /* не прерываем при ошибке */ });
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