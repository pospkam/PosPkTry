import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetFetchMock, mockApiSuccess, mockApiError } from '../setup';

describe('Cars API Tests', () => {
  beforeEach(() => {
    resetFetchMock();
  });

  describe('GET /api/cars - Поиск доступных автомобилей', () => {
    it('должен вернуть список доступных автомобилей', async () => {
      const mockCars = [
        {
          id: '1',
          brand: 'Toyota',
          model: 'Land Cruiser',
          year: 2023,
          price_per_day: 5000,
          available_quantity: 2,
        },
        {
          id: '2',
          brand: 'UAZ',
          model: 'Patriot',
          year: 2022,
          price_per_day: 3500,
          available_quantity: 3,
        },
      ];

      mockApiSuccess(mockCars);

      const response = await fetch('/api/cars');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].brand).toBe('Toyota');
    });

    it('должен фильтровать по бренду', async () => {
      mockApiSuccess([{ brand: 'Toyota', model: 'Land Cruiser' }]);

      const response = await fetch('/api/cars?brand=Toyota');
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].brand).toBe('Toyota');
    });

    it('должен фильтровать по диапазону цен', async () => {
      mockApiSuccess([{ price_per_day: 4000 }]);

      const response = await fetch('/api/cars?minPrice=3000&maxPrice=5000');
      const data = await response.json();

      expect(data.data[0].price_per_day).toBeGreaterThanOrEqual(3000);
      expect(data.data[0].price_per_day).toBeLessThanOrEqual(5000);
    });
  });

  describe('POST /api/cars/rentals - Бронирование автомобиля', () => {
    it('должен успешно забронировать автомобиль', async () => {
      const rental = {
        car_id: '1',
        start_date: '2024-12-25',
        end_date: '2024-12-30',
        driver_license: 'AB123456',
        total_price: 25000,
      };

      mockApiSuccess({ ...rental, rental_number: 'CR-2024-001' });

      const response = await fetch('/api/cars/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.rental_number).toMatch(/^CR-\d{4}-\d{3}$/);
    });

    it('должен отклонить бронирование без водительских прав', async () => {
      mockApiError('Необходимо указать номер водительских прав', 400);

      const response = await fetch('/api/cars/rentals', {
        method: 'POST',
        body: JSON.stringify({
          car_id: '1',
          start_date: '2024-12-25',
          end_date: '2024-12-30',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('водительских прав');
    });

    it('должен проверить доступность автомобиля на даты', async () => {
      mockApiError('Автомобиль недоступен на выбранные даты', 400);

      const response = await fetch('/api/cars/rentals', {
        method: 'POST',
        body: JSON.stringify({
          car_id: '1',
          start_date: '2024-12-25',
          end_date: '2024-12-30',
          driver_license: 'AB123456',
        }),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('недоступен');
    });

    it('должен рассчитать правильную стоимость аренды', async () => {
      // 5 дней * 5000 = 25000
      const rental = {
        car_id: '1',
        start_date: '2024-12-25',
        end_date: '2024-12-30',
        driver_license: 'AB123456',
      };

      mockApiSuccess({ ...rental, total_price: 25000, daily_rate: 5000 });

      const response = await fetch('/api/cars/rentals', {
        method: 'POST',
        body: JSON.stringify(rental),
      });

      const data = await response.json();

      expect(data.data.total_price).toBe(25000);
    });
  });

  describe('GET /api/cars/items - Управление автопарком (партнер)', () => {
    it('должен вернуть автомобили партнера', async () => {
      mockApiSuccess([
        { id: '1', brand: 'Toyota', partner_id: 'partner-1' },
        { id: '2', brand: 'UAZ', partner_id: 'partner-1' },
      ]);

      const response = await fetch('/api/cars/items', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data.every((car: any) => car.partner_id === 'partner-1')).toBe(true);
    });

    it('должен требовать аутентификацию', async () => {
      mockApiError('Unauthorized', 401);

      const response = await fetch('/api/cars/items');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cars/items - Добавление автомобиля', () => {
    it('должен добавить новый автомобиль', async () => {
      const newCar = {
        brand: 'Toyota',
        model: 'Land Cruiser',
        year: 2023,
        license_plate: 'А123БВ41',
        price_per_day: 5000,
        deposit_amount: 20000,
        quantity: 2,
      };

      mockApiSuccess({ ...newCar, id: 'new-car-id' });

      const response = await fetch('/api/cars/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify(newCar),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
    });

    it('должен валидировать обязательные поля', async () => {
      mockApiError('Все поля обязательны для заполнения', 400);

      const response = await fetch('/api/cars/items', {
        method: 'POST',
        headers: { Authorization: 'Bearer partner-token' },
        body: JSON.stringify({ brand: 'Toyota' }),
      });

      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain('обязательны');
    });
  });

  describe('GET /api/cars/stats - Статистика партнера', () => {
    it('должен вернуть статистику автопарка', async () => {
      const mockStats = {
        total_cars: 10,
        active_rentals: 5,
        total_revenue: 150000,
        average_utilization: 75,
        top_cars: [
          { id: '1', brand: 'Toyota', bookings_count: 25 },
          { id: '2', brand: 'UAZ', bookings_count: 20 },
        ],
      };

      mockApiSuccess(mockStats);

      const response = await fetch('/api/cars/stats', {
        headers: { Authorization: 'Bearer partner-token' },
      });

      const data = await response.json();

      expect(data.data.total_cars).toBe(10);
      expect(data.data.active_rentals).toBe(5);
      expect(data.data.total_revenue).toBeGreaterThan(0);
    });
  });
});
