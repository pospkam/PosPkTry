import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/bookings/route';
import { query } from '@core-infrastructure/lib/database';
import { createMockRequest, createMockQueryResult, mockBooking, mockTour, mockUser } from '../helpers/mock-data';

// Получаем мокированную функцию query
const mockQuery = vi.mocked(query);

describe('Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bookings', () => {
    it('should return user bookings with tour details', async () => {
      // Mock database responses
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        {
          id: 'booking-123',
          userId: 'user-123',
          tourId: 'tour-123',
          date: new Date('2025-12-01'),
          participants: 2,
          totalPrice: 10000,
          status: 'confirmed',
          paymentStatus: 'paid',
          specialRequests: 'Vegetarian meals',
          createdAt: new Date('2025-11-01'),
          updatedAt: new Date('2025-11-01'),
          tourTitle: 'Восхождение на вулкан',
          tourDescription: 'Незабываемое приключение',
          tourDifficulty: 'medium',
          duration: 8,
          tourPrice: 5000,
          maxParticipants: 10,
          minParticipants: 2,
          tourRating: 4.8,
          reviewsCount: 45,
          operatorName: 'Камчатка Тревел',
          operatorRating: 4.9,
        },
      ]));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('booking-123');
      expect(data.data[0].tourTitle).toBe('Восхождение на вулкан');
    });

    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings',
        headers: {}, // No x-user-id header
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('не авторизован');
    });

    it('should filter bookings by status', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([
        {
          ...mockBooking,
          status: 'confirmed',
        },
      ]));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings?status=confirmed',
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('b.status = $2'),
        expect.arrayContaining(['user-123', 'confirmed'])
      );
      expect(data.success).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings?limit=5&offset=10',
        headers: { 'x-user-id': 'user-123' },
      });

      await GET(request as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining(['user-123', 5, 10])
      );
    });

    it('should return empty array when no bookings found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      // Mock проверки тура
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'tour-123',
        name: 'Test Tour',
        price: 5000,
        max_group_size: 10,
      }]));

      // Mock проверки доступности
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        booked_participants: 5,
      }]));

      // Mock создания бронирования
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'new-booking-123',
      }]));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          tourId: 'tour-123',
          date: '2025-12-01',
          participants: 2,
          specialRequests: 'No special requests',
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.bookingId).toBe('new-booking-123');
    });

    it('should require authentication for creating bookings', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: {}, // No auth header
        body: {
          tourId: 'tour-123',
          date: '2025-12-01',
          participants: 2,
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          // Missing tourId
          date: '2025-12-01',
          participants: 2,
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('обязательн');
    });

    it('should validate participants is positive number', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          tourId: 'tour-123',
          date: '2025-12-01',
          participants: -1, // Invalid
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should check tour existence', async () => {
      // Mock несуществующего тура
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          tourId: 'nonexistent-tour',
          date: '2025-12-01',
          participants: 2,
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('не найден');
    });

    it('should check tour availability', async () => {
      // Mock тура
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'tour-123',
        price: 5000,
        max_group_size: 10,
      }]));

      // Mock полной загруженности
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        booked_participants: 9, // 9 уже забронировано из 10
      }]));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          tourId: 'tour-123',
          date: '2025-12-01',
          participants: 2, // Пытаемся забронировать 2 места
        },
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('недостаточно мест');
    });

    it('should calculate total price correctly', async () => {
      const tourPrice = 5000;
      const participants = 3;

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'tour-123',
        price: tourPrice,
        max_group_size: 10,
      }]));

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        booked_participants: 0,
      }]));

      mockQuery.mockResolvedValueOnce(createMockQueryResult([{
        id: 'booking-123',
      }]));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/bookings',
        headers: { 'x-user-id': 'user-123' },
        body: {
          tourId: 'tour-123',
          date: '2025-12-01',
          participants,
        },
      });

      await POST(request as any);

      // Проверяем, что цена рассчитана правильно
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(String), // userId
          'tour-123',
          expect.any(Date),
          participants,
          tourPrice * participants, // Правильная цена
          expect.any(String), // status
          expect.any(String), // paymentStatus
          expect.anything(), // specialRequests
        ])
      );
    });
  });
});












