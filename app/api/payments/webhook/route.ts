import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { processCloudPaymentsWebhook, CloudPaymentsWebhook } from '@/lib/payments/cloudpayments-webhook';
import { emailService } from '@/lib/notifications/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook
 * CloudPayments webhook endpoint
 * Обработка уведомлений о платежах
 */
export async function POST(request: NextRequest) {
  try {
    // Получаем сырое тело запроса и подпись
    const body = await request.text();
    const signature = request.headers.get('X-Content-HMAC');

    // Валидация webhook
    const validationResult = await processCloudPaymentsWebhook(body, signature);

    if (!validationResult.success) {
      console.error('Webhook validation failed:', validationResult.error);
      return NextResponse.json({
        code: 13,
        message: validationResult.error || 'Invalid webhook'
      }, { status: 400 });
    }

    const webhookData = validationResult.data as CloudPaymentsWebhook;

    // Обработка webhook в зависимости от статуса
    switch (webhookData.Status) {
      case 'Completed':
        await handleSuccessfulPayment(webhookData);
        break;
      case 'Declined':
      case 'Cancelled':
        await handleFailedPayment(webhookData);
        break;
      case 'Pending':
        await handlePendingPayment(webhookData);
        break;
      default:
        console.warn('Unknown payment status:', webhookData.Status);
    }

    // CloudPayments ждёт ответ с code: 0
    return NextResponse.json({ code: 0 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      code: 13,
      message: 'Internal error'
    }, { status: 500 });
  }
}

/**
 * Обработка успешного платежа
 */
async function handleSuccessfulPayment(webhook: CloudPaymentsWebhook) {
  try {
    const paymentId = webhook.InvoiceId;
    const transactionId = webhook.TransactionId;

    // Обновляем статус платежа
    const updatePaymentQuery = `
      UPDATE payments
      SET 
        status = 'completed',
        transaction_id = $1,
        payment_data = $2,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING booking_id, booking_type, user_id
    `;

    const paymentResult = await query(updatePaymentQuery, [
      transactionId.toString(),
      JSON.stringify(webhook),
      paymentId
    ]);

    if (paymentResult.rows.length === 0) {
      console.error('Payment not found:', paymentId);
      return;
    }

    const payment = paymentResult.rows[0];

    // Обновляем статус бронирования
    let updateBookingQuery = '';
    switch (payment.booking_type) {
      case 'tour':
        updateBookingQuery = `
          UPDATE bookings
          SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
          WHERE id = $1
        `;
        break;
      case 'accommodation':
        updateBookingQuery = `
          UPDATE accommodation_bookings
          SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
          WHERE id = $1
        `;
        break;
      case 'transfer':
        updateBookingQuery = `
          UPDATE transfer_bookings
          SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
          WHERE id = $1
        `;
        break;
    }

    if (updateBookingQuery) {
      await query(updateBookingQuery, [payment.booking_id]);
    }

    // Отправляем email уведомление о подтверждении оплаты
    try {
      // Получаем детали бронирования для email
      let bookingDetails: any = null;
      let emailSubject = '';
      let emailContent = '';

      switch (payment.booking_type) {
        case 'tour':
          const tourBooking = await query(`
            SELECT b.*, t.name as tour_name, p.name as operator_name
            FROM bookings b
            JOIN tours t ON b.tour_id = t.id
            JOIN partners p ON t.operator_id = p.id
            WHERE b.id = $1
          `, [payment.booking_id]);
          if (tourBooking.rows.length > 0) {
            bookingDetails = tourBooking.rows[0];
            emailSubject = `Оплата подтверждена: ${bookingDetails.tour_name}`;
            emailContent = `
              <h2>Ваша оплата подтверждена!</h2>
              <p><strong>Тур:</strong> ${bookingDetails.tour_name}</p>
              <p><strong>Оператор:</strong> ${bookingDetails.operator_name}</p>
              <p><strong>Дата:</strong> ${bookingDetails.start_date}</p>
              <p><strong>Участники:</strong> ${bookingDetails.guests_count}</p>
              <p><strong>Сумма оплаты:</strong> ${webhook.Amount.toLocaleString('ru-RU')} ₽</p>
              <p><strong>ID транзакции:</strong> ${transactionId}</p>
              <p>Бронирование подтверждено. Детали тура будут отправлены дополнительно.</p>
            `;
          }
          break;

        case 'accommodation':
          const accommodationBooking = await query(`
            SELECT ab.*, a.name as accommodation_name, r.name as room_name
            FROM accommodation_bookings ab
            JOIN accommodation_rooms r ON ab.room_id = r.id
            JOIN accommodations a ON ab.accommodation_id = a.id
            WHERE ab.id = $1
          `, [payment.booking_id]);
          if (accommodationBooking.rows.length > 0) {
            bookingDetails = accommodationBooking.rows[0];
            emailSubject = `Оплата подтверждена: ${bookingDetails.accommodation_name}`;
            emailContent = `
              <h2>Ваша оплата подтверждена!</h2>
              <p><strong>Размещение:</strong> ${bookingDetails.accommodation_name}</p>
              <p><strong>Номер:</strong> ${bookingDetails.room_name}</p>
              <p><strong>Заезд:</strong> ${bookingDetails.check_in_date}</p>
              <p><strong>Выезд:</strong> ${bookingDetails.check_out_date}</p>
              <p><strong>Гости:</strong> ${bookingDetails.adults} взрослых, ${bookingDetails.children} детей</p>
              <p><strong>Сумма оплаты:</strong> ${webhook.Amount.toLocaleString('ru-RU')} ₽</p>
              <p><strong>ID транзакции:</strong> ${transactionId}</p>
              <p>Бронирование подтверждено. Адрес и инструкции по заселению будут отправлены дополнительно.</p>
            `;
          }
          break;

        case 'transfer':
          const transferBooking = await query(`
            SELECT tb.*, ts.from_location, ts.to_location, d.name as driver_name
            FROM transfer_bookings tb
            JOIN transfer_schedules ts ON tb.schedule_id = ts.id
            LEFT JOIN transfer_drivers d ON tb.driver_id = d.id
            WHERE tb.id = $1
          `, [payment.booking_id]);
          if (transferBooking.rows.length > 0) {
            bookingDetails = transferBooking.rows[0];
            emailSubject = `Оплата подтверждена: Трансфер ${transferBooking.rows[0].from_location} → ${transferBooking.rows[0].to_location}`;
            emailContent = `
              <h2>Ваша оплата подтверждена!</h2>
              <p><strong>Маршрут:</strong> ${transferBooking.rows[0].from_location} → ${transferBooking.rows[0].to_location}</p>
              <p><strong>Дата и время:</strong> ${transferBooking.rows[0].departure_time}</p>
              <p><strong>Водитель:</strong> ${transferBooking.rows[0].driver_name || 'Будет назначен'}</p>
              <p><strong>Пассажиры:</strong> ${transferBooking.rows[0].passengers_count}</p>
              <p><strong>Сумма оплаты:</strong> ${webhook.Amount.toLocaleString('ru-RU')} ₽</p>
              <p><strong>ID транзакции:</strong> ${transactionId}</p>
              <p>Бронирование подтверждено. Детали трансфера будут отправлены за 24 часа.</p>
            `;
          }
          break;
      }

      if (bookingDetails) {
        await emailService.sendEmail({
          to: 'user@example.com', // TODO: Получить email из payment.user_id
          subject: emailSubject,
          html: emailContent
        });
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Не прерываем выполнение при ошибке email
    }

    console.log('Payment processed successfully:', {
      paymentId,
      transactionId,
      bookingId: payment.booking_id
    });

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

/**
 * Обработка неуспешного платежа
 */
async function handleFailedPayment(webhook: CloudPaymentsWebhook) {
  try {
    const paymentId = webhook.InvoiceId;

    // Обновляем статус платежа
    const updateQuery = `
      UPDATE payments
      SET 
        status = 'failed',
        transaction_id = $1,
        payment_data = $2,
        failure_reason = $3,
        updated_at = NOW()
      WHERE id = $4
    `;

    await query(updateQuery, [
      webhook.TransactionId.toString(),
      JSON.stringify(webhook),
      webhook.Reason || 'Payment declined',
      paymentId
    ]);

    // Отправляем email о неуспешном платеже
    try {
      // Получаем детали платежа для email
      const paymentDetails = await query(`
        SELECT p.*, b.booking_type
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id AND p.booking_type = 'tour'
        LEFT JOIN accommodation_bookings ab ON p.booking_id = ab.id AND p.booking_type = 'accommodation'
        LEFT JOIN transfer_bookings tb ON p.booking_id = tb.id AND p.booking_type = 'transfer'
        WHERE p.id = $1
      `, [paymentId]);

      if (paymentDetails.rows.length > 0) {
        const payment = paymentDetails.rows[0];
        const failureReason = webhook.Reason || 'Платёж был отклонён';

        await emailService.sendEmail({
          to: 'user@example.com', // TODO: Получить email из payment.user_id
          subject: `Платёж не прошёл - ID ${paymentId.substring(0, 8)}`,
          html: `
            <h2>К сожалению, платёж не прошёл</h2>
            <p><strong>ID платежа:</strong> ${paymentId}</p>
            <p><strong>Сумма:</strong> ${payment.amount.toLocaleString('ru-RU')} ₽</p>
            <p><strong>Причина:</strong> ${failureReason}</p>
            <p>Попробуйте оплатить снова или свяжитесь с поддержкой.</p>
            <p><strong>Служба поддержки:</strong> support@kamhub.ru</p>
          `
        });
      }
    } catch (emailError) {
      console.error('Error sending payment failure email:', emailError);
      // Не прерываем выполнение при ошибке email
    }

    console.log('Failed payment recorded:', paymentId);

  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

/**
 * Обработка платежа в ожидании
 */
async function handlePendingPayment(webhook: CloudPaymentsWebhook) {
  try {
    const paymentId = webhook.InvoiceId;

    // Обновляем статус
    const updateQuery = `
      UPDATE payments
      SET 
        status = 'processing',
        transaction_id = $1,
        payment_data = $2,
        updated_at = NOW()
      WHERE id = $3
    `;

    await query(updateQuery, [
      webhook.TransactionId.toString(),
      JSON.stringify(webhook),
      paymentId
    ]);

    console.log('Payment pending:', paymentId);

  } catch (error) {
    console.error('Error handling pending payment:', error);
    throw error;
  }
}


