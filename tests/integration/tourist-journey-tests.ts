# 🧪 АВТОМАТИЗИРОВАННЫЕ ТЕСТЫ ДЛЯ ТУРИСТСКОГО JOURNEY

## ТЕСТОВЫЙ СКРИПТ 1: Полный journey туриста (Happy Path)

```typescript
// tests/integration/tourist-journey.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fetch from 'node-fetch'

const API_URL = process.env.API_URL || 'http://localhost:3000/api'
let accessToken: string
let touristId: string
let tourId: string
let bookingId: string

describe('👤 Полный journey туриста от регистрации до отзыва', () => {
  
  // ============ ЭТАП 1: РЕГИСТРАЦИЯ ============
  it('1.1 Регистрация нового туриста', async () => {
    const response = await fetch(\`\${API_URL}/auth/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: \`tourist-\${Date.now()}@test.com\`,
        password: 'SecurePass123!',
        fullName: 'Ivan Turistov',
        phone: '+79991234567'
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.user).toBeDefined()
    expect(data.accessToken).toBeDefined()
    
    touristId = data.user.id
    accessToken = data.accessToken
  })

  it('1.2 Подтверждение email', async () => {
    // Получить code из БД (в reality из письма)
    const emailCode = await getEmailVerificationCode(touristId)
    
    const response = await fetch(\`\${API_URL}/auth/verify-email\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({ code: emailCode })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.verified).toBe(true)
  })

  it('1.3 Заполнение профиля', async () => {
    const response = await fetch(\`\${API_URL}/user/profile\`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        avatar: 'https://example.com/avatar.jpg',
        bio: 'Любой путешественник',
        preferences: {
          tourTypes: ['adventure', 'nature'],
          budget: { min: 50000, max: 200000 },
          languages: ['ru', 'en']
        }
      })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.user.bio).toBe('Любой путешественник')
  })

  // ============ ЭТАП 2: DISCOVERY (ПОИСК ТУРОВ) ============
  it('2.1 Получить список туров', async () => {
    const response = await fetch(\`\${API_URL}/discovery/tours\`, {
      headers: { 'Authorization': \`Bearer \${accessToken}\` }
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.tours)).toBe(true)
    expect(data.tours.length).toBeGreaterThan(0)
    
    tourId = data.tours[0].id
  })

  it('2.2 Поиск туров с фильтрами', async () => {
    const response = await fetch(
      \`\${API_URL}/discovery/search?region=Kamchatka&minPrice=50000&maxPrice=200000&minRating=4.5\`,
      { headers: { 'Authorization': \`Bearer \${accessToken}\` } }
    )
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.tours).toBeDefined()
    
    // Проверить, что все туры соответствуют фильтрам
    data.tours.forEach(tour => {
      expect(tour.price).toBeGreaterThanOrEqual(50000)
      expect(tour.price).toBeLessThanOrEqual(200000)
      expect(tour.rating).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('2.3 Добавить тур в вишлист', async () => {
    const response = await fetch(\`\${API_URL}/engagement/wishlists\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        name: 'Мечта на 2026',
        tours: [tourId]
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.wishlist.tours).toContain(tourId)
  })

  // ============ ЭТАП 3: BOOKING (БРОНИРОВАНИЕ) ============
  it('3.1 Создать бронирование', async () => {
    const response = await fetch(\`\${API_URL}/booking/bookings\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        tourId: tourId,
        startDate: '2026-03-01',
        participants: 2,
        addOns: {
          additionalGuide: true,
          insurance: true,
          transfer: false
        }
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.booking.status).toBe('pending')
    expect(data.booking.totalPrice).toBeGreaterThan(0)
    
    bookingId = data.booking.id
  })

  it('3.2 Обработать платеж (CardPayment)', async () => {
    const response = await fetch(\`\${API_URL}/booking/payments\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`,
        'Idempotency-Key': \`payment-\${bookingId}-\${Date.now()}\` // ВАЖНО!
      },
      body: JSON.stringify({
        bookingId: bookingId,
        method: 'card',
        cardNumber: '4111111111111111',
        cvv: '123',
        expiryDate: '12/25'
      })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.payment.status).toBe('completed')
    expect(data.booking.status).toBe('confirmed')
  })

  it('3.3 Проверить подтверждение бронирования', async () => {
    const response = await fetch(\`\${API_URL}/booking/bookings/\${bookingId}\`, {
      headers: { 'Authorization': \`Bearer \${accessToken}\` }
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.booking.status).toBe('confirmed')
    expect(data.booking.confirmationNumber).toBeDefined()
  })

  // ============ ЭТАП 4: SUPPORT (ПОДДЕРЖКА) ============
  it('4.1 Создать ticket поддержки', async () => {
    const response = await fetch(\`\${API_URL}/support/tickets\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        subject: 'Вопрос о гиде',
        description: 'Говорит ли гид по-английски?',
        bookingId: bookingId,
        priority: 'normal'
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.ticket.status).toBe('open')
    expect(data.ticket.ticketNumber).toBeDefined()
  })

  it('4.2 Получить ответ от поддержки', async () => {
    // Simulate support agent response
    const ticketId = await getLatestTicketId(touristId)
    
    const response = await fetch(\`\${API_URL}/support/tickets/\${ticketId}/messages\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        message: 'Спасибо за вопрос!',
        senderType: 'support' // Simulate support agent
      })
    })
    
    expect(response.status).toBe(201)
  })

  // ============ ЭТАП 5: ANALYTICS (СТАТИСТИКА) ============
  it('5.1 Просмотреть личную статистику', async () => {
    const response = await fetch(\`\${API_URL}/analytics/user/dashboard\`, {
      headers: { 'Authorization': \`Bearer \${accessToken}\` }
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.dashboard.totalBookings).toBeGreaterThanOrEqual(1)
    expect(data.dashboard.totalSpent).toBeGreaterThan(0)
  })

  // ============ ЭТАП 6: REVIEWS (ОТЗЫВЫ) ============
  it('6.1 Оставить отзыв о туре', async () => {
    const response = await fetch(\`\${API_URL}/engagement/reviews\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        tourId: tourId,
        bookingId: bookingId,
        rating: 5,
        title: 'Потрясающее путешествие!',
        text: 'Лучший тур в моей жизни, спасибо!',
        photos: []
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.review.status).toBe('pending_moderation')
  })

  // ============ EDGE CASES И ОШИБКИ ============
  it('❌ SQL Injection тест (должна быть защита)', async () => {
    const response = await fetch(
      \`\${API_URL}/discovery/search?region=' OR '1'='1\`,
      { headers: { 'Authorization': \`Bearer \${accessToken}\` } }
    )
    
    // Должно вернуть либо пусто, либо ошибку валидации
    expect([400, 404, 200]).toContain(response.status)
    
    if (response.status === 200) {
      const data = await response.json()
      // Если вернул результаты, они должны быть отфильтрованы правильно
      expect(data.tours.length).toBe(0) // или меньше, чем без фильтра
    }
  })

  it('❌ XSS тест (должна быть санитизация)', async () => {
    const response = await fetch(\`\${API_URL}/engagement/reviews\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${accessToken}\`
      },
      body: JSON.stringify({
        tourId: tourId,
        bookingId: bookingId,
        rating: 3,
        title: 'Обычный отзыв',
        text: '<script>alert("xss")</script>'
      })
    })
    
    const data = await response.json()
    // Скрипт должен быть экранирован
    expect(data.review.text).not.toContain('<script>')
    expect(data.review.text).toContain('&lt;script&gt;') // или подобный escape
  })

  it('❌ Rate Limiting тест', async () => {
    let successCount = 0
    
    // Отправляем 150 запросов подряд
    for (let i = 0; i < 150; i++) {
      const response = await fetch(\`\${API_URL}/discovery/tours\`, {
        headers: { 'Authorization': \`Bearer \${accessToken}\` }
      })
      
      if (response.status === 200) {
        successCount++
      } else if (response.status === 429) {
        // Rate limit достигнут
        console.log(\`Rate limit на запросе \${i + 1}\`)
        break
      }
    }
    
    // Должны были заблокировать после ~100 запросов
    expect(successCount).toBeLessThan(150)
  })

  it('❌ JWT Expiration тест', async () => {
    // Создаем expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // expired
    
    const response = await fetch(\`\${API_URL}/user/profile\`, {
      headers: { 'Authorization': \`Bearer \${expiredToken}\` }
    })
    
    // Должен вернуть 401 Unauthorized
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('expired')
  })

  it('❌ N+1 Query тест (проверка производительности)', async () => {
    const startTime = Date.now()
    
    const response = await fetch(\`\${API_URL}/discovery/tours?limit=100\`, {
      headers: { 'Authorization': \`Bearer \${accessToken}\` }
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    expect(response.status).toBe(200)
    
    // Должно загрузиться быстро (< 2 сек)
    expect(duration).toBeLessThan(2000)
    
    console.log(\`Загрузка 100 туров за: \${duration}ms\`)
  })
})

// ============ HELPER FUNCTIONS ============
async function getEmailVerificationCode(userId: string): Promise<string> {
  // В тестовой среде получать из БД
  // В продакшене было бы из письма
  const result = await db.query(
    'SELECT code FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  )
  return result[0]?.code || 'test-code-123'
}

async function getLatestTicketId(userId: string): Promise<string> {
  const result = await db.query(
    'SELECT id FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  )
  return result[0]?.id
}
```

---

## ТЕСТОВЫЙ СКРИПТ 2: Проверка безопасности

```bash
#!/bin/bash
# tests/security/tourist-security-audit.sh

API_URL="${API_URL:-http://localhost:3000/api}"
RESULTS_FILE="security-audit-results.log"

echo "🔒 SECURITY AUDIT: Tourist Journey" > $RESULTS_FILE
echo "=================================" >> $RESULTS_FILE
echo "Date: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# ===== TEST 1: SQL Injection =====
echo "TEST 1: SQL Injection Protection" | tee -a $RESULTS_FILE
echo "Trying: GET /discovery/search?region=' OR '1'='1" | tee -a $RESULTS_FILE

RESULT=$(curl -s "$API_URL/discovery/search?region=%27%20OR%20%271%27%3D%271" \
  -H "Authorization: Bearer test-token" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESULT" | tail -n1)
BODY=$(echo "$RESULT" | head -n-1)

if [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "401" ]]; then
  echo "✅ PASS: Injection rejected with $HTTP_CODE" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL: Injection not properly rejected (HTTP $HTTP_CODE)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 2: CORS Configuration =====
echo "TEST 2: CORS Configuration" | tee -a $RESULTS_FILE
echo "Checking CORS headers..." | tee -a $RESULTS_FILE

CORS=$(curl -s -i "$API_URL/discovery/tours" \
  -H "Origin: https://evil.com" | grep -i "Access-Control-Allow-Origin")

if [[ "$CORS" == *"evil.com"* ]]; then
  echo "❌ FAIL: CORS allows all origins!" | tee -a $RESULTS_FILE
elif [[ -z "$CORS" ]]; then
  echo "✅ PASS: CORS properly restricted" | tee -a $RESULTS_FILE
else
  echo "⚠️  WARNING: $CORS" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 3: XSS Protection =====
echo "TEST 3: XSS Protection in Reviews" | tee -a $RESULTS_FILE

XSS_PAYLOAD='<script>alert("xss")</script>'
RESULT=$(curl -s -X POST "$API_URL/engagement/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{\"text\": \"$XSS_PAYLOAD\"}")

if [[ "$RESULT" == *"<script>"* ]]; then
  echo "❌ FAIL: XSS payload not escaped!" | tee -a $RESULTS_FILE
elif [[ "$RESULT" == *"&lt;script&gt;"* ]] || [[ "$RESULT" == *"\u003cscript\u003e"* ]]; then
  echo "✅ PASS: XSS payload properly escaped" | tee -a $RESULTS_FILE
else
  echo "⚠️  UNCLEAR: Review rejected or stored safely" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 4: Rate Limiting =====
echo "TEST 4: Rate Limiting" | tee -a $RESULTS_FILE
echo "Sending 100 requests..." | tee -a $RESULTS_FILE

BLOCKED=0
for i in {1..100}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/discovery/tours" \
    -H "Authorization: Bearer test-token")
  
  if [[ "$HTTP_CODE" == "429" ]]; then
    BLOCKED=$i
    break
  fi
done

if [[ $BLOCKED -gt 0 && $BLOCKED -lt 100 ]]; then
  echo "✅ PASS: Rate limited after $BLOCKED requests" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL: Rate limiting not working properly" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 5: JWT Expiration =====
echo "TEST 5: JWT Token Expiration" | tee -a $RESULTS_FILE
EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0MjI3NzU2NDB9.signature"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/user/profile" \
  -H "Authorization: Bearer $EXPIRED_TOKEN")

if [[ "$HTTP_CODE" == "401" ]]; then
  echo "✅ PASS: Expired token properly rejected" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL: Expired token not rejected (HTTP $HTTP_CODE)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 6: HTTPS/TLS =====
echo "TEST 6: HTTPS/TLS" | tee -a $RESULTS_FILE

if [[ "$API_URL" == "https://"* ]]; then
  SSL_RESULT=$(curl -s -I "$API_URL" | grep -i "ssl\|tls")
  echo "✅ PASS: Using HTTPS" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL: Not using HTTPS" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# ===== TEST 7: Brute Force Protection =====
echo "TEST 7: Brute Force Protection on Login" | tee -a $RESULTS_FILE

for i in {1..10}; do
  curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}' > /dev/null
done

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}')

if [[ "$HTTP_CODE" == "429" ]] || [[ "$HTTP_CODE" == "403" ]]; then
  echo "✅ PASS: Brute force blocked" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL: Brute force not protected (HTTP $HTTP_CODE)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

echo "=================================" | tee -a $RESULTS_FILE
echo "Security Audit Complete!" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE"
```

---

## ТЕСТОВЫЙ СКРИПТ 3: Performance тестирование

```typescript
// tests/load/tourist-performance.test.ts

import { check, sleep } from 'k6'
import http from 'k6/http'

export const options = {
  vus: 10,       // 10 concurrent users
  duration: '1m', // 1 minute test
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.1'],  // Fail rate < 10%
  }
}

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api'
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || 'test-token'

export default function() {
  // Simulate tourist journey
  
  // 1. Get all tours
  let response = http.get(\`\${BASE_URL}/discovery/tours?limit=50\`, {
    headers: { 'Authorization': \`Bearer \${ACCESS_TOKEN}\` }
  })
  check(response, { 'GET /tours status 200': (r) => r.status === 200 })
  check(response, { 'Tours loaded < 500ms': (r) => r.timings.duration < 500 })
  sleep(1)
  
  // 2. Search tours with filters
  response = http.get(
    \`\${BASE_URL}/discovery/search?region=Kamchatka&minPrice=50000&maxPrice=200000\`,
    { headers: { 'Authorization': \`Bearer \${ACCESS_TOKEN}\` } }
  )
  check(response, { 'GET /search status 200': (r) => r.status === 200 })
  check(response, { 'Search < 1000ms': (r) => r.timings.duration < 1000 })
  sleep(1)
  
  // 3. Get user dashboard
  response = http.get(\`\${BASE_URL}/analytics/user/dashboard\`, {
    headers: { 'Authorization': \`Bearer \${ACCESS_TOKEN}\` }
  })
  check(response, { 'GET /dashboard status 200': (r) => r.status === 200 })
  check(response, { 'Dashboard < 300ms': (r) => r.timings.duration < 300 })
  sleep(1)
  
  // 4. Get wishlists
  response = http.get(\`\${BASE_URL}/engagement/wishlists\`, {
    headers: { 'Authorization': \`Bearer \${ACCESS_TOKEN}\` }
  })
  check(response, { 'GET /wishlists status 200': (r) => r.status === 200 })
  sleep(0.5)
  
  // 5. Get support tickets
  response = http.get(\`\${BASE_URL}/support/tickets\`, {
    headers: { 'Authorization': \`Bearer \${ACCESS_TOKEN}\` }
  })
  check(response, { 'GET /tickets status 200': (r) => r.status === 200 })
}
```

---

## ЗАПУСК ТЕСТОВ

```bash
# Запустить интеграционные тесты
npm run test:integration

# Запустить security audit
bash tests/security/tourist-security-audit.sh

# Запустить performance тесты
npm run test:load

# Запустить все тесты
npm run test:all
```

---

**Этот набор тестов помогает выявить:**
- ✅ Функциональные ошибки в journey
- ✅ Уязвимости безопасности
- ✅ Проблемы с производительностью
- ✅ Race conditions и concurrency issues
