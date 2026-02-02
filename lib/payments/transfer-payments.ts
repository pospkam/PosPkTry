// =============================================
// ПЛАТЕЖНАЯ СИСТЕМА ДЛЯ ТРАНСФЕРОВ
// Kamchatour Hub - Transfer Payment System
// =============================================

import { query } from '@/lib/database';

interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'wallet' | 'bank_transfer';
  customerInfo: {
    email: string;
    phone: string;
    name: string;
  };
  description: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  status?: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  redirectUrl?: string;
  error?: string;
}

interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  bookingId: string;
}

interface CommissionCalculation {
  grossAmount: number;
  platformCommission: number;
  operatorCommission: number;
  driverCommission: number;
  netAmount: number;
  commissionRate: number;
}

export class TransferPaymentSystem {
  private commissionRates = {
    platform: 0.15,    // 15% - платформа
    operator: 0.10,     // 10% - оператор
    driver: 0.75        // 75% - водитель
  };

  // Создание платежа
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // 1. Валидация данных
      const validation = await this.validatePaymentRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. Создание записи в базе данных
      const paymentId = await this.createPaymentRecord(request);

      // 3. Создание платежа в CloudPayments
      const cloudPaymentsResult = await this.createCloudPaymentsPayment({
        ...request,
        paymentId
      });

      if (!cloudPaymentsResult.success) {
        // Откатываем создание записи
        await this.cancelPaymentRecord(paymentId);
        return {
          success: false,
          error: cloudPaymentsResult.error
        };
      }

      // 4. Обновление статуса платежа
      await this.updatePaymentStatus(paymentId, 'processing');

      return {
        success: true,
        paymentId,
        status: 'processing',
        redirectUrl: cloudPaymentsResult.redirectUrl
      };

    } catch (error) {
      console.error('Payment creation error:', error);
      return {
        success: false,
        error: 'Ошибка создания платежа'
      };
    }
  }

  // Подтверждение платежа
  async confirmPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      // 1. Получаем информацию о платеже
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: 'Платеж не найден'
        };
      }

      // 2. Проверяем статус в CloudPayments
      const cloudPaymentsStatus = await this.checkCloudPaymentsStatus(paymentId);
      
      if (cloudPaymentsStatus.status === 'success') {
        // 3. Обновляем статус в базе данных
        await this.updatePaymentStatus(paymentId, 'success');
        
        // 4. Резервируем средства
        await this.reserveFunds(paymentId, payment.amount);
        
        // 5. Обновляем статус бронирования
        await this.updateBookingStatus(payment.booking_id, 'confirmed');
        
        // 6. Отправляем уведомления
        await this.sendPaymentNotifications(paymentId, 'success');

        return {
          success: true,
          paymentId,
          status: 'success'
        };
      } else if (cloudPaymentsStatus.status === 'failed') {
        await this.updatePaymentStatus(paymentId, 'failed');
        await this.updateBookingStatus(payment.booking_id, 'cancelled');
        
        return {
          success: false,
          paymentId,
          status: 'failed',
          error: 'Платеж не прошел'
        };
      } else {
        return {
          success: true,
          paymentId,
          status: 'processing'
        };
      }

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: 'Ошибка подтверждения платежа'
      };
    }
  }

  // Возврат средств
  async processRefund(request: RefundRequest): Promise<PaymentResponse> {
    try {
      // 1. Получаем информацию о платеже
      const payment = await this.getPaymentById(request.paymentId);
      if (!payment) {
        return {
          success: false,
          error: 'Платеж не найден'
        };
      }

      // 2. Проверяем возможность возврата
      if (payment.status !== 'success') {
        return {
          success: false,
          error: 'Платеж не может быть возвращен'
        };
      }

      // 3. Создаем возврат в CloudPayments
      const refundResult = await this.createCloudPaymentsRefund({
        paymentId: request.paymentId,
        amount: request.amount,
        reason: request.reason
      });

      if (!refundResult.success) {
        return {
          success: false,
          error: refundResult.error
        };
      }

      // 4. Обновляем статус платежа
      await this.updatePaymentStatus(request.paymentId, 'refunded');
      
      // 5. Обновляем статус бронирования
      await this.updateBookingStatus(request.bookingId, 'cancelled');
      
      // 6. Освобождаем зарезервированные средства
      await this.releaseFunds(request.paymentId);

      return {
        success: true,
        paymentId: request.paymentId,
        status: 'refunded'
      };

    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: 'Ошибка обработки возврата'
      };
    }
  }

  // Расчет комиссий
  calculateCommission(amount: number): CommissionCalculation {
    const platformCommission = amount * this.commissionRates.platform;
    const operatorCommission = amount * this.commissionRates.operator;
    const driverCommission = amount * this.commissionRates.driver;
    const netAmount = amount - platformCommission;

    return {
      grossAmount: amount,
      platformCommission,
      operatorCommission,
      driverCommission,
      netAmount,
      commissionRate: this.commissionRates.platform
    };
  }

  // Валидация запроса на платеж
  private async validatePaymentRequest(request: PaymentRequest): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Проверяем существование бронирования
    const booking = await this.getBookingById(request.bookingId);
    if (!booking) {
      return {
        valid: false,
        error: 'Бронирование не найдено'
      };
    }

    // Проверяем статус бронирования
    if (booking.status !== 'pending') {
      return {
        valid: false,
        error: 'Бронирование уже обработано'
      };
    }

    // Проверяем сумму
    if (request.amount <= 0) {
      return {
        valid: false,
        error: 'Неверная сумма платежа'
      };
    }

    // Проверяем валюту
    if (!['RUB', 'USD', 'EUR'].includes(request.currency)) {
      return {
        valid: false,
        error: 'Неподдерживаемая валюта'
      };
    }

    return { valid: true };
  }

  // Создание записи платежа в базе данных
  private async createPaymentRecord(request: PaymentRequest): Promise<string> {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queryText = `
      INSERT INTO transfer_payments (
        id, booking_id, amount, currency, payment_method, 
        customer_email, customer_phone, customer_name, 
        description, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `;

    await query(queryText, [
      paymentId,
      request.bookingId,
      request.amount,
      request.currency,
      request.paymentMethod,
      request.customerInfo.email,
      request.customerInfo.phone,
      request.customerInfo.name,
      request.description,
      'pending'
    ]);

    return paymentId;
  }

  // Создание платежа в CloudPayments
  private async createCloudPaymentsPayment(request: PaymentRequest & { paymentId: string }): Promise<{
    success: boolean;
    redirectUrl?: string;
    error?: string;
  }> {
    try {
      // Здесь будет реальная интеграция с CloudPayments API
      const cloudPaymentsData = {
        Amount: request.amount,
        Currency: request.currency,
        InvoiceId: request.paymentId,
        Description: request.description,
        Email: request.customerInfo.email,
        Phone: request.customerInfo.phone,
        Name: request.customerInfo.name,
        JsonData: {
          bookingId: request.bookingId,
          paymentMethod: request.paymentMethod
        }
      };

      // Заглушка для демонстрации
      console.log('CloudPayments payment creation:', cloudPaymentsData);
      
      return {
        success: true,
        redirectUrl: `https://cloudpayments.ru/pay?amount=${request.amount}&currency=${request.currency}`
      };

    } catch (error) {
      console.error('CloudPayments payment creation error:', error);
      return {
        success: false,
        error: 'Ошибка создания платежа в CloudPayments'
      };
    }
  }

  // Проверка статуса платежа в CloudPayments
  private async checkCloudPaymentsStatus(paymentId: string): Promise<{
    status: 'pending' | 'processing' | 'success' | 'failed';
  }> {
    try {
      // Здесь будет реальный запрос к CloudPayments API
      console.log('Checking CloudPayments status for:', paymentId);
      
      // Заглушка для демонстрации
      return { status: 'success' };

    } catch (error) {
      console.error('CloudPayments status check error:', error);
      return { status: 'failed' };
    }
  }

  // Создание возврата в CloudPayments
  private async createCloudPaymentsRefund(request: {
    paymentId: string;
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Здесь будет реальная интеграция с CloudPayments API для возвратов
      console.log('CloudPayments refund creation:', request);
      
      return { success: true };

    } catch (error) {
      console.error('CloudPayments refund creation error:', error);
      return {
        success: false,
        error: 'Ошибка создания возврата в CloudPayments'
      };
    }
  }

  // Получение платежа по ID
  async getPaymentById(paymentId: string): Promise<any> {
    const result = await query(
      'SELECT * FROM transfer_payments WHERE id = $1',
      [paymentId]
    );
    return result.rows[0];
  }

  // Получение бронирования по ID
  private async getBookingById(bookingId: string): Promise<any> {
    const result = await query(
      'SELECT * FROM transfer_bookings WHERE id = $1',
      [bookingId]
    );
    return result.rows[0];
  }

  // Обновление статуса платежа
  private async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    await query(
      'UPDATE transfer_payments SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, paymentId]
    );
  }

  // Обновление статуса бронирования
  private async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    await query(
      'UPDATE transfer_bookings SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, bookingId]
    );
  }

  // Резервирование средств
  private async reserveFunds(paymentId: string, amount: number): Promise<void> {
    // Здесь будет логика резервирования средств
    console.log('Reserving funds:', { paymentId, amount });
  }

  // Освобождение зарезервированных средств
  private async releaseFunds(paymentId: string): Promise<void> {
    // Здесь будет логика освобождения средств
    console.log('Releasing funds:', paymentId);
  }

  // Отмена записи платежа
  private async cancelPaymentRecord(paymentId: string): Promise<void> {
    await query(
      'DELETE FROM transfer_payments WHERE id = $1',
      [paymentId]
    );
  }

  // Отправка уведомлений о платеже
  private async sendPaymentNotifications(paymentId: string, status: string): Promise<void> {
    // Здесь будет отправка уведомлений о статусе платежа
    console.log('Sending payment notifications:', { paymentId, status });
  }

  // Получение статистики платежей
  async getPaymentStats(period: string = '7 days'): Promise<{
    totalPayments: number;
    successfulPayments: number;
    totalAmount: number;
    averageAmount: number;
    refunds: number;
    refundAmount: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
          SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_amount,
          AVG(CASE WHEN status = 'success' THEN amount ELSE NULL END) as average_amount,
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunds,
          SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as refund_amount
        FROM transfer_payments 
        WHERE created_at >= NOW() - INTERVAL '${period}'
      `);

      const row = result.rows[0];
      return {
        totalPayments: parseInt(row.total_payments),
        successfulPayments: parseInt(row.successful_payments),
        totalAmount: parseFloat(row.total_amount || 0),
        averageAmount: parseFloat(row.average_amount || 0),
        refunds: parseInt(row.refunds),
        refundAmount: parseFloat(row.refund_amount || 0)
      };

    } catch (error) {
      console.error('Payment stats error:', error);
      return {
        totalPayments: 0,
        successfulPayments: 0,
        totalAmount: 0,
        averageAmount: 0,
        refunds: 0,
        refundAmount: 0
      };
    }
  }
}

// Создаем глобальный экземпляр
export const transferPayments = new TransferPaymentSystem();

// Экспортируем типы
export type { PaymentRequest, PaymentResponse, RefundRequest, CommissionCalculation };