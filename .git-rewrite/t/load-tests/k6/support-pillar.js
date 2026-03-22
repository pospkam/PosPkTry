import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const duration = new Trend('http_request_duration');
export const apiSuccess = new Counter('api_success');
export const apiFailure = new Counter('api_failure');
export const activeConnections = new Gauge('active_connections');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Ramp-up: 10 users in 1 minute
    { duration: '3m', target: 10 },    // Stay at 10 users for 3 minutes
    { duration: '2m', target: 50 },    // Ramp-up to 50 users
    { duration: '5m', target: 50 },    // Sustained load at 50 users
    { duration: '2m', target: 100 },   // Spike to 100 users
    { duration: '5m', target: 100 },   // Peak load
    { duration: '1m', target: 50 },    // Ramp-down to 50
    { duration: '1m', target: 0 },     // Ramp-down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.1'],                    // Error rate < 10%
    'errors': ['rate<0.05'],                            // Custom error rate < 5%
  },
  ext: {
    loadimpact: {
      projectID: 3478081,
      name: 'KamHub Support Pillar Load Test'
    }
  }
};

export default function() {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
  const authToken = __ENV.AUTH_TOKEN || 'test-token-' + Date.now();
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test/1.0'
    },
    timeout: '30s'
  };

  group('Support Pillar Load Test', () => {
    // 1. Knowledge Base Search Tests
    group('Knowledge Base Search', () => {
      const searchTerms = ['оплата', 'бронирование', 'отмена', 'возврат', 'прочее'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const res = http.get(
        `${BASE_URL}/api/support/knowledge-base/search?q=${encodeURIComponent(term)}`,
        params
      );
      
      const success = check(res, {
        'search status is 200': (r) => r.status === 200,
        'search returns articles': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.articles);
          } catch {
            return false;
          }
        },
        'response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.5);
    });

    // 2. Create Ticket Tests
    group('Create Ticket', () => {
      const ticketData = {
        subject: `Проблема с оплатой ${Date.now()}`,
        description: 'Не проходит оплата картой Mastercard. Пробовал несколько раз - всегда ошибка.',
        customerId: Math.floor(Math.random() * 10000) + 1,
        customerEmail: `user${Math.floor(Math.random() * 10000)}@example.com`,
        priorityLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        serviceType: 'payment'
      };
      
      const res = http.post(
        `${BASE_URL}/api/support/tickets`,
        JSON.stringify(ticketData),
        params
      );
      
      const success = check(res, {
        'create ticket status is 201': (r) => r.status === 201,
        'ticket has ID': (r) => {
          try {
            return JSON.parse(r.body).id !== undefined;
          } catch {
            return false;
          }
        },
        'response time < 1000ms': (r) => r.timings.duration < 1000,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(1);
    });

    // 3. Get Tickets with Pagination
    group('Get Tickets Paginated', () => {
      const page = Math.floor(Math.random() * 10) + 1;
      const limit = [10, 20, 50][Math.floor(Math.random() * 3)];
      
      const res = http.get(
        `${BASE_URL}/api/support/tickets?page=${page}&limit=${limit}`,
        params
      );
      
      const success = check(res, {
        'get tickets status is 200': (r) => r.status === 200,
        'has pagination data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.pagination !== undefined;
          } catch {
            return false;
          }
        },
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.3);
    });

    // 4. Get Article Details
    group('Get Article Details', () => {
      const articleId = Math.floor(Math.random() * 100) + 1;
      
      const res = http.get(
        `${BASE_URL}/api/support/knowledge-base/articles/${articleId}`,
        params
      );
      
      const success = check(res, {
        'get article status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.2);
    });

    // 5. Add Message to Ticket
    group('Add Message to Ticket', () => {
      const ticketId = Math.floor(Math.random() * 100) + 1;
      const messageData = {
        content: 'Спасибо за помощь! Проблема решена.',
        senderType: Math.random() > 0.5 ? 'customer' : 'agent',
        senderId: Math.floor(Math.random() * 50) + 1
      };
      
      const res = http.post(
        `${BASE_URL}/api/support/tickets/${ticketId}/messages`,
        JSON.stringify(messageData),
        params
      );
      
      const success = check(res, {
        'add message status is 201 or 404': (r) => r.status === 201 || r.status === 404,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.5);
    });

    // 6. Check SLA Violations
    group('Check SLA Violations', () => {
      const ticketId = Math.floor(Math.random() * 100) + 1;
      
      const res = http.get(
        `${BASE_URL}/api/support/sla/violations/${ticketId}`,
        params
      );
      
      const success = check(res, {
        'check sla status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.2);
    });

    // 7. Update Ticket
    group('Update Ticket', () => {
      const ticketId = Math.floor(Math.random() * 100) + 1;
      const updateData = {
        status: ['in_progress', 'resolved'][Math.floor(Math.random() * 2)],
        priorityLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      };
      
      const res = http.patch(
        `${BASE_URL}/api/support/tickets/${ticketId}`,
        JSON.stringify(updateData),
        params
      );
      
      const success = check(res, {
        'update ticket status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.5);
    });

    // 8. Get Article Statistics
    group('Get Article Statistics', () => {
      const articleId = Math.floor(Math.random() * 100) + 1;
      
      const res = http.get(
        `${BASE_URL}/api/support/knowledge-base/articles/${articleId}/stats`,
        params
      );
      
      const success = check(res, {
        'get stats status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      if (success) {
        apiSuccess.add(1);
      } else {
        apiFailure.add(1);
      }
      errorRate.add(!success);
      duration.add(res.timings.duration);
      sleep(0.3);
    });
  });

  // Update gauge for active connections
  activeConnections.add(__VU);
}

// Cleanup function
export function teardown(data) {
  console.log('Load test completed!');
}
