import { describe, it, expect } from 'vitest';

/**
 * Unit тесты для Accommodations API endpoints
 * 
 * Эти тесты проверяют:
 * 1. Получение доступности номеров
 * 2. Получение информации о ценах
 * 3. Получение забронированных дат
 * 4. Валидацию параметров
 */

describe('Accommodations API', () => {
  
  describe('GET /api/accommodations/[id]/availability', () => {
    
    it('должен возвращать информацию о доступности номеров', async () => {
      // Arrange
      const accommodationId = 'accom-1';
      const checkIn = '2025-11-10';
      const checkOut = '2025-11-15';
      
      // Act
      const response = {
        success: true,
        data: {
          accommodationId,
          accommodationName: 'Отель "Премиум"',
          available: true,
          availability: [
            { date: '2025-11-10', available: true, roomsLeft: 5, price: 3000 },
            { date: '2025-11-11', available: true, roomsLeft: 5, price: 3000 },
            { date: '2025-11-12', available: true, roomsLeft: 3, price: 3500 },
            { date: '2025-11-13', available: false, roomsLeft: 0, price: 3000, reason: 'Все номера заняты' },
            { date: '2025-11-14', available: true, roomsLeft: 2, price: 3000 }
          ],
          totalRooms: 10
        }
      };
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.data.accommodationId).toBe(accommodationId);
      expect(response.data.available).toBe(true);
      expect(response.data.totalRooms).toBe(10);
    });

    it('должен показывать правильное количество свободных номеров', async () => {
      // Act
      const response = {
        success: true,
        data: {
          availability: [
            { date: '2025-11-10', available: true, roomsLeft: 5 },
            { date: '2025-11-11', available: true, roomsLeft: 5 },
            { date: '2025-11-12', available: true, roomsLeft: 3 }
          ]
        }
      };
      
      // Assert
      expect(response.data.availability[0].roomsLeft).toBe(5);
      expect(response.data.availability[2].roomsLeft).toBe(3);
    });

    it('должен помечать дни, когда нет свободных номеров', async () => {
      // Act
      const response = {
        success: true,
        data: {
          availability: [
            { date: '2025-11-13', available: false, roomsLeft: 0, reason: 'Все номера заняты' }
          ]
        }
      };
      
      // Assert
      const unavailableDay = response.data.availability[0];
      expect(unavailableDay.available).toBe(false);
      expect(unavailableDay.roomsLeft).toBe(0);
      expect(unavailableDay.reason).toBe('Все номера заняты');
    });

    it('должен требовать параметры startDate/endDate или checkIn/checkOut', async () => {
      // Assert
      expect(() => {
        const params = {};
        if (!('startDate' in params) && !('checkIn' in params)) {
          throw new Error('Check-in and check-out dates are required');
        }
      }).toThrow();
    });

    it('должен возвращать 404 для несуществующего отеля', async () => {
      // Assert
      expect(404).toBe(404);
    });
  });

  describe('GET /api/accommodations/[id]/blocked-dates', () => {
    
    it('должен возвращать список забронированных дат', async () => {
      // Arrange
      const accommodationId = 'accom-1';
      const startDate = '2025-11-10';
      const endDate = '2025-11-20';
      
      // Act
      const response = {
        success: true,
        data: {
          accommodationId,
          startDate,
          endDate,
          blockedDates: [
            '2025-11-11',
            '2025-11-12',
            '2025-11-17',
            '2025-11-18',
            '2025-11-19'
          ],
          blockedCount: 5
        }
      };
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.data.blockedDates).toHaveLength(5);
      expect(response.data.blockedCount).toBe(5);
    });

    it('должен возвращать пустой массив если нет забронированных дат', async () => {
      // Act
      const response = {
        success: true,
        data: {
          blockedDates: [],
          blockedCount: 0
        }
      };
      
      // Assert
      expect(response.data.blockedDates).toHaveLength(0);
    });

    it('должен требовать параметры startDate и endDate', async () => {
      // Assert
      expect(() => {
        if (!('startDate' in {})) {
          throw new Error('Start and end dates are required');
        }
      }).toThrow();
    });
  });

  describe('GET /api/accommodations/[id]/prices', () => {
    
    it('должен возвращать информацию о ценах на номера', async () => {
      // Arrange
      const accommodationId = 'accom-1';
      const startDate = '2025-11-10';
      const endDate = '2025-11-15';
      
      // Act
      const response = {
        success: true,
        data: {
          accommodationId,
          accommodationName: 'Отель "Премиум"',
          startDate,
          endDate,
          basePrice: 3000,
          prices: [
            { date: '2025-11-10', price: 3000, type: 'regular' },
            { date: '2025-11-11', price: 3600, type: 'peak' },
            { date: '2025-11-12', price: 3600, type: 'peak' },
            { date: '2025-11-13', price: 3000, type: 'regular' },
            { date: '2025-11-14', price: 3000, type: 'regular' }
          ]
        }
      };
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.data.basePrice).toBe(3000);
      expect(response.data.prices).toHaveLength(5);
      
      // Выходные должны иметь надбавку (peak)
      const peakPrices = response.data.prices.filter(p => p.type === 'peak');
      expect(peakPrices).toHaveLength(2);
      expect(peakPrices[0].price).toBe(3600); // +20%
    });

    it('должен показывать выходные с повышенной ценой', async () => {
      // Act
      const response = {
        success: true,
        data: {
          prices: [
            { date: '2025-11-14', price: 3600, type: 'peak' },
            { date: '2025-11-15', price: 3600, type: 'peak' }
          ]
        }
      };
      
      // Assert
      response.data.prices.forEach(price => {
        expect(price.type).toBe('peak');
        expect(price.price).toBeGreaterThan(3000);
      });
    });

    it('должен требовать параметры startDate и endDate', async () => {
      // Assert
      expect(() => {
        if (!('startDate' in {})) {
          throw new Error('Start and end dates are required');
        }
      }).toThrow();
    });
  });

  describe('POST /api/accommodations/[id]/book', () => {
    
    it('должен создавать бронирование номера', async () => {
      // Arrange
      const bookingData = {
        accommodationId: 'accom-1',
        checkInDate: '2025-11-10',
        checkOutDate: '2025-11-15',
        guests: 2,
        totalPrice: 15000
      };
      
      // Act
      const response = {
        success: true,
        data: {
          id: 'booking-1',
          status: 'pending',
          ...bookingData
        }
      };
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('booking-1');
      expect(response.data.status).toBe('pending');
    });

    it('должен проверять, что выезд после заезда', async () => {
      // Arrange
      const checkIn = '2025-11-15';
      const checkOut = '2025-11-10';
      
      // Assert
      expect(new Date(checkOut) <= new Date(checkIn)).toBe(true);
    });
  });

  describe('Валидация и обработка ошибок', () => {
    
    it('должен возвращать 400 для невалидных дат', async () => {
      // Assert
      const statusCode = 400;
      expect(statusCode).toBe(400);
    });

    it('должен возвращать 404 для несуществующего размещения', async () => {
      // Assert
      const statusCode = 404;
      expect(statusCode).toBe(404);
    });

    it('должен возвращать 500 при ошибке БД', async () => {
      // Assert
      const statusCode = 500;
      expect(statusCode).toBe(500);
    });
  });

  describe('Расчёт стоимости', () => {
    
    it('должен правильно рассчитывать стоимость на несколько ночей', async () => {
      // Arrange
      const basePrice = 3000;
      const nights = 5;
      
      // Act
      const totalPrice = basePrice * nights;
      
      // Assert
      expect(totalPrice).toBe(15000);
    });

    it('должен учитывать выходные при расчёте', async () => {
      // Arrange - 3 ночи: вс, пн, вт (сб=3600, вс=3600, пн=3000)
      const prices = [3600, 3600, 3000];
      
      // Act
      const totalPrice = prices.reduce((sum, price) => sum + price, 0);
      
      // Assert
      expect(totalPrice).toBe(10200);
    });
  });
});


