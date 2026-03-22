/**
 * Mock данные для тестов
 */

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+79001234567',
  role: 'tourist',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockAdmin = {
  id: 'admin-123',
  email: 'admin@kamhub.ru',
  name: 'Admin User',
  phone: '+79001234567',
  role: 'admin',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockOperator = {
  id: 'operator-123',
  email: 'operator@kamhub.ru',
  name: 'Tour Operator',
  phone: '+79001234567',
  role: 'operator',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockTour = {
  id: 'tour-123',
  name: 'Восхождение на Авачинский вулкан',
  description: 'Незабываемое приключение',
  operator_id: 'operator-123',
  category: 'adventure',
  difficulty: 'medium',
  duration: 8,
  price: 5000,
  currency: 'RUB',
  max_group_size: 10,
  min_group_size: 2,
  rating: 4.8,
  review_count: 45,
  is_active: true,
  images: ['https://example.com/image1.jpg'],
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockBooking = {
  id: 'booking-123',
  user_id: 'test-user-123',
  tour_id: 'tour-123',
  date: new Date('2025-12-01'),
  participants: 2,
  total_price: 10000,
  status: 'confirmed',
  payment_status: 'paid',
  special_requests: 'Vegetarian meals',
  created_at: new Date('2025-11-01'),
  updated_at: new Date('2025-11-01'),
};

export const mockReview = {
  id: 'review-123',
  user_id: 'test-user-123',
  tour_id: 'tour-123',
  rating: 5,
  comment: 'Отличный тур!',
  images: [],
  is_verified: true,
  created_at: new Date('2025-11-05'),
  updated_at: new Date('2025-11-05'),
};

export const mockPayment = {
  id: 'payment-123',
  booking_id: 'booking-123',
  user_id: 'test-user-123',
  amount: 10000,
  currency: 'RUB',
  status: 'success',
  payment_method: 'card',
  transaction_id: 'cp_trans_123',
  created_at: new Date('2025-11-01'),
  updated_at: new Date('2025-11-01'),
};

export const mockAccommodation = {
  id: 'accommodation-123',
  name: 'Камчатка Гостевой Дом',
  description: 'Уютный гостевой дом в центре',
  provider_id: 'provider-123',
  type: 'guesthouse',
  address: 'ул. Ленинская, 1',
  city: 'Петропавловск-Камчатский',
  rating: 4.5,
  review_count: 23,
  price_per_night: 3000,
  currency: 'RUB',
  amenities: ['wifi', 'parking', 'breakfast'],
  images: ['https://example.com/accommodation1.jpg'],
  is_active: true,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockAgent = {
  id: 'agent-123',
  user_id: 'user-agent-123',
  agency_name: 'Камчатка Турагентство',
  commission_rate: 0.10,
  total_bookings: 45,
  total_commission: 125000,
  status: 'active',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

export const mockTransferBooking = {
  id: 'transfer-123',
  user_id: 'test-user-123',
  route_id: 'route-123',
  pickup_location: 'Аэропорт',
  dropoff_location: 'Отель',
  pickup_datetime: new Date('2025-12-01T10:00:00'),
  passengers: 2,
  luggage: 2,
  total_price: 2000,
  status: 'confirmed',
  payment_status: 'paid',
  created_at: new Date('2025-11-01'),
  updated_at: new Date('2025-11-01'),
};

// Helper для создания mock запроса
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
  } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Helper для mock database response
export function createMockQueryResult<T>(rows: T[], rowCount?: number) {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}





