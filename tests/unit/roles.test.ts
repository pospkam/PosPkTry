/**
 * UNIT TESTS: GUIDE, TRANSFER OPERATOR, AGENT, ADMIN
 * 
 * Комплексное тестирование функциональности всех оставшихся ролей
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@/app';
import { testUtils } from '@tests/setup';

// ==================== GUIDE TESTS ====================
describe('GUIDE: Schedule and Safety Management', () => {
  let guideToken: string;

  beforeEach(async () => {
    guideToken = testUtils.generateTestToken('user-guide-1', 'GUIDE');
  });

  test('should get todays schedule', async () => {
    const response = await request(app)
      .get('/api/guide/schedule/today')
      .set('Authorization', `Bearer ${guideToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.tours)).toBe(true);
    response.body.data.tours.forEach((tour: any) => {
      expect(tour).toHaveProperty('tour_id');
      expect(tour).toHaveProperty('start_time');
      expect(tour).toHaveProperty('group_size');
    });
  });

  test('should create safety report', async () => {
    const response = await request(app)
      .post('/api/guide/safety-reports')
      .set('Authorization', `Bearer ${guideToken}`)
      .send({
        tour_id: 'tour-123',
        group_id: 'group-456',
        location: { lat: 56.834, lon: 158.408 },
        weather: 'partly cloudy',
        group_condition: 'good',
        incidents: [],
        notes: 'Tour progressing well'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('report_id');
    expect(response.body.data.status).toBe('submitted');
  });

  test('should report incident with proper severity levels', async () => {
    const severities = ['low', 'medium', 'high', 'critical'];

    for (const severity of severities) {
      const response = await request(app)
        .post('/api/guide/incidents')
        .set('Authorization', `Bearer ${guideToken}`)
        .send({
          tour_id: 'tour-123',
          type: 'injury',
          severity,
          description: 'Tourist twisted ankle',
          action_taken: 'First aid applied, continued tour'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.severity).toBe(severity);
    }
  });

  test('should validate equipment checklist', async () => {
    const response = await request(app)
      .post('/api/guide/start-tour')
      .set('Authorization', `Bearer ${guideToken}`)
      .send({
        tour_id: 'tour-123',
        equipment_checklist: {
          'first_aid_kit': true,
          'gps_device': true,
          'satellite_phone': false,
          'emergency_whistle': true
        }
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('equipment');
  });

  test('should complete tour with report', async () => {
    const response = await request(app)
      .post('/api/guide/tours/tour-123/complete')
      .set('Authorization', `Bearer ${guideToken}`)
      .send({
        end_time: new Date().toISOString(),
        final_notes: 'All participants safe',
        group_satisfaction: 5,
        issues_encountered: []
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('completed');
    expect(response.body.data).toHaveProperty('completion_report');
  });
});

// ==================== TRANSFER OPERATOR TESTS ====================
describe('TRANSFER: Vehicle and Route Management', () => {
  let transferToken: string;

  beforeEach(async () => {
    transferToken = testUtils.generateTestToken('user-transfer-1', 'TRANSFER_OPERATOR');
  });

  test('should create transfer booking', async () => {
    const response = await request(app)
      .post('/api/transfers/book')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        from: 'Petropavlovsk-Kamchatsky Airport',
        to: 'Hotel Kamchatka',
        date: '2024-06-15',
        time: '14:30',
        passengers: 3,
        luggage_items: 5
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('booking_id');
    expect(response.body.data).toHaveProperty('vehicle_id');
    expect(response.body.data).toHaveProperty('driver_id');
  });

  test('should validate vehicle capacity', async () => {
    const response = await request(app)
      .post('/api/transfers/book')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        from: 'Airport',
        to: 'Hotel',
        date: '2024-06-15',
        passengers: 50, // Exceeds capacity
        vehicle_type: 'sedan'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('capacity');
  });

  test('should calculate optimal route', async () => {
    const response = await request(app)
      .post('/api/transfers/route/calculate')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        stops: [
          { lat: 53.284, lon: 158.708, name: 'Airport' },
          { lat: 53.024, lon: 158.648, name: 'Hotel 1' },
          { lat: 53.054, lon: 158.658, name: 'Hotel 2' }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('distance');
    expect(response.body.data).toHaveProperty('estimated_duration');
    expect(response.body.data).toHaveProperty('optimized_route');
  });

  test('should detect schedule conflicts', async () => {
    // Бронирование 1: 9:00-11:00
    await request(app)
      .post('/api/transfers/book')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        vehicle_id: 'vehicle-1',
        from: 'Airport',
        to: 'Hotel',
        date: '2024-06-15',
        start_time: '09:00',
        duration_minutes: 120,
        passengers: 3
      });

    // Попытка бронирования 2: 10:00-12:00 (конфликт)
    const conflictResponse = await request(app)
      .post('/api/transfers/book')
      .set('Authorization', `Bearer ${transferToken}`)
      .send({
        vehicle_id: 'vehicle-1',
        from: 'Hotel',
        to: 'Tour',
        date: '2024-06-15',
        start_time: '10:00',
        duration_minutes: 120,
        passengers: 2
      });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body.error).toContain('conflict');
  });

  test('should track transfer in real-time', async () => {
    const response = await request(app)
      .get('/api/transfers/booking-123/tracking')
      .set('Authorization', `Bearer ${transferToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('latitude');
    expect(response.body.data).toHaveProperty('longitude');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('speed');
    expect(response.body.data).toHaveProperty('eta');
  });
});

// ==================== AGENT TESTS ====================
describe('AGENT: Commission and Client Management', () => {
  let agentToken: string;

  beforeEach(async () => {
    agentToken = testUtils.generateTestToken('user-agent-1', 'AGENT');
  });

  test('should calculate commission for different tiers', async () => {
    const tiers = [
      { tier: 'standard', percentage: 10 },
      { tier: 'premium', percentage: 15 },
      { tier: 'vip', percentage: 20 }
    ];

    const bookingAmount = 10000;

    for (const { tier, percentage } of tiers) {
      const response = await request(app)
        .post('/api/agent/commission/calculate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          booking_amount: bookingAmount,
          agent_tier: tier,
          season: 'high'
        });

      expect(response.status).toBe(200);
      const expectedCommission = Math.floor(bookingAmount * (percentage / 100));
      expect(response.body.data.commission_amount).toBe(expectedCommission);
      expect(response.body.data.agent_tier).toBe(tier);
    }
  });

  test('should validate voucher codes', async () => {
    const response = await request(app)
      .post('/api/agent/vouchers/validate')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        code: 'SUMMER2024',
        booking_amount: 10000
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('is_valid');
    expect(response.body.data).toHaveProperty('discount_value');
    expect(response.body.data).toHaveProperty('final_amount');
  });

  test('should create client profile', async () => {
    const response = await request(app)
      .post('/api/agent/clients')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Corporate Client',
        email: 'corporate@company.com',
        phone: '+79123456789',
        company: 'Big Corp Inc',
        country: 'Russia'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('client_id');
    expect(response.body.data.registration_date).toBeDefined();
  });

  test('should prevent duplicate clients', async () => {
    const clientData = {
      name: 'Test Client',
      email: 'test@company.com',
      phone: '+79111111111'
    };

    // Создаем клиента
    await request(app)
      .post('/api/agent/clients')
      .set('Authorization', `Bearer ${agentToken}`)
      .send(clientData);

    // Пытаемся создать дубликат
    const duplicateResponse = await request(app)
      .post('/api/agent/clients')
      .set('Authorization', `Bearer ${agentToken}`)
      .send(clientData);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error).toContain('already exists');
  });

  test('should request commission payout', async () => {
    const response = await request(app)
      .post('/api/agent/payouts/request')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        amount: 50000,
        payment_method: 'bank_transfer'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending_approval');
    expect(response.body.data).toHaveProperty('payout_id');
  });
});

// ==================== ADMIN TESTS ====================
describe('ADMIN: Content Moderation', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = testUtils.generateTestToken('user-admin-1', 'ADMIN');
  });

  test('should moderate review content', async () => {
    const response = await request(app)
      .post('/api/admin/content/reviews/review-123/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve',
        notes: 'Review approved - appropriate content'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('approved');
    expect(response.body.data.moderated_by).toBe('user-admin-1');
  });

  test('should reject inappropriate reviews', async () => {
    const response = await request(app)
      .post('/api/admin/content/reviews/review-123/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'reject',
        reason: 'Offensive language'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('rejected');
    expect(response.body.data.rejection_reason).toBe('Offensive language');
  });

  test('should verify partner documents', async () => {
    const response = await request(app)
      .post('/api/admin/partners/partner-123/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registration: 'verified',
        tax_certificate: 'verified',
        insurance: 'verified',
        status: 'verified'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.verification_status).toBe('verified');
    expect(response.body.data.verified_at).toBeDefined();
  });

  test('should calculate platform metrics', async () => {
    const response = await request(app)
      .get('/api/admin/analytics/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        period: 'month',
        month: '2024-06'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('total_users');
    expect(response.body.data).toHaveProperty('total_bookings');
    expect(response.body.data).toHaveProperty('total_revenue');
    expect(response.body.data).toHaveProperty('platform_commission');
    expect(response.body.data).toHaveProperty('average_rating');
    expect(response.body.data).toHaveProperty('conversion_rate');
  });

  test('should process payout approval', async () => {
    const response = await request(app)
      .post('/api/admin/finance/payouts/payout-123/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Approved for processing'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('approved');
    expect(response.body.data.approved_by).toBe('user-admin-1');
  });

  test('should view audit logs', async () => {
    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        limit: 50,
        action_type: 'tour_published'
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.logs)).toBe(true);
    response.body.data.logs.forEach((log: any) => {
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('user_id');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('resource_id');
    });
  });
});

// ==================== SECURITY TESTS ====================
describe('Security: RBAC and Access Control', () => {
  test('tourist cannot access operator endpoints', async () => {
    const touristToken = testUtils.generateTestToken('user-tourist-1', 'TOURIST');

    const response = await request(app)
      .post('/api/operator/tours')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        title: 'Unauthorized tour',
        difficulty: 'easy',
        price_from: 1000,
        price_to: 2000,
        max_participants: 10,
        duration_days: 1
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('permission');
  });

  test('operator cannot access admin endpoints', async () => {
    const operatorToken = testUtils.generateTestToken('user-operator-1', 'OPERATOR');

    const response = await request(app)
      .get('/api/admin/analytics/metrics')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(response.status).toBe(403);
  });

  test('should prevent cross-user data access', async () => {
    const user1Token = testUtils.generateTestToken('user-1', 'TOURIST');
    const user2Token = testUtils.generateTestToken('user-2', 'TOURIST');

    // User 1 не должен получить доступ к данным User 2
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ user_id: 'user-2' });

    expect(response.status).toBe(403);
  });

  test('should validate JWT token expiration', async () => {
    const expiredToken = 'expired.jwt.token';

    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });
});
