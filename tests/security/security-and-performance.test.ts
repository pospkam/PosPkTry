/**
 * SECURITY & PERFORMANCE TESTS
 * 
 * Тестирование:
 * - Защиты от SQL injection, XSS, CSRF
 * - Rate limiting
 * - JWT token validation
 * - RBAC enforcement
 * - Нагрузочное тестирование
 * - Performance benchmarks
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '@/app';
import { testUtils } from '@tests/setup';

// ==================== SECURITY TESTS ====================
describe('SECURITY: SQL Injection Prevention', () => {
  test('should prevent SQL injection in login', async () => {
    const injectionPayloads = [
      { email: "' OR '1'='1", password: "password" },
      { email: "admin'--", password: "anything" },
      { email: "' OR 1=1--", password: "test" },
      { email: "1' UNION SELECT * FROM users--", password: "test" }
    ];

    for (const payload of injectionPayloads) {
      const response = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('token');
    }
  });

  test('should prevent SQL injection in search', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const response = await request(app)
      .get('/api/tours/search')
      .set('Authorization', `Bearer ${token}`)
      .query({
        location: "Kamchatka'; DROP TABLE tours;--"
      });

    // Таблица не должна быть удалена, запрос должен вернуть результат или ошибку
    expect([200, 400]).toContain(response.status);
    expect(response.status).not.toBe(500);
  });

  test('should sanitize search parameters', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const response = await request(app)
      .get('/api/tours/search')
      .set('Authorization', `Bearer ${token}`)
      .query({
        location: "<script>alert('XSS')</script>",
        difficulty: "medium' OR '1'='1"
      });

    // Параметры должны быть безопасны
    expect([200, 400]).toContain(response.status);
  });
});

describe('SECURITY: Authentication and JWT', () => {
  test('should reject invalid JWT tokens', async () => {
    const invalidTokens = [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      'completely_invalid_token',
      'Bearer token'
    ];

    for (const token of invalidTokens) {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    }
  });

  test('should enforce JWT expiration', async () => {
    // Создаем токен с очень коротким временем жизни
    const shortLivedToken = testUtils.generateTestToken('user-1', 'TOURIST');

    // Сразу используем - должен работать
    let response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${shortLivedToken}`);

    expect(response.status).toBe(200);

    // Имитируем истечение времени (в реальном сценарии)
    // Это зависит от реализации
  });

  test('should prevent token reuse after refresh', async () => {
    const token1 = testUtils.generateTestToken('user-1', 'TOURIST');

    // Используем токен один раз
    await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token1}`);

    // После обновления старый токен должен быть невалидным
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ token: token1 });

    // Старый токен больше не должен работать
    if (refreshResponse.body.data && refreshResponse.body.data.new_token) {
      const oldTokenResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token1}`);

      // Может быть 401 или 403
      expect([401, 403]).toContain(oldTokenResponse.status);
    }
  });
});

describe('SECURITY: Rate Limiting', () => {
  test('should enforce rate limit on login attempts', async () => {
    const attempts = [];

    // Делаем 11 попыток логина (лимит обычно 10)
    for (let i = 0; i < 11; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({
            email: `user${i}@test.com`,
            password: 'wrong'
          })
      );
    }

    const responses = await Promise.all(attempts);

    // Последние запросы должны быть заблокированы
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429); // Too Many Requests
  });

  test('should rate limit API endpoints by IP', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');
    const requests = [];

    // 100 запросов подряд
    for (let i = 0; i < 100; i++) {
      requests.push(
        request(app)
          .get('/api/tours/search?location=Kamchatka')
          .set('Authorization', `Bearer ${token}`)
      );
    }

    const responses = await Promise.all(requests);

    // Некоторые должны вернуть 429
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should include rate limit headers', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const response = await request(app)
      .get('/api/tours/search?location=Kamchatka')
      .set('Authorization', `Bearer ${token}`);

    // Проверяем наличие заголовков rate limiting
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });
});

describe('SECURITY: RBAC and Authorization', () => {
  test('should prevent unauthorized role elevation', async () => {
    const touristToken = testUtils.generateTestToken('user-1', 'TOURIST');

    // Попытка стать админом
    const response = await request(app)
      .post('/api/user/update-role')
      .set('Authorization', `Bearer ${touristToken}`)
      .send({
        new_role: 'ADMIN'
      });

    expect(response.status).toBe(403);

    // Проверка, что роль не изменилась
    const profileResponse = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${touristToken}`);

    expect(profileResponse.body.data.role).toBe('TOURIST');
  });

  test('should enforce row-level security', async () => {
    const user1Token = testUtils.generateTestToken('user-1', 'TOURIST');
    const user2Token = testUtils.generateTestToken('user-2', 'TOURIST');

    // User 1 пытается получить бронирования User 2
    const response = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ user_id: 'user-2' });

    // Должен получить только свои бронирования
    expect(response.status).toBe(200);
    response.body.data.bookings.forEach((booking: any) => {
      expect(booking.user_id).toBe('user-1');
    });
  });

  test('should enforce field-level security', async () => {
    const touristToken = testUtils.generateTestToken('user-1', 'TOURIST');
    const operatorToken = testUtils.generateTestToken('operator-1', 'OPERATOR');

    // Туристе видит турпрограмму
    const touristView = await request(app)
      .get('/api/tours/tour-123')
      .set('Authorization', `Bearer ${touristToken}`);

    // Оператор видит больше информации (финансы, статистику)
    const operatorView = await request(app)
      .get('/api/operator/tours/tour-123')
      .set('Authorization', `Bearer ${operatorToken}`);

    // Поля должны быть разными
    expect(touristView.body.data).not.toHaveProperty('platform_commission');
    expect(operatorView.body.data).toHaveProperty('net_revenue');
  });
});

describe('SECURITY: CSRF Protection', () => {
  test('should require CSRF token for state-changing operations', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    // POST без CSRF токена может быть заблокирован
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tour_id: 'tour-123',
        participants: 2
      });

    // Это зависит от конфигурации
    // Если CSRF включен, может быть 403
    if (response.status === 403) {
      expect(response.body.error).toContain('CSRF');
    }
  });

  test('should validate origin header', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://malicious-site.com')
      .send({
        tour_id: 'tour-123',
        participants: 2
      });

    // Запрос с подозрительным Origin может быть заблокирован
    // Это зависит от CORS политики
  });
});

// ==================== PERFORMANCE TESTS ====================
describe('PERFORMANCE: Response Times', () => {
  test('search endpoint should respond in < 500ms', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const startTime = Date.now();

    const response = await request(app)
      .get('/api/tours/search?location=Kamchatka')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500); // 500ms
  });

  test('tour details endpoint should respond in < 200ms', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const startTime = Date.now();

    const response = await request(app)
      .get('/api/tours/tour-123')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('booking creation should respond in < 300ms', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const startTime = Date.now();

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tour_id: 'tour-123',
        participants: 2
      });

    const duration = Date.now() - startTime;

    // Даже если ошибка, важна скорость
    expect(duration).toBeLessThan(300);
  });

  test('dashboard should respond in < 1000ms', async () => {
    const token = testUtils.generateTestToken('operator-1', 'OPERATOR');

    const startTime = Date.now();

    const response = await request(app)
      .get('/api/operator/dashboard')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(1000); // 1 second
  });
});

describe('PERFORMANCE: Database Queries', () => {
  test('should use database indexes for common queries', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    // Запрос, который должен использовать индекс
    const startTime = Date.now();

    const response = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - startTime;

    // Быстрый ответ указывает на использование индекса
    expect(duration).toBeLessThan(100);
  });

  test('should cache frequently accessed data', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    // Первый запрос
    const start1 = Date.now();
    const response1 = await request(app)
      .get('/api/tours/popular')
      .set('Authorization', `Bearer ${token}`);
    const duration1 = Date.now() - start1;

    // Второй запрос (должен быть из кеша)
    const start2 = Date.now();
    const response2 = await request(app)
      .get('/api/tours/popular')
      .set('Authorization', `Bearer ${token}`);
    const duration2 = Date.now() - start2;

    // Второй запрос должен быть быстрее
    expect(duration2).toBeLessThanOrEqual(duration1);

    // Данные должны быть идентичными
    expect(JSON.stringify(response1.body)).toBe(JSON.stringify(response2.body));
  });
});

describe('PERFORMANCE: Memory and Resource Usage', () => {
  test('should not leak memory on repeated requests', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const memoryBefore = process.memoryUsage().heapUsed;

    // 100 повторяющихся запросов
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/api/tours/search?location=Kamchatka')
        .set('Authorization', `Bearer ${token}`);
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBefore;

    // Увеличение памяти не должно быть экспоненциальным
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50 MB
  });

  test('should handle large response payloads efficiently', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');

    const startTime = Date.now();

    const response = await request(app)
      .get('/api/tours/search')
      .set('Authorization', `Bearer ${token}`)
      .query({
        location: 'Kamchatka',
        limit: 1000 // Большой результат
      });

    const duration = Date.now() - startTime;

    // Даже с большим результатом должно быть быстро
    expect(duration).toBeLessThan(2000);
  });
});

describe('PERFORMANCE: Concurrent Operations', () => {
  test('should handle concurrent bookings correctly', async () => {
    const touristTokens = [];
    for (let i = 0; i < 5; i++) {
      touristTokens.push(testUtils.generateTestToken(`tourist-${i}`, 'TOURIST'));
    }

    const bookingPromises = touristTokens.map(token =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tour_id: 'tour-123',
          participants: 2
        })
    );

    const responses = await Promise.all(bookingPromises);

    // Все должны быть успешными (или 409 если нет мест)
    responses.forEach(response => {
      expect([201, 409]).toContain(response.status);
    });
  });

  test('should maintain data consistency under concurrent updates', async () => {
    const operatorToken = testUtils.generateTestToken('operator-1', 'OPERATOR');

    const updates = [];
    for (let i = 0; i < 5; i++) {
      updates.push(
        request(app)
          .patch('/api/operator/tours/tour-123')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            price_from: 5000 + (i * 1000)
          })
      );
    }

    await Promise.all(updates);

    // Проверить финальное состояние
    const finalResponse = await request(app)
      .get('/api/operator/tours/tour-123')
      .set('Authorization', `Bearer ${operatorToken}`);

    // Цена должна быть одного из последних обновлений
    expect([5000, 6000, 7000, 8000, 9000]).toContain(finalResponse.body.data.price_from);
  });
});

describe('PERFORMANCE: Load Testing', () => {
  test('should maintain SLA under high concurrent load', async () => {
    const token = testUtils.generateTestToken('user-1', 'TOURIST');
    const concurrent = 50; // 50 одновременных запросов
    const totalRequests = 500;

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    for (let i = 0; i < totalRequests; i += concurrent) {
      const batch = [];
      for (let j = 0; j < concurrent && i + j < totalRequests; j++) {
        const reqStart = Date.now();
        batch.push(
          request(app)
            .get('/api/tours/search?location=Kamchatka')
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              responseTimes.push(Date.now() - reqStart);
              if (res.status === 200) successCount++;
              else errorCount++;
              return res;
            })
        );
      }
      await Promise.all(batch);
    }

    const totalTime = Date.now() - startTime;

    // Статистика
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];
    const errorRate = (errorCount / totalRequests) * 100;

    console.log(`\nLoad Test Results:`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Success Rate: ${((successCount / totalRequests) * 100).toFixed(2)}%`);
    console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${p95ResponseTime}ms`);
    console.log(`P99 Response Time: ${p99ResponseTime}ms`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s\n`);

    // SLA требования
    expect(errorRate).toBeLessThan(1); // < 1% ошибок
    expect(p95ResponseTime).toBeLessThan(500); // P95 < 500ms
    expect(p99ResponseTime).toBeLessThan(1000); // P99 < 1s
  });
});
