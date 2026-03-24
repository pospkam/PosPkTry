/**
 * CLOUDPAYMENTS WEBHOOK ENDPOINT
 * Прием уведомлений от CloudPayments о платежах
 * 
 * ! КРИТИЧНО: Этот endpoint ДОЛЖЕН быть защищен HMAC подписью!
 * 
 * CloudPayments отправляет webhook на этот URL при:
 * - Успешном платеже (Status: Completed)
 * - Отклоненном платеже (Status: Declined)
 * - Возврате (Status: Refunded)
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 */

import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { processCloudPaymentsWebhook } from '@/lib/payments/cloudpayments-webhook';
import { transaction } from '@/lib/database';

// Simple error class for business logic errors
class BusinessError extends Error {
  code: string;
  details: any;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
  }
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/cloudpayments
 * 
 * CloudPayments отправляет POST запрос с:
 * - Header: X-Content-HMAC (HMAC-SHA256 подпись)
 * - Body: JSON с данными платежа
 * 
 * Response:
 * - { code: 0 } = успех (CloudPayments повторно не отправит)
 * - { code: 13 } = ошибка (CloudPayments повторит через 1 час, максимум 10 раз)
 *
 * AUTH: Public by design — webhooks protected by X-Content-HMAC (HMAC-SHA256).
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    //   БЕЗОПАСНОСТЬ: Получаем raw body для валидации HMAC
    const rawBody = await request.text();
    
    // Получаем подпись из header
    const signature = request.headers.get('X-Content-HMAC');
    
    
    //   ВАЛИДАЦИЯ WEBHOOK
    const validation = await processCloudPaymentsWebhook(rawBody, signature);
    
    if (!validation.success) {
      // CloudPayments код 13 = отклонено (повторит позже)
      return NextResponse.json({ code: 13 });
    }
    
    const webhookData = validation.data!;
    
    
    //   ОБРАБОТКА WEBHOOK В ТРАНЗАКЦИИ
    const result = await transaction(async (client) => {
      const bookingId = webhookData.InvoiceId;
      const transactionId = webhookData.TransactionId.toString();
      
      // 1. Проверяем что бронирование существует
      const bookingCheck = await client.query(
        `SELECT * FROM transfer_bookings WHERE id = $1`,
        [bookingId]
      );
      
      if (bookingCheck.rows.length === 0) {
        throw new BusinessError(
          `Booking not found: ${bookingId}`,
          'BOOKING_NOT_FOUND',
          { bookingId }
        );
      }
      
      const booking = bookingCheck.rows[0];
      
      // 2. Проверяем сумму платежа
      const expectedAmount = parseFloat(booking.total_price);
      const paidAmount = webhookData.Amount;
      
      if (Math.abs(expectedAmount - paidAmount) > 0.01) {
        throw new BusinessError(
          `Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`,
          'AMOUNT_MISMATCH',
          { expected: expectedAmount, actual: paidAmount }
        );
      }
      
      // 3. Обрабатываем в зависимости от статуса
      if (webhookData.Status === 'Completed') {
        // УСПЕШНЫЙ ПЛАТЕЖ
        
        // Создаем запись о платеже
        await client.query(`
          INSERT INTO transfer_payments (
            id,
            booking_id,
            transaction_id,
            amount,
            currency,
            status,
            payment_method,
            customer_email,
            customer_phone,
            processed_at,
            created_at
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, $4, 'success', 'card', $5, $6, NOW(), NOW()
          )
          ON CONFLICT (transaction_id) DO NOTHING
        `, [
          bookingId,
          transactionId,
          webhookData.Amount,
          webhookData.Currency,
          webhookData.Email,
          webhookData.AccountId
        ]);
        
        // Обновляем статус бронирования
        await client.query(`
          UPDATE transfer_bookings
          SET status = 'confirmed', updated_at = NOW()
          WHERE id = $1 AND status = 'pending'
        `, [bookingId]);
        
        // Создаем уведомление
        await client.query(`
          INSERT INTO transfer_notifications (
            booking_id,
            user_id,
            operator_id,
            type,
            title,
            message,
            created_at
          ) VALUES ($1, $2, $3, 'payment_success', 'Оплата прошла успешно', 
                   'Ваше бронирование подтверждено! Платеж получен.', NOW())
        `, [bookingId, booking.user_id, booking.operator_id]);
        
        
      } else if (webhookData.Status === 'Declined') {
        // ОТКЛОНЕННЫЙ ПЛАТЕЖ
        
        // Создаем запись о неудачном платеже
        await client.query(`
          INSERT INTO transfer_payments (
            id,
            booking_id,
            transaction_id,
            amount,
            currency,
            status,
            payment_method,
            customer_email,
            error_message,
            processed_at,
            created_at
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, $4, 'failed', 'card', $5, $6, NOW(), NOW()
          )
        `, [
          bookingId,
          transactionId,
          webhookData.Amount,
          webhookData.Currency,
          webhookData.Email,
          webhookData.Reason || 'Payment declined'
        ]);
        
        // Отменяем бронирование и возвращаем места
        const { cancelBooking } = await import('@/lib/transfers/booking');
        await cancelBooking(bookingId, `Payment declined: ${webhookData.Reason}`);
        
      }
      
      return { success: true };
    });
    
    // CloudPayments ожидает { code: 0 } для успеха
    return NextResponse.json({ code: 0 });
    
  } catch (error: unknown) {
    
    // CloudPayments код 13 = ошибка (повторит позже)
    return NextResponse.json({ 
      code: 13,
      error: safeMsg(error) 
    });
  } finally {
    const duration = Date.now() - startTime;
  }
}

/**
 * GET /api/webhooks/cloudpayments
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: 'CloudPayments Webhook',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}
