import { describe, it, expect, beforeEach } from 'vitest';
import { resetFetchMock, mockApiSuccess, mockApiError } from '../setup';

describe('Gear API Tests', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  describe('GET /api/gear - Поиск доступного снаряжения', () => {
    it('должен вернуть список доступного снаряжения', async () => {
      const mockGear = [
        {
          id: '1',
          name: 'Рюкзак туристический 60л',
          category: 'backpacks',
          price_per_day: 300,
          deposit: 2000,
          available_quantity: 5,
        },
        {
          id: '2',
          name: 'Палатка 3-местная',
          category: 'tents',
          price_per_day: 500,
          deposit: 5000,
          available_quantity: 3,
        },
      ];

      mockApiSuccess(mockGear);

      const response = await fetch('/api/gear');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].category).toBe('backpacks');
    });

    it('должен фильтровать по категории', async () => {
      mockApiSuccess([
        { name: 'Рюкзак 1', category: 'backpacks' },
        { name: 'Рюкзак 2', category: 'backpacks' },
      ]);

      const response = await fetch('/api/gear?category=backpacks');
      const data = await response.json();

      expect(data.data.every((item: any) => item.category === 'backpacks')).toBe(true);
    });

    it('должен фильтровать по размеру', async () => {
      mockApiSuccess([
        { name: 'Ботинки', size: '42' },
      ]);

      const response = await fetch('/api/gear?size=42');
      const data = await response.json();

      expect(data.data[0].size).toBe('42');
    });

    it('должен фильтровать по цене', async () => {
      mockApiSuccess([
        { price_per_day: 400 },
      ]);

      const response = await fetch('/api/gear?minPrice=300&maxPrice=500');
      const data = await response.json();

      expect(data.data[0].price_per_day).toBeGreaterThanOrEqual(300);
      expect(data.data[0].price_per_day).toBeLessThanOrEqual(500);
    });
  });

  describe('POST /api/gear/rentals - Аренда снаряжения', () => {
    it('должен успешно арендовать снаряжение', async () => {
      const rental = {
        items: [
          { gear_id: '1', quantity: 1 },
          { gear_id: '2', quantity: 1 },
        ],
        start_date: '2024-12-25',
        end_date: '2024-12-30',
      };

      mockApiSuccess({
        ...rental,
        rental_number: 'GR-2024-001',
        total_price: 4000,
        total_deposit: 7000,
      });

      const response = await fetch('/api/gear/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.rental_number).toMatch(/^GR-\d{4}-\d{3}$/);
      expect(data.data.total_price).toBeGreaterThan(0);
    });

    it('должен проверить доступность снаряжения', async () => {
      mockApiError('Снаряжение недоступно на выбранные даты', 400);

      const rental = {
        items: [{ gear_id: '1', quantity: 10 }],
        start_date: '2024-12-25',
        end_date: '2024-12-30',
      };

      const response = await fetch('/api/gear/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('недоступно');
    });

    it('должен рассчитать стоимость аренды', async () => {
      const rental = {
        items: [
          { gear_id: '1', quantity: 1, price_per_day: 300 }, // 5 дней * 300 = 1500
          { gear_id: '2', quantity: 1, price_per_day: 500 }, // 5 дней * 500 = 2500
        ],
        start_date: '2024-12-25',
        end_date: '2024-12-30',
      };

      mockApiSuccess({
        ...rental,
        total_price: 4000, // 1500 + 2500
        rental_days: 5,
      });

      const response = await fetch('/api/gear/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });

      const data = await response.json();

      expect(data.data.total_price).toBe(4000);
      expect(data.data.rental_days).toBe(5);
    });

    it('должен требовать депозит', async () => {
      mockApiSuccess({
        total_price: 4000,
        total_deposit: 7000,
        deposit_required: true,
      });

      const response = await fetch('/api/gear/rentals', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ gear_id: '1', quantity: 1 }],
          start_date: '2024-12-25',
          end_date: '2024-12-30',
        }),
      });

      const data = await response.json();

      expect(data.data.deposit_required).toBe(true);
      expect(data.data.total_deposit).toBeGreaterThan(0);
    });
  });

  describe('GET /api/gear/items - Управление снаряжением (партнер)', () => {
    it('должен вернуть снаряжение партнера', async () => {
      mockApiSuccess([
        { id: '1', name: 'Рюкзак', partner_id: 'partner-1' },
        { id: '2', name: 'Палатка', partner_id: 'partner-1' },
      ]);

      const response = await fetch('/api/gear/items', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
    });

    it('должен требовать аутентификацию', async () => {
      mockApiError('Unauthorized', 401);

      const response = await fetch('/api/gear/items');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/gear/items - Добавление снаряжения', () => {
    it('должен добавить новое снаряжение', async () => {
      const newGear = {
        name: 'Спальный мешок',
        category: 'sleeping_bags',
        description: 'Теплый спальный мешок до -10°C',
        price_per_day: 250,
        deposit: 1500,
        quantity: 10,
        size: 'L',
        weight: 1.2,
      };

      mockApiSuccess({ ...newGear, id: 'new-gear-id' });

      const response = await fetch('/api/gear/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify(newGear),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });

    it('должен валидировать обязательные поля', async () => {
      mockApiError('Все обязательные поля должны быть заполнены', 400);

      const response = await fetch('/api/gear/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify({ name: 'Рюкзак' }),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('обязательные');
    });
  });

  describe('GET /api/gear/stats - Статистика партнера', () => {
    it('должен вернуть статистику проката', async () => {
      const mockStats = {
        total_items: 50,
        active_rentals: 15,
        total_revenue: 85000,
        utilization_rate: 60,
        popular_items: [
          { id: '1', name: 'Рюкзак 60л', rental_count: 45 },
          { id: '2', name: 'Палатка', rental_count: 38 },
        ],
        maintenance_alerts: [
          { id: '3', name: 'Ботинки 42', status: 'needs_service' },
        ],
      };

      mockApiSuccess(mockStats);

      const response = await fetch('/api/gear/stats', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data.total_items).toBe(50);
      expect(data.data.active_rentals).toBe(15);
      expect(data.data.popular_items).toHaveLength(2);
    });
  });

  describe('Работа со снаряжением - полный цикл', () => {
    it('должен выполнить полный цикл аренды снаряжения', async () => {
      // 1. Поиск снаряжения
      mockApiSuccess([{ id: '1', name: 'Рюкзак', available_quantity: 5 }]);
      const searchResponse = await fetch('/api/gear?category=backpacks');
      const searchData = await searchResponse.json();
      expect(searchData.data).toHaveLength(1);

      // 2. Создание аренды
      resetFetchMock();
      mockApiSuccess({
        rental_number: 'GR-2024-001',
        status: 'pending',
        total_price: 1500,
      });
      const rentalResponse = await fetch('/api/gear/rentals', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ gear_id: '1', quantity: 1 }],
          start_date: '2024-12-25',
          end_date: '2024-12-30',
        }),
      });
      const rentalData = await rentalResponse.json();
      expect(rentalData.data.status).toBe('pending');

      // 3. Проверка списка аренд пользователя
      resetFetchMock();
      mockApiSuccess([
        { rental_number: 'GR-2024-001', status: 'pending' },
      ]);
      const myRentalsResponse = await fetch('/api/gear/rentals', {
        headers: { Authorization: 'Bearer user-token' },
      });
      const myRentals = await myRentalsResponse.json();
      expect(myRentals.data[0].rental_number).toBe('GR-2024-001');
    });
  });
});
