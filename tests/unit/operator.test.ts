/**
 * UNIT TESTS: OPERATOR ROLE
 * 
 * Тестирование функциональности туроператора
 * - Управление турами (CRUD)
 * - Управление расписанием и гидами
 * - Финансовые операции и комиссии
 * - Аналитика и отчеты
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@/app';
import { testUtils } from '@tests/setup';

describe('OPERATOR: Tour Management', () => {
  let operatorToken: string;
  let tourId: string;

  beforeEach(async () => {
    operatorToken = testUtils.generateTestToken('user-operator-1', 'OPERATOR');
  });

  test('should create tour with all required fields', async () => {
    const tourData = {
      title: 'Volcano Trekking Adventure',
      description: 'Experience the power of nature',
      difficulty: 'medium',
      price_from: 5000,
      price_to: 10000,
      max_participants: 15,
      duration_days: 3,
      includes: ['meals', 'guide', 'equipment'],
      excludes: ['flights', 'insurance'],
      location: {
        region: 'Kamchatka',
        coordinates: { lat: 56.834, lon: 158.408 }
      }
    };

    const response = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(tourData);

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.slug).toBe('volcano-trekking-adventure');
    expect(response.body.data.status).toBe('draft');
    expect(response.body.data.operator_id).toBe('user-operator-1');

    tourId = response.body.data.id;
  });

  test('should validate required fields', async () => {
    const incompleteData = {
      title: 'Incomplete Tour'
      // Missing required fields
    };

    const response = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(incompleteData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('should reject negative prices', async () => {
    const response = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Test Tour',
        difficulty: 'easy',
        price_from: -5000, // Invalid
        price_to: 10000,
        max_participants: 10,
        duration_days: 2
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('price');
  });

  test('should validate max participants limit (max 100)', async () => {
    const response = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Test Tour',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 150, // Exceeds limit
        duration_days: 1
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('participants');
  });

  test('should update tour details', async () => {
    // Создаем тур
    const createResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Original Title',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 10,
        duration_days: 1
      });

    const tourId = createResponse.body.data.id;

    // Обновляем тур
    const updateResponse = await request(app)
      .patch(`/api/operator/tours/${tourId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Updated Title',
        price_from: 1500,
        price_to: 2500
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe('Updated Title');
    expect(updateResponse.body.data.price_from).toBe(1500);
  });

  test('should publish tour to active status', async () => {
    // Создаем тур в статусе draft
    const createResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Test Tour for Publishing',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 10,
        duration_days: 1
      });

    const tourId = createResponse.body.data.id;

    // Публикуем тур
    const publishResponse = await request(app)
      .post(`/api/operator/tours/${tourId}/publish`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({});

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.data.status).toBe('active');
    expect(publishResponse.body.data.published_at).toBeDefined();
  });

  test('should deactivate tour', async () => {
    // Создаем и публикуем тур
    const tourResponse = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        title: 'Tour to Deactivate',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 10,
        duration_days: 1
      });

    const tourId = tourResponse.body.data.id;

    // Деактивируем тур
    const deactivateResponse = await request(app)
      .post(`/api/operator/tours/${tourId}/deactivate`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        reason: 'Seasonal closure'
      });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.status).toBe('inactive');
  });
});

describe('OPERATOR: Schedule Management', () => {
  let operatorToken: string;
  let tourId: string;

  beforeEach(async () => {
    operatorToken = testUtils.generateTestToken('user-operator-1', 'OPERATOR');
  });

  test('should create tour schedule', async () => {
    const response = await request(app)
      .post('/api/operator/tours/schedules')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        tour_id: tourId,
        start_date: '2024-06-15',
        start_time: '09:00',
        available_seats: 12,
        guide_id: 'guide-123'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('schedule_id');
    expect(response.body.data.available_seats).toBe(12);
    expect(response.body.data.occupied_seats).toBe(0);
  });

  test('should list operator schedules', async () => {
    const response = await request(app)
      .get('/api/operator/schedules')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({
        month: '2024-06',
        status: 'active'
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.schedules)).toBe(true);
    response.body.data.schedules.forEach((schedule: any) => {
      expect(schedule).toHaveProperty('date');
      expect(schedule).toHaveProperty('available_seats');
    });
  });

  test('should detect schedule conflicts', async () => {
    const scheduleData = {
      tour_id: tourId,
      start_date: '2024-06-15',
      start_time: '09:00',
      guide_id: 'guide-123'
    };

    // Создаем первое расписание
    await request(app)
      .post('/api/operator/tours/schedules')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(scheduleData);

    // Пытаемся создать конфликтующее расписание
    const conflictResponse = await request(app)
      .post('/api/operator/tours/schedules')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        ...scheduleData,
        start_time: '08:00' // Перекрывается с первым
      });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body.error).toContain('conflict');
  });
});

describe('OPERATOR: Financial Management', () => {
  let operatorToken: string;

  beforeEach(async () => {
    operatorToken = testUtils.generateTestToken('user-operator-1', 'OPERATOR');
  });

  test('should calculate revenue from bookings', async () => {
    const response = await request(app)
      .get('/api/operator/dashboard/revenue')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({
        period: 'month',
        month: '2024-06'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('total_revenue');
    expect(response.body.data).toHaveProperty('confirmed_bookings');
    expect(response.body.data).toHaveProperty('cancelled_bookings');
    expect(response.body.data).toHaveProperty('platform_fee');
    expect(response.body.data.net_revenue).toBeLessThanOrEqual(response.body.data.total_revenue);
  });

  test('should calculate commission correctly', async () => {
    const bookings = [
      { id: 'booking-1', amount: 5000, status: 'confirmed' },
      { id: 'booking-2', amount: 7500, status: 'confirmed' },
      { id: 'booking-3', amount: 3000, status: 'cancelled' }
    ];

    const response = await request(app)
      .post('/api/operator/financial/calculate-commission')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ bookings });

    expect(response.status).toBe(200);
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const expectedTotal = confirmed.reduce((sum, b) => sum + b.amount, 0);
    expect(response.body.data.total_amount).toBe(expectedTotal);
    expect(response.body.data).toHaveProperty('platform_fee');
    expect(response.body.data).toHaveProperty('net_amount');
  });

  test('should request payout', async () => {
    const response = await request(app)
      .post('/api/operator/financial/payout-request')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        amount: 50000,
        payment_method: 'bank_transfer',
        bank_details: {
          account_number: '40817810010000000123',
          bic: '044525225',
          bank_name: 'Sber'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending_approval');
    expect(response.body.data).toHaveProperty('payout_id');
  });

  test('should list payout history', async () => {
    const response = await request(app)
      .get('/api/operator/financial/payouts')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({
        status: 'completed',
        limit: 10
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.payouts)).toBe(true);
    response.body.data.payouts.forEach((payout: any) => {
      expect(payout).toHaveProperty('payout_id');
      expect(payout).toHaveProperty('amount');
      expect(payout).toHaveProperty('status');
    });
  });
});

describe('OPERATOR: Analytics and Reports', () => {
  let operatorToken: string;

  beforeEach(async () => {
    operatorToken = testUtils.generateTestToken('user-operator-1', 'OPERATOR');
  });

  test('should get operator dashboard data', async () => {
    const response = await request(app)
      .get('/api/operator/dashboard')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('total_revenue');
    expect(response.body.data).toHaveProperty('active_tours');
    expect(response.body.data).toHaveProperty('pending_bookings');
    expect(response.body.data).toHaveProperty('total_tourists');
    expect(response.body.data).toHaveProperty('average_rating');
    expect(Array.isArray(response.body.data.recent_bookings)).toBe(true);
  });

  test('should generate monthly report', async () => {
    const response = await request(app)
      .post('/api/operator/reports/generate')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        type: 'monthly_summary',
        month: '2024-06'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('report_id');
    expect(response.body.data).toHaveProperty('generated_at');
    expect(response.body.data.report).toHaveProperty('total_bookings');
    expect(response.body.data.report).toHaveProperty('revenue_breakdown');
    expect(response.body.data.report).toHaveProperty('tourist_satisfaction');
  });

  test('should export report as PDF', async () => {
    const response = await request(app)
      .get('/api/operator/reports/export')
      .set('Authorization', `Bearer ${operatorToken}`)
      .query({
        report_id: 'report-123',
        format: 'pdf'
      })
      .set('Accept', 'application/pdf');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/pdf/);
  });
});

describe('OPERATOR: Data Isolation', () => {
  let operator1Token: string;
  let operator2Token: string;

  beforeEach(async () => {
    operator1Token = testUtils.generateTestToken('operator-1', 'OPERATOR');
    operator2Token = testUtils.generateTestToken('operator-2', 'OPERATOR');
  });

  test('should not allow operator to see other operator tours', async () => {
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

    // Operator 2 пытается получить доступ к туру Operator 1
    const accessResponse = await request(app)
      .get(`/api/operator/tours/${tourId}`)
      .set('Authorization', `Bearer ${operator2Token}`);

    expect(accessResponse.status).toBe(403);
  });

  test('should list only operator own tours', async () => {
    // Operator 1 получает свои туры
    const response = await request(app)
      .get('/api/operator/tours')
      .set('Authorization', `Bearer ${operator1Token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.tours)).toBe(true);
    
    // Все туры должны принадлежать Operator 1
    response.body.data.tours.forEach((tour: any) => {
      expect(tour.operator_id).toBe('operator-1');
    });
  });
});
