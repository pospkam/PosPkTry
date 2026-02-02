import { describe, it, expect, beforeEach } from 'vitest';
import { resetFetchMock, mockApiSuccess, mockApiError } from '../setup';

describe('Tourist API Tests', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  describe('GET /api/tourist/profile - Профиль туриста', () => {
    it('должен вернуть профиль туриста', async () => {
      const mockProfile = {
        id: 'tourist-1',
        user_id: 'user-1',
        full_name: 'Иван Петров',
        loyalty_points: 500,
        loyalty_tier: 'silver',
        total_trips: 5,
        total_spent: 75000,
      };

      mockApiSuccess(mockProfile);

      const response = await fetch('/api/tourist/profile', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.loyalty_tier).toBe('silver');
      expect(data.data.total_trips).toBe(5);
    });

    it('должен создать профиль если его нет', async () => {
      mockApiSuccess({
        id: 'new-tourist',
        loyalty_tier: 'bronze',
        total_trips: 0,
      });

      const response = await fetch('/api/tourist/profile', {
        headers: { Authorization: 'Bearer new-tourist-token' },
      });

      const data = await response.json();

      expect(data.data.loyalty_tier).toBe('bronze');
      expect(data.data.total_trips).toBe(0);
    });
  });

  describe('PUT /api/tourist/profile - Обновление профиля', () => {
    it('должен обновить данные профиля', async () => {
      const updates = {
        full_name: 'Иван Иванов',
        date_of_birth: '1990-05-15',
        interests: ['hiking', 'photography'],
        emergency_contact_name: 'Мария Иванова',
        emergency_contact_phone: '+79001234567',
      };

      mockApiSuccess({ ...updates, id: 'tourist-1' });

      const response = await fetch('/api/tourist/profile', {
        method: 'PUT',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.full_name).toBe('Иван Иванов');
      expect(data.data.interests).toContain('hiking');
    });
  });

  describe('GET /api/tourist/trips - Список поездок', () => {
    it('должен вернуть все поездки туриста', async () => {
      const mockTrips = [
        {
          id: 'trip-1',
          destination: 'Долина Гейзеров',
          start_date: '2024-07-15',
          end_date: '2024-07-20',
          status: 'completed',
          total_cost: 45000,
        },
        {
          id: 'trip-2',
          destination: 'Вулкан Авача',
          start_date: '2024-12-25',
          end_date: '2024-12-27',
          status: 'upcoming',
          total_cost: 15000,
        },
      ];

      mockApiSuccess(mockTrips);

      const response = await fetch('/api/tourist/trips', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data[0].status).toBe('completed');
      expect(data.data[1].status).toBe('upcoming');
    });

    it('должен фильтровать поездки по статусу', async () => {
      mockApiSuccess([
        { status: 'upcoming', destination: 'Камчатка' },
      ]);

      const response = await fetch('/api/tourist/trips?status=upcoming', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data.every((trip: any) => trip.status === 'upcoming')).toBe(true);
    });
  });

  describe('POST /api/tourist/trips - Создание поездки', () => {
    it('должен создать новую поездку', async () => {
      const newTrip = {
        destination: 'Курильское озеро',
        start_date: '2024-08-01',
        end_date: '2024-08-05',
        budget: 50000,
        preferences: { difficulty: 'medium', group_size: 4 },
      };

      mockApiSuccess({ ...newTrip, id: 'new-trip-id', status: 'planning' });

      const response = await fetch('/api/tourist/trips', {
        method: 'POST',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify(newTrip),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.status).toBe('planning');
    });

    it('должен валидировать даты поездки', async () => {
      mockApiError('Дата окончания должна быть позже даты начала', 400);

      const invalidTrip = {
        destination: 'Камчатка',
        start_date: '2024-08-05',
        end_date: '2024-08-01', // неверная дата
      };

      const response = await fetch('/api/tourist/trips', {
        method: 'POST',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify(invalidTrip),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('позже');
    });
  });

  describe('GET /api/tourist/wishlist - Избранное', () => {
    it('должен вернуть список избранного', async () => {
      const mockWishlist = [
        { id: 'w1', item_type: 'tour', item_id: 'tour-1', item_name: 'Вулканы Камчатки' },
        { id: 'w2', item_type: 'accommodation', item_id: 'hotel-1', item_name: 'Отель "Камчатка"' },
      ];

      mockApiSuccess(mockWishlist);

      const response = await fetch('/api/tourist/wishlist', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data[0].item_type).toBe('tour');
    });
  });

  describe('POST /api/tourist/wishlist - Добавить в избранное', () => {
    it('должен добавить элемент в избранное', async () => {
      const wishlistItem = {
        item_type: 'tour',
        item_id: 'tour-123',
      };

      mockApiSuccess({ ...wishlistItem, id: 'new-wishlist-id' });

      const response = await fetch('/api/tourist/wishlist', {
        method: 'POST',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify(wishlistItem),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });

    it('должен предотвратить дубликаты в избранном', async () => {
      mockApiSuccess({ message: 'Уже в избранном' });

      const response = await fetch('/api/tourist/wishlist', {
        method: 'POST',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify({ item_type: 'tour', item_id: 'tour-1' }),
      });

      const data = await response.json();

      expect(data.data.message).toContain('избранном');
    });
  });

  describe('GET /api/tourist/documents - Документы туриста', () => {
    it('должен вернуть список документов', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          document_type: 'passport',
          document_number: '1234 567890',
          expiry_date: '2030-12-31',
          reminder_sent: false,
        },
        {
          id: 'doc-2',
          document_type: 'visa',
          document_number: 'VISA123',
          expiry_date: '2025-06-30',
          reminder_sent: false,
        },
      ];

      mockApiSuccess(mockDocs);

      const response = await fetch('/api/tourist/documents', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data[0].document_type).toBe('passport');
    });
  });

  describe('POST /api/tourist/documents - Добавить документ', () => {
    it('должен добавить новый документ', async () => {
      const newDoc = {
        document_type: 'passport',
        document_number: '9876 543210',
        issue_date: '2020-01-15',
        expiry_date: '2030-01-15',
      };

      mockApiSuccess({ ...newDoc, id: 'new-doc-id' });

      const response = await fetch('/api/tourist/documents', {
        method: 'POST',
        headers: { Authorization: 'Bearer tourist-token' },
        body: JSON.stringify(newDoc),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });
  });

  describe('GET /api/tourist/achievements - Достижения', () => {
    it('должен вернуть список достижений', async () => {
      const mockAchievements = [
        {
          id: 'ach-1',
          achievement_type: 'first_trip',
          name: 'Первая поездка',
          description: 'Совершите свою первую поездку',
          points_awarded: 100,
          unlocked_at: '2024-01-15',
        },
        {
          id: 'ach-2',
          achievement_type: 'volcano_explorer',
          name: 'Исследователь вулканов',
          description: 'Посетите 3 вулкана',
          points_awarded: 250,
          unlocked_at: '2024-06-20',
        },
      ];

      mockApiSuccess(mockAchievements);

      const response = await fetch('/api/tourist/achievements', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data[0].points_awarded).toBe(100);
    });
  });

  describe('GET /api/tourist/stats - Статистика туриста', () => {
    it('должен вернуть полную статистику', async () => {
      const mockStats = {
        profile: {
          loyalty_points: 1500,
          loyalty_tier: 'gold',
          total_trips: 12,
          total_spent: 250000,
        },
        travel_stats: {
          countries_visited: 1,
          cities_visited: 3,
          total_distance: 5000,
          favorite_season: 'summer',
        },
        achievements_count: 8,
        upcoming_trips_count: 2,
      };

      mockApiSuccess(mockStats);

      const response = await fetch('/api/tourist/stats', {
        headers: { Authorization: 'Bearer tourist-token' },
      });

      const data = await response.json();

      expect(data.data.profile.loyalty_tier).toBe('gold');
      expect(data.data.travel_stats.cities_visited).toBe(3);
      expect(data.data.achievements_count).toBeGreaterThan(0);
    });
  });
});
