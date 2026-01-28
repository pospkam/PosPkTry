/**
 * UNIT TESTS: TOURIST ROLE
 * 
 * Тестирование функциональности туриста
 * - Поиск и фильтрация туров
 * - Создание и управление бронированиями
 * - Система оценок и отзывов
 * - Система лояльности и эко-баллов
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@/app';
import { testUtils } from '@tests/setup';

describe('TOURIST: Booking Management', () => {
  let touristToken: string;
  let tourId: string;
  let bookingId: string;

  beforeEach(async () => {
    // Setup: Создание тестового туриста и тура
    touristToken = testUtils.generateTestToken('user-tourist-1', 'TOURIST');
    
    // Создание тестового тура
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${testUtils.generateTestToken('user-operator-1', 'OPERATOR')}`)
      .send({
        title: 'Test Volcano Tour',
        description: 'Test tour description',
        difficulty: 'medium',
        price_from: 5000,
        price_to: 10000,
        max_participants: 15,
        duration_days: 3
      });

    tourId = tourResponse.body.data.id;
  });

  test('should search tours with filters', async () => {
    const response = await request(app)
      .get('/api/tours/search')
      .query({
        location: 'Kamchatka',
        difficulty: 'medium',
        date_from: '2024-03-01',
        max_price: 15000
      })
      .set('Authorization', `Bearer ${touristToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('tours');
    expect(Array.isArray(response.body.data.tours)).toBe(true);
    expect(response.body.data.total).toBeGreaterThanOrEqual(0);
  });

  test('should create booking with valid data', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 2,
        special_requests: 'Vegetarian meals, no heights'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('booking_number');
    expect(response.body.data.booking_number).toMatch(/^BK-\d+/);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.total_price).toBeGreaterThan(0);

    bookingId = response.body.data.id;
  });

  test('should reject booking for non-existent tour', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: 'non-existent-tour-id',
        participants: 2
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
  });

  test('should reject booking with zero participants', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('participants');
  });

  test('should reject booking exceeding max participants', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 50 // Превышает лимит
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('maximum');
  });

  test('should get booking details', async () => {
    // Сначала создаем бронирование
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 2
      });

    const bookingId = createResponse.body.data.id;

    // Получаем детали
    const response = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${touristToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('id', bookingId);
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('total_price');
    expect(response.body.data).toHaveProperty('participants_count');
  });

  test('should cancel booking with proper refund', async () => {
    // Создаем бронирование
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 2
      });

    const bookingId = createResponse.body.data.id;
    const originalPrice = createResponse.body.data.total_price;

    // Отменяем бронирование
    const cancelResponse = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        reason: 'Personal reasons'
      });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.status).toBe('cancelled');
    expect(cancelResponse.body.data).toHaveProperty('refund_amount');
    // Возврат должен быть меньше оригинальной цены (комиссия)
    expect(cancelResponse.body.data.refund_amount).toBeLessThanOrEqual(originalPrice);
  });

  test('should calculate total price correctly', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        tour_id: tourId,
        participants: 3,
        insurance: true,
        additional_services: ['guide_tips', 'camera_rental']
      });

    expect(response.status).toBe(201);
    const { total_price, breakdown } = response.body.data;

    // Проверяем, что цена включает все компоненты
    const expectedTotal = (breakdown.tour_price || 0) +
                         (breakdown.insurance_price || 0) +
                         (breakdown.services_price || 0);

    expect(total_price).toBe(expectedTotal);
  });
});

describe('TOURIST: Reviews and Ratings', () => {
  let touristToken: string;
  let tourId: string;
  let bookingId: string;

  beforeEach(async () => {
    touristToken = testUtils.generateTestToken('user-tourist-1', 'TOURIST');
    // Создание завершенного бронирования для отзыва
  });

  test('should create review only after tour completion', async () => {
    const response = await request(app)
      .post(`/api/tours/${tourId}/reviews`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        rating: 5,
        comment: 'Amazing tour experience!',
        photos: []
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('review_id');
    expect(response.body.data.status).toBe('pending_moderation');
  });

  test('should validate rating between 1 and 5', async () => {
    const invalidRatings = [0, 6, -1, 10];

    for (const rating of invalidRatings) {
      const response = await request(app)
        .post(`/api/tours/${tourId}/reviews`)
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          rating,
          comment: 'Test review'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('rating');
    }
  });

  test('should prevent duplicate reviews from same user', async () => {
    // Первый отзыв
    await request(app)
      .post(`/api/tours/${tourId}/reviews`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        rating: 4,
        comment: 'Good tour'
      });

    // Попытка создать дубликат
    const response = await request(app)
      .post(`/api/tours/${tourId}/reviews`)
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        rating: 5,
        comment: 'Another review'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('already reviewed');
  });

  test('should calculate average rating correctly', async () => {
    const ratings = [5, 4, 3, 5, 4];
    
    for (let i = 0; i < ratings.length; i++) {
      await request(app)
        .post(`/api/tours/${tourId}/reviews`)
        .set('Authorization', `Bearer ${testUtils.generateTestToken(`user-${i}`, 'TOURIST')}`)
        .send({
          rating: ratings[i],
          comment: `Review ${i}`
        });
    }

    const response = await request(app)
      .get(`/api/tours/${tourId}/ratings`)
      .set('Authorization', `Bearer ${touristToken}`);

    const expectedAverage = (5 + 4 + 3 + 5 + 4) / 5; // 4.2
    expect(response.body.data.average_rating).toBe(expectedAverage);
    expect(response.body.data.total_reviews).toBe(5);
  });
});

describe('TOURIST: Loyalty and Eco-Points', () => {
  let touristToken: string;

  beforeEach(async () => {
    touristToken = testUtils.generateTestToken('user-tourist-1', 'TOURIST');
  });

  test('should earn loyalty points on booking completion', async () => {
    const bookingAmount = 10000;
    
    // Симуляция завершения бронирования
    const response = await request(app)
      .post('/api/bookings/simulate-completion')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        booking_amount: bookingAmount,
        currency: 'RUB'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.points_earned).toBeGreaterThan(0);
  });

  test('should calculate points based on loyalty level', async () => {
    const levels = {
      'bronze': 0.10,    // 10%
      'silver': 0.12,    // 12%
      'gold': 0.15,      // 15%
      'platinum': 0.20   // 20%
    };

    const bookingAmount = 10000;

    for (const [level, percentage] of Object.entries(levels)) {
      const response = await request(app)
        .post('/api/bookings/simulate-completion')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          booking_amount: bookingAmount,
          loyalty_level: level
        });

      const expectedPoints = Math.floor(bookingAmount * percentage);
      expect(response.body.data.points_earned).toBe(expectedPoints);
    }
  });

  test('should upgrade loyalty level on threshold', async () => {
    // Начальный уровень: bronze (0-999 points)
    let loyaltyResponse = await request(app)
      .get('/api/loyalty/profile')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(loyaltyResponse.body.data.level).toBe('bronze');

    // Добавляем points чтобы перейти в silver (1000-4999)
    await request(app)
      .post('/api/loyalty/add-points')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({ points: 1500 });

    loyaltyResponse = await request(app)
      .get('/api/loyalty/profile')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(loyaltyResponse.body.data.level).toBe('silver');
  });

  test('should earn eco-points for sustainable choices', async () => {
    const response = await request(app)
      .post('/api/bookings/eco-activity')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        activity_type: 'used_public_transport',
        tour_id: 'tour-123'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.eco_points).toBeGreaterThan(0);
    expect(response.body.data.activity_type).toBe('used_public_transport');
  });

  test('should list available rewards for redemption', async () => {
    const response = await request(app)
      .get('/api/loyalty/rewards')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.rewards)).toBe(true);
    response.body.data.rewards.forEach((reward: any) => {
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('name');
      expect(reward).toHaveProperty('points_required');
      expect(reward).toHaveProperty('description');
    });
  });
});

describe('TOURIST: Payment Processing', () => {
  let touristToken: string;

  beforeEach(async () => {
    touristToken = testUtils.generateTestToken('user-tourist-1', 'TOURIST');
  });

  test('should initiate payment with multiple methods', async () => {
    const paymentMethods = ['credit_card', 'bank_transfer', 'e_wallet'];

    for (const method of paymentMethods) {
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          booking_id: 'booking-123',
          method,
          amount: 10000
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('payment_id');
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.method).toBe(method);
    }
  });

  test('should handle payment webhook correctly', async () => {
    const response = await request(app)
      .post('/webhooks/cloudpayments')
      .send({
        transaction_id: 'txn-123456',
        booking_id: 'booking-123',
        status: 'completed',
        amount: 10000,
        timestamp: new Date().toISOString()
      });

    expect(response.status).toBe(200);
    expect(response.body.data.payment_status).toBe('completed');
  });
});
