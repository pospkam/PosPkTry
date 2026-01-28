/**
 * INTEGRATION TESTS: Complete Business Processes
 * 
 * Тестирование полных workflow'ов и взаимодействия между ролями
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@/app';
import { testUtils } from '@tests/setup';

describe('INTEGRATION: Tourist Complete Booking Journey', () => {
  let touristToken: string;
  let tourId: string;
  let bookingId: string;
  let paymentId: string;

  beforeEach(async () => {
    touristToken = testUtils.generateTestToken('tourist-1', 'TOURIST');

    // Создаем тур (от оператора)
    const operatorToken = testUtils.generateTestToken('operator-1', 'OPERATOR');
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Integration Test Tour',
        difficulty: 'easy',
        price_from: 10000,
        price_to: 15000,
        max_participants: 10,
        duration_days: 2
      });

    tourId = tourResponse.body.data.id;

    // Публикуем тур
    await request(app)
      .post(`/api/operator/tours/${tourId}/publish`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({});
  });

  test('complete journey: search → book → pay → complete → review → earn points', async () => {
    // 1. Поиск туров
    const searchResponse = await request(app)
      .get('/api/tours/search')
      .set('Authorization', `Bearer ${touristToken}`)
      .query({
        location: 'Kamchatka',
        difficulty: 'easy'
      });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.tours.length).toBeGreaterThan(0);

    // 2. Бронирование тура
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 2,
        special_requests: 'Vegetarian option'
      });

    expect(bookingResponse.status).toBe(201);
    bookingId = bookingResponse.body.data.id;
    const totalPrice = bookingResponse.body.data.total_price;

    // 3. Инициирование платежа
    const paymentResponse = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        booking_id: bookingId,
        method: 'credit_card',
        amount: totalPrice
      });

    expect(paymentResponse.status).toBe(200);
    paymentId = paymentResponse.body.data.payment_id;

    // 4. Подтверждение платежа (webhook)
    const confirmResponse = await request(app)
      .post('/webhooks/cloudpayments')
      .send({
        transaction_id: paymentId,
        booking_id: bookingId,
        status: 'completed',
        amount: totalPrice
      });

    expect(confirmResponse.status).toBe(200);

    // 5. Проверка статуса бронирования (должно быть confirmed)
    const statusResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${touristToken}`);

    expect(statusResponse.body.data.status).toBe('confirmed');

    // 6. Симуляция завершения тура
    await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({});

    // 7. Добавление отзыва
    const reviewResponse = await request(app)
      .post(`/api/tours/${tourId}/reviews`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        rating: 5,
        comment: 'Excellent tour!',
        photos: []
      });

    expect(reviewResponse.status).toBe(201);

    // 8. Проверка начисленных баллов
    const loyaltyResponse = await request(app)
      .get('/api/loyalty/profile')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(loyaltyResponse.body.data.points).toBeGreaterThan(0);
    expect(loyaltyResponse.body.data.level).toBeDefined();
  });

  test('booking with multiple services and single payment', async () => {
    // 1. Создание полного бронирования (тур + трансфер + снаряжение + сувениры)
    const multiServiceBooking = await request(app)
      .post('/api/bookings/multi-service')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        transfer: {
          from: 'Airport',
          to: 'Hotel',
          return_trip: true
        },
        gear_rental: {
          items: ['climbing_gear', 'waterproof_bag'],
          days: 2
        },
        souvenirs: {
          items: ['magnet', 'postcard_set']
        }
      });

    expect(multiServiceBooking.status).toBe(201);
    const { booking_id, total_price, breakdown } = multiServiceBooking.body.data;

    // 2. Единый платеж
    const paymentResponse = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        booking_id,
        method: 'credit_card',
        amount: total_price
      });

    expect(paymentResponse.status).toBe(200);

    // 3. Проверка распределения платежа
    const breakdownResponse = await request(app)
      .get(`/api/bookings/${booking_id}/payment-breakdown`)
      .set('Authorization', `Bearer ${touristToken}`);

    expect(breakdownResponse.body.data).toHaveProperty('tour_amount');
    expect(breakdownResponse.body.data).toHaveProperty('transfer_amount');
    expect(breakdownResponse.body.data).toHaveProperty('gear_amount');
    expect(breakdownResponse.body.data).toHaveProperty('souvenir_amount');
  });
});

describe('INTEGRATION: Operator Revenue and Commission Flow', () => {
  let operatorToken: string;
  let operatorId = 'operator-1';

  beforeEach(async () => {
    operatorToken = testUtils.generateTestToken(operatorId, 'OPERATOR');
  });

  test('complete revenue workflow: tour → bookings → commission → payout', async () => {
    // 1. Создание и публикация тура
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Revenue Test Tour',
        difficulty: 'medium',
        price_from: 20000,
        price_to: 30000,
        max_participants: 20,
        duration_days: 3
      });

    const tourId = tourResponse.body.data.id;

    // 2. Получение текущего дохода (должен быть 0)
    let revenueResponse = await request(app)
      .get('/api/operator/dashboard/revenue')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({ period: 'month' });

    const initialRevenue = revenueResponse.body.data.total_revenue;

    // 3. Создание нескольких бронирований
    for (let i = 0; i < 3; i++) {
      const touristToken = testUtils.generateTestToken(`tourist-${i}`, 'TOURIST');

      // Создание бронирования
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          tour_id: tourId,
          participants: 2
        });

      const bookingId = bookingResponse.body.data.id;

      // Оплата
      await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          booking_id: bookingId,
          method: 'credit_card',
          amount: bookingResponse.body.data.total_price
        });
    }

    // 4. Проверка увеличенного дохода
    revenueResponse = await request(app)
      .get('/api/operator/dashboard/revenue')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({ period: 'month' });

    const newRevenue = revenueResponse.body.data.total_revenue;
    expect(newRevenue).toBeGreaterThan(initialRevenue);

    // 5. Запрос комиссионных
    const commissionResponse = await request(app)
      .post('/api/operator/financial/payout-request')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        amount: newRevenue * 0.9, // Минус комиссия платформы
        payment_method: 'bank_transfer',
        bank_details: {
          account_number: '40817810010000000123',
          bic: '044525225',
          bank_name: 'Sber'
        }
      });

    expect(commissionResponse.status).toBe(201);
    expect(commissionResponse.body.data.status).toBe('pending_approval');

    // 6. Одобрение выплаты (от администратора)
    const adminToken = testUtils.generateTestToken('admin-1', 'ADMIN');
    const approvalResponse = await request(app)
      .post(`/api/admin/finance/payouts/${commissionResponse.body.data.payout_id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(approvalResponse.status).toBe(200);
  });
});

describe('INTEGRATION: Multi-Role Coordination', () => {
  test('complex booking with tour + transfer + guide assignment', async () => {
    // Подготовка
    const touristToken = testUtils.generateTestToken('tourist-1', 'TOURIST');
    const operatorToken = testUtils.generateTestToken('operator-1', 'OPERATOR');
    const guideToken = testUtils.generateTestToken('guide-1', 'GUIDE');
    const transferToken = testUtils.generateTestToken('transfer-1', 'TRANSFER_OPERATOR');

    // 1. Оператор создает тур
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Multi-Service Tour',
        difficulty: 'hard',
        price_from: 50000,
        price_to: 70000,
        max_participants: 12,
        duration_days: 5
      });

    const tourId = tourResponse.body.data.id;

    // 2. Туристе бронирует тур с трансфером
    const bookingResponse = await request(app)
      .post('/api/bookings/multi-service')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        transfer: {
          from: 'Airport',
          to: 'Hotel',
          return_trip: true,
          passengers: 4
        }
      });

    const bookingId = bookingResponse.body.data.id;

    // 3. Оплата
    await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        booking_id: bookingId,
        method: 'credit_card',
        amount: bookingResponse.body.data.total_price
      });

    // 4. Оператор получает уведомление о новом бронировании
    const bookingListResponse = await request(app)
      .get('/api/operator/bookings')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(bookingListResponse.body.data.bookings.length).toBeGreaterThan(0);

    // 5. Оператор назначает гида
    await request(app)
      .post(`/api/operator/tours/${tourId}/assign-guide`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        guide_id: 'guide-1',
        date: '2024-06-15'
      });

    // 6. Оператор согласовывает трансфер с оператором трансфера
    const transferResponse = await request(app)
      .post('/api/transfers/book')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        from: 'Airport',
        to: 'Hotel',
        date: '2024-06-15',
        time: '14:00',
        passengers: 4,
        linked_booking_id: bookingId
      });

    expect(transferResponse.status).toBe(201);

    // 7. Гид видит свое расписание
    const scheduleResponse = await request(app)
      .get('/api/guide/schedule/2024-06-15')
      .set('Authorization', `Bearer ${guideToken}`);

    expect(scheduleResponse.body.data.tours.length).toBeGreaterThan(0);

    // 8. Гид видит детали бронирования
    const guideTourResponse = await request(app)
      .get(`/api/guide/tours/${tourId}`)
      .set('Authorization', `Bearer ${guideToken}`);

    expect(guideTourResponse.body.data).toHaveProperty('participants_count');
    expect(guideTourResponse.body.data).toHaveProperty('special_requests');

    // 9. Туристе видит полную информацию о своем бронировании
    const touristBookingResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${touristToken}`);

    expect(touristBookingResponse.body.data).toHaveProperty('guide_id', 'guide-1');
    expect(touristBookingResponse.body.data).toHaveProperty('transfer_booking_id');
  });
});

describe('INTEGRATION: Security and Compliance', () => {
  test('should prevent unauthorized cross-role access', async () => {
    const touristToken = testUtils.generateTestToken('tourist-1', 'TOURIST');

    // Туристе не должен получить доступ к финансовым данным оператора
    const response = await request(app)
      .get('/api/operator/financial/payouts')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(response.status).toBe(403);
  });

  test('should maintain data isolation between operators', async () => {
    const operator1Token = testUtils.generateTestToken('operator-1', 'OPERATOR');
    const operator2Token = testUtils.generateTestToken('operator-2', 'OPERATOR');

    // Operator 1 создает тур
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operator1Token}`)
      .send({
        title: 'Private Tour',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 10,
        duration_days: 1
      });

    const tourId = tourResponse.body.data.id;

    // Operator 2 не должен иметь доступ
    const response = await request(app)
      .patch(`/api/operator/tours/${tourId}`)
      .set('Authorization', `Bearer ${operator2Token}`)
      .send({ title: 'Modified Title' });

    expect(response.status).toBe(403);
  });

  test('should log all admin actions', async () => {
    const adminToken = testUtils.generateTestToken('admin-1', 'ADMIN');

    // Выполняем действие
    await request(app)
      .post('/api/admin/content/reviews/review-123/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve'
      });

    // Проверяем логи
    const logsResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(logsResponse.status).toBe(200);
    const recentLog = logsResponse.body.data.logs[0];
    expect(recentLog.user_id).toBe('admin-1');
    expect(recentLog.action).toContain('moderate');
  });
});

describe('INTEGRATION: Payment and Refund Workflows', () => {
  test('complete refund process on booking cancellation', async () => {
    const touristToken = testUtils.generateTestToken('tourist-1', 'TOURIST');
    const operatorToken = testUtils.generateTestToken('operator-1', 'OPERATOR');

    // 1. Создание и бронирование тура
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Refundable Tour',
        difficulty: 'easy',
        price_from: 10000,
        price_to: 15000,
        max_participants: 10,
        duration_days: 1
      });

    const tourId = tourResponse.body.data.id;

    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 2
      });

    const bookingId = bookingResponse.body.data.id;
    const originalPrice = bookingResponse.body.data.total_price;

    // 2. Оплата
    const paymentResponse = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        booking_id: bookingId,
        method: 'credit_card',
        amount: originalPrice
      });

    // Подтверждение платежа
    await request(app)
      .post('/webhooks/cloudpayments')
      .send({
        transaction_id: paymentResponse.body.data.payment_id,
        booking_id: bookingId,
        status: 'completed',
        amount: originalPrice
      });

    // 3. Отмена бронирования
    const cancelResponse = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        reason: 'Personal reasons'
      });

    expect(cancelResponse.status).toBe(200);
    const refundAmount = cancelResponse.body.data.refund_amount;

    // 4. Проверка процесса возврата
    expect(refundAmount).toBeLessThanOrEqual(originalPrice);
    expect(refundAmount).toBeGreaterThan(0);

    // 5. Проверка статуса платежа
    const paymentStatusResponse = await request(app)
      .get(`/api/payments/${paymentResponse.body.data.payment_id}`)
      .set('Authorization', `Bearer ${touristToken}`);

    expect(['refunded', 'refunding']).toContain(paymentStatusResponse.body.data.status);
  });
});
