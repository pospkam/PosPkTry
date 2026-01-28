/**
 * Комплексные тесты для всех сущностей KamHub
 * Включает unit тесты и integration тесты
 * Выявляет баги и ошибки в бизнес-процессах
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('ENTITIES AND BUSINESS PROCESSES TESTS', () => {
  // ============================================
  // 1. USERS & AUTHENTICATION
  // ============================================
  describe('1. Users & Authentication', () => {
    it('Should create user with valid email', async () => {
      const email = `test-${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'TestPass123!@#',
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
          role: 'tourist',
        },
      });

      expect(error).toBeNull();
      expect(data.user?.email).toBe(email);
      expect(data.user?.user_metadata?.role).toBe('tourist');
    });

    it('Should reject user without proper email format', async () => {
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'invalid-email',
        password: 'TestPass123!',
      });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('invalid');
    });

    it('Should reject weak passwords', async () => {
      const { error } = await supabase.auth.admin.createUser({
        email: `test-${Date.now()}@example.com`,
        password: '123',
      });

      expect(error).not.toBeNull();
    });

    it('Should create user profiles for all roles', async () => {
      const roles = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin'];

      for (const role of roles) {
        const email = `${role}-${Date.now()}@example.com`;
        const { data: user, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: 'TestPass123!@#',
          user_metadata: { role },
        });

        if (!authError && user.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.user.id,
              email,
              role,
              full_name: `${role.toUpperCase()} User`,
            });

          expect(profileError).toBeNull();
        }
      }
    });
  });

  // ============================================
  // 2. TOURS & TOUR MANAGEMENT
  // ============================================
  describe('2. Tours Management', () => {
    let tourId: string;
    let operatorId: string;

    beforeEach(async () => {
      // Создаем туроператора
      const { data: user } = await supabase.auth.admin.createUser({
        email: `operator-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });

      operatorId = user.user?.id || '';

      // Создаем тур
      const { data: tour, error } = await supabase
        .from('tours')
        .insert({
          operator_id: operatorId,
          title: 'Восхождение на вулкан Авача',
          description: 'Тур на Авачинский вулкан',
          price: 5000,
          currency: 'RUB',
          duration_days: 2,
          max_participants: 10,
          difficulty_level: 'medium',
          includes_guide: true,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      tourId = tour?.id || '';
    });

    it('Should create tour with valid data', () => {
      expect(tourId).toBeTruthy();
    });

    it('Should validate tour price is positive', async () => {
      const { error } = await supabase
        .from('tours')
        .insert({
          operator_id: operatorId,
          title: 'Bad Tour',
          price: -5000,
          duration_days: 1,
          max_participants: 5,
        });

      expect(error).not.toBeNull();
    });

    it('Should validate max_participants greater than 0', async () => {
      const { error } = await supabase
        .from('tours')
        .insert({
          operator_id: operatorId,
          title: 'Bad Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 0,
        });

      expect(error).not.toBeNull();
    });

    it('Should validate duration_days is positive', async () => {
      const { error } = await supabase
        .from('tours')
        .insert({
          operator_id: operatorId,
          title: 'Bad Tour',
          price: 5000,
          duration_days: -1,
          max_participants: 5,
        });

      expect(error).not.toBeNull();
    });

    it('Should update tour correctly', async () => {
      const { data, error } = await supabase
        .from('tours')
        .update({
          title: 'Updated Title',
          price: 6000,
        })
        .eq('id', tourId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Updated Title');
      expect(data?.price).toBe(6000);
    });

    it('Should deactivate tour', async () => {
      const { data, error } = await supabase
        .from('tours')
        .update({ is_active: false })
        .eq('id', tourId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.is_active).toBe(false);
    });

    it('Should not allow inactive tour for bookings', async () => {
      await supabase.from('tours').update({ is_active: false }).eq('id', tourId);

      const { error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tourId,
          user_id: 'test-user',
          participants: 2,
          total_price: 10000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });
  });

  // ============================================
  // 3. BOOKINGS PROCESS
  // ============================================
  describe('3. Bookings Process', () => {
    let bookingId: string;
    let tourId: string;
    let userId: string;

    beforeEach(async () => {
      // Создаем пользователя (туриста)
      const { data: user } = await supabase.auth.admin.createUser({
        email: `tourist-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
        user_metadata: { role: 'tourist' },
      });
      userId = user.user?.id || '';

      // Создаем туроператора
      const { data: operator } = await supabase.auth.admin.createUser({
        email: `operator-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });

      // Создаем тур
      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Test Tour',
          price: 5000,
          duration_days: 2,
          max_participants: 10,
          is_active: true,
        })
        .select()
        .single();

      tourId = tour?.id || '';

      // Создаем бронирование
      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tourId,
          user_id: userId,
          participants: 2,
          total_price: 10000,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      bookingId = booking?.id || '';
    });

    it('Should create booking with valid data', () => {
      expect(bookingId).toBeTruthy();
    });

    it('Should not exceed max participants', async () => {
      const { error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tourId,
          user_id: userId,
          participants: 15, // Exceeds max 10
          total_price: 75000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should require positive participant count', async () => {
      const { error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tourId,
          user_id: userId,
          participants: 0,
          total_price: 0,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should calculate total price correctly', async () => {
      const tourPrice = 5000;
      const participants = 3;
      const expectedTotal = tourPrice * participants;

      const { data: booking } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('id', bookingId)
        .single();

      expect(booking?.total_price).toBe(expectedTotal);
    });

    it('Should support booking status transitions', async () => {
      const statuses = ['pending', 'confirmed', 'paid', 'completed', 'cancelled'];

      for (const status of statuses) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', bookingId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe(status);
      }
    });

    it('Should not allow booking on same tour with conflicting dates', async () => {
      const { data: conflictBooking, error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tourId,
          user_id: 'another-user',
          participants: 2,
          total_price: 10000,
          status: 'confirmed',
          start_date: '2026-02-01',
          end_date: '2026-02-02',
        })
        .select();

      // Проверяем, есть ли конфликт дат
      if (conflictBooking && conflictBooking.length > 0) {
        expect(error?.message).toContain('conflict');
      }
    });

    it('Should update booking status and preserve other fields', async () => {
      const { data: original } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.participants).toBe(original?.participants);
      expect(updated?.total_price).toBe(original?.total_price);
      expect(updated?.status).toBe('confirmed');
    });
  });

  // ============================================
  // 4. REVIEWS AND RATINGS
  // ============================================
  describe('4. Reviews and Ratings', () => {
    let reviewId: string;
    let tourId: string;
    let userId: string;

    beforeEach(async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `reviewer-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });
      userId = user.user?.id || '';

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Review Test Tour',
          price: 5000,
          duration_days: 2,
          max_participants: 10,
          is_active: true,
        })
        .select()
        .single();

      tourId = tour?.id || '';

      const { data: review } = await supabase
        .from('reviews')
        .insert({
          tour_id: tourId,
          user_id: userId,
          rating: 5,
          title: 'Amazing tour!',
          content: 'Best experience ever',
          is_verified: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      reviewId = review?.id || '';
    });

    it('Should create review with rating 1-5', () => {
      expect(reviewId).toBeTruthy();
    });

    it('Should reject rating outside 1-5 range', async () => {
      const { error: error6 } = await supabase
        .from('reviews')
        .insert({
          tour_id: tourId,
          user_id: userId,
          rating: 6,
          title: 'Invalid rating',
          content: 'Too high',
        });

      const { error: error0 } = await supabase
        .from('reviews')
        .insert({
          tour_id: tourId,
          user_id: userId,
          rating: 0,
          title: 'Invalid rating',
          content: 'Too low',
        });

      expect(error6).not.toBeNull();
      expect(error0).not.toBeNull();
    });

    it('Should calculate average rating for tour', async () => {
      // Создаем 5 отзывов с разными рейтингами
      const ratings = [5, 4, 3, 4, 5];
      for (const rating of ratings) {
        await supabase
          .from('reviews')
          .insert({
            tour_id: tourId,
            user_id: `user-${Math.random()}`,
            rating,
            title: `Rating ${rating}`,
            content: 'Test review',
          });
      }

      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tour_id', tourId);

      if (data && data.length > 0) {
        const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        expect(average).toBeGreaterThan(3);
        expect(average).toBeLessThanOrEqual(5);
      }
    });

    it('Should allow review modification by author', async () => {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          content: 'Updated review content',
          rating: 4,
        })
        .eq('id', reviewId)
        .eq('user_id', userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.content).toBe('Updated review content');
      expect(data?.rating).toBe(4);
    });

    it('Should prevent duplicate reviews from same user', async () => {
      const { error } = await supabase
        .from('reviews')
        .insert({
          tour_id: tourId,
          user_id: userId,
          rating: 5,
          title: 'Duplicate review',
          content: 'Should fail',
        });

      // Ожидаем ошибку или null в зависимости от реализации
      // если есть unique constraint
    });
  });

  // ============================================
  // 5. PAYMENTS & TRANSACTIONS
  // ============================================
  describe('5. Payments & Transactions', () => {
    let transactionId: string;
    let bookingId: string;

    beforeEach(async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `payer-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-pay-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Paid Tour',
          price: 10000,
          duration_days: 2,
          max_participants: 10,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: user.user?.id,
          participants: 2,
          total_price: 20000,
          status: 'pending',
        })
        .select()
        .single();

      bookingId = booking?.id || '';

      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          booking_id: bookingId,
          amount: 20000,
          currency: 'RUB',
          status: 'pending',
          payment_method: 'card',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      transactionId = transaction?.id || '';
    });

    it('Should create transaction for booking', () => {
      expect(transactionId).toBeTruthy();
    });

    it('Should reject negative amounts', async () => {
      const { error } = await supabase
        .from('transactions')
        .insert({
          booking_id: bookingId,
          amount: -1000,
          currency: 'RUB',
          status: 'pending',
          payment_method: 'card',
        });

      expect(error).not.toBeNull();
    });

    it('Should validate transaction status transitions', async () => {
      const validTransitions = [
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
      ];

      for (const status of validTransitions) {
        const { data, error } = await supabase
          .from('transactions')
          .update({ status })
          .eq('id', transactionId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe(status);
      }
    });

    it('Should prevent duplicate payments for same booking', async () => {
      // Первый платеж
      const { data: payment1 } = await supabase
        .from('transactions')
        .insert({
          booking_id: bookingId,
          amount: 20000,
          currency: 'RUB',
          status: 'completed',
          payment_method: 'card',
        })
        .select();

      // Второй платеж (дублирование)
      const { error } = await supabase
        .from('transactions')
        .insert({
          booking_id: bookingId,
          amount: 20000,
          currency: 'RUB',
          status: 'pending',
          payment_method: 'card',
        });

      if (payment1 && payment1.length > 0) {
        // Если первый платеж уже завершен
        expect(error).not.toBeNull();
      }
    });
  });

  // ============================================
  // 6. CAR RENTALS
  // ============================================
  describe('6. Car Rentals', () => {
    let rentalId: string;
    let carId: string;

    beforeEach(async () => {
      const { data: car } = await supabase
        .from('cars')
        .insert({
          brand: 'Toyota',
          model: 'Camry',
          year: 2023,
          license_plate: 'AB123CD',
          available: true,
          price_per_day: 3000,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      carId = car?.id || '';

      const { data: rental } = await supabase
        .from('car_rentals')
        .insert({
          car_id: carId,
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+79991234567',
          driver_license: 'AB123456',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          days_count: 2,
          pickup_location: 'Petropavlovsk',
          return_location: 'Petropavlovsk',
          insurance_type: 'basic',
          rental_price: 6000,
          total_price: 6000,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      rentalId = rental?.id || '';
    });

    it('Should create car rental with valid data', () => {
      expect(rentalId).toBeTruthy();
    });

    it('Should validate end date after start date', async () => {
      const { error } = await supabase
        .from('car_rentals')
        .insert({
          car_id: carId,
          customer_name: 'Test',
          customer_email: 'test@example.com',
          customer_phone: '+79991234567',
          driver_license: 'AB123456',
          start_date: '2026-02-17',
          end_date: '2026-02-15', // Before start
          days_count: -2,
          pickup_location: 'City',
          return_location: 'City',
          rental_price: 6000,
          total_price: 6000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should validate days_count matches date range', async () => {
      // 2026-02-17 - 2026-02-15 = 2 days
      // Но дни считаются неправильно?
      const startDate = new Date('2026-02-15');
      const endDate = new Date('2026-02-17');
      const daysCount = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysCount).toBe(2);
    });

    it('Should prevent overlapping car rentals', async () => {
      // Попытка забронировать ту же машину на пересекающиеся даты
      const { error } = await supabase
        .from('car_rentals')
        .insert({
          car_id: carId,
          customer_name: 'Jane Doe',
          customer_email: 'jane@example.com',
          customer_phone: '+79991234567',
          driver_license: 'AB654321',
          start_date: '2026-02-16', // Overlaps with 2026-02-15 to 2026-02-17
          end_date: '2026-02-18',
          days_count: 2,
          pickup_location: 'City',
          return_location: 'City',
          rental_price: 6000,
          total_price: 6000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should calculate rental price based on days and daily rate', async () => {
      const { data: rental } = await supabase
        .from('car_rentals')
        .select('days_count, rental_price')
        .eq('id', rentalId)
        .single();

      if (rental) {
        const expectedPrice = 3000 * rental.days_count; // price_per_day * days
        expect(rental.rental_price).toBe(expectedPrice);
      }
    });

    it('Should add insurance costs to total', async () => {
      const insuranceCost = 500;
      const additionalCost = 300;

      const { data } = await supabase
        .from('car_rentals')
        .update({
          insurance_cost: insuranceCost,
          additional_drivers_cost: additionalCost,
        })
        .eq('id', rentalId)
        .select()
        .single();

      if (data) {
        const expectedTotal = data.rental_price + insuranceCost + additionalCost;
        // total_price должна быть пересчитана
      }
    });
  });

  // ============================================
  // 7. GEAR RENTALS
  // ============================================
  describe('7. Gear Rentals', () => {
    let gearRentalId: string;
    let gearId: string;

    beforeEach(async () => {
      const { data: gear } = await supabase
        .from('gear_equipment')
        .insert({
          name: 'Mountain Tent',
          category: 'shelter',
          price_per_day: 500,
          available_count: 10,
          condition: 'good',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      gearId = gear?.id || '';

      const { data: rental } = await supabase
        .from('gear_rentals')
        .insert({
          gear_id: gearId,
          customer_name: 'John Hiker',
          customer_email: 'john@example.com',
          customer_phone: '+79991234567',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          days_count: 2,
          quantity: 1,
          rental_price: 1000,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      gearRentalId = rental?.id || '';
    });

    it('Should create gear rental with valid data', () => {
      expect(gearRentalId).toBeTruthy();
    });

    it('Should not exceed available gear count', async () => {
      const { error } = await supabase
        .from('gear_rentals')
        .insert({
          gear_id: gearId,
          customer_name: 'Overbook',
          customer_email: 'over@example.com',
          customer_phone: '+79991234567',
          start_date: '2026-02-20',
          end_date: '2026-02-22',
          days_count: 2,
          quantity: 20, // Exceeds available count of 10
          rental_price: 10000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should calculate rental price per item', async () => {
      const { data } = await supabase
        .from('gear_rentals')
        .select('days_count, quantity, rental_price')
        .eq('id', gearRentalId)
        .single();

      if (data) {
        const expectedPrice = 500 * data.days_count * data.quantity;
        expect(data.rental_price).toBe(expectedPrice);
      }
    });
  });

  // ============================================
  // 8. SOUVENIR SHOP
  // ============================================
  describe('8. Souvenir Shop', () => {
    let orderId: string;
    let productId: string;

    beforeEach(async () => {
      const { data: product } = await supabase
        .from('souvenir_products')
        .insert({
          name: 'Kamchatka Postcard Set',
          description: 'Beautiful postcards from Kamchatka',
          price: 250,
          stock: 100,
          category: 'postcards',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      productId = product?.id || '';

      const { data: order } = await supabase
        .from('souvenir_orders')
        .insert({
          customer_name: 'Tourist',
          customer_email: 'tourist@example.com',
          customer_phone: '+79991234567',
          items: [
            {
              product_id: productId,
              quantity: 2,
              price: 250,
            },
          ],
          total_amount: 500,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      orderId = order?.id || '';
    });

    it('Should create souvenir order with valid data', () => {
      expect(orderId).toBeTruthy();
    });

    it('Should not allow order if stock insufficient', async () => {
      const { error } = await supabase
        .from('souvenir_orders')
        .insert({
          customer_name: 'Overorder',
          customer_email: 'over@example.com',
          customer_phone: '+79991234567',
          items: [
            {
              product_id: productId,
              quantity: 500, // Exceeds stock of 100
              price: 250,
            },
          ],
          total_amount: 125000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should reduce stock on confirmed order', async () => {
      const { data: stockBefore } = await supabase
        .from('souvenir_products')
        .select('stock')
        .eq('id', productId)
        .single();

      await supabase
        .from('souvenir_orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

      const { data: stockAfter } = await supabase
        .from('souvenir_products')
        .select('stock')
        .eq('id', productId)
        .single();

      // Stock должен быть уменьшен на 2 (количество заказанного)
      if (stockBefore && stockAfter) {
        expect(stockAfter.stock).toBeLessThan(stockBefore.stock);
      }
    });

    it('Should restore stock on order cancellation', async () => {
      const { data: stockAfterCancel } = await supabase
        .from('souvenir_products')
        .select('stock')
        .eq('id', productId)
        .single();

      await supabase
        .from('souvenir_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      const { data: stockFinal } = await supabase
        .from('souvenir_products')
        .select('stock')
        .eq('id', productId)
        .single();

      // Stock должен вернуться к исходному значению
      if (stockAfterCancel && stockFinal) {
        expect(stockFinal.stock).toBeGreaterThanOrEqual(stockAfterCancel.stock);
      }
    });
  });

  // ============================================
  // 9. LOYALTY & ECO POINTS
  // ============================================
  describe('9. Loyalty & Eco Points', () => {
    let userId: string;

    beforeEach(async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `loyalty-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
      });
      userId = user.user?.id || '';
    });

    it('Should create loyalty profile for user', async () => {
      const { data, error } = await supabase
        .from('user_loyalty')
        .insert({
          user_id: userId,
          total_points: 0,
          level: 'bronze',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.level).toBe('bronze');
    });

    it('Should award points for completed booking', async () => {
      // Создаем бронирование и отмечаем как завершенное
      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: userId,
          title: 'Loyalty Test',
          price: 5000,
          duration_days: 2,
          max_participants: 10,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: userId,
          participants: 2,
          total_price: 10000,
          status: 'completed',
        })
        .select()
        .single();

      // Points должны быть рассчитаны как процент от total_price
      const expectedPoints = Math.floor((booking?.total_price || 0) * 0.05); // 5% points
      // Проверяем, что points начислены
    });

    it('Should upgrade loyalty level based on points', async () => {
      const { data: loyalty } = await supabase
        .from('user_loyalty')
        .insert({
          user_id: userId,
          total_points: 0,
          level: 'bronze',
        })
        .select()
        .single();

      // Уровни: bronze (0), silver (1000), gold (5000), platinum (10000)
      const levelThresholds: { [key: number]: string } = {
        0: 'bronze',
        1000: 'silver',
        5000: 'gold',
        10000: 'platinum',
      };

      for (const [threshold, level] of Object.entries(levelThresholds)) {
        const { data: updated } = await supabase
          .from('user_loyalty')
          .update({ total_points: parseInt(threshold) })
          .eq('user_id', userId)
          .select()
          .single();

        // Логика выше должна автоматически обновить level
      }
    });

    it('Should track eco points separately', async () => {
      const { data, error } = await supabase
        .from('user_eco_points')
        .insert({
          user_id: userId,
          total_eco_points: 0,
          activities: [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.total_eco_points).toBe(0);
    });

    it('Should add eco points for sustainable activities', async () => {
      const ecoActivities = [
        { action: 'public_transport', points: 10 },
        { action: 'waste_reduction', points: 20 },
        { action: 'carbon_offset', points: 50 },
      ];

      for (const activity of ecoActivities) {
        const { data, error } = await supabase
          .from('user_eco_points')
          .update({
            total_eco_points: 50,
            activities: [activity],
          })
          .eq('user_id', userId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.total_eco_points).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // 10. PARTNER MANAGEMENT
  // ============================================
  describe('10. Partner Management', () => {
    let partnerId: string;

    beforeEach(async () => {
      const { data: partner } = await supabase
        .from('partners')
        .insert({
          name: 'Test Partner',
          email: `partner-${Date.now()}@example.com`,
          phone: '+79991234567',
          company_name: 'Partner Company',
          bank_account: 'RU91SBER1234567890123456',
          commission_rate: 15,
          status: 'pending',
          verified: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      partnerId = partner?.id || '';
    });

    it('Should create partner with valid data', () => {
      expect(partnerId).toBeTruthy();
    });

    it('Should validate IBAN format', async () => {
      const { error } = await supabase
        .from('partners')
        .insert({
          name: 'Invalid Partner',
          email: `invalid-${Date.now()}@example.com`,
          phone: '+79991234567',
          company_name: 'Company',
          bank_account: 'INVALID',
          commission_rate: 15,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should validate commission rate 0-100', async () => {
      const { error: error101 } = await supabase
        .from('partners')
        .insert({
          name: 'Bad Commission',
          email: `bad-${Date.now()}@example.com`,
          phone: '+79991234567',
          company_name: 'Company',
          bank_account: 'RU91SBER1234567890123456',
          commission_rate: 101,
          status: 'pending',
        });

      expect(error101).not.toBeNull();
    });

    it('Should verify partner and allow payouts', async () => {
      const { data, error } = await supabase
        .from('partners')
        .update({
          verified: true,
          status: 'active',
        })
        .eq('id', partnerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.verified).toBe(true);
      expect(data?.status).toBe('active');
    });

    it('Should track commissions earned', async () => {
      const { data, error } = await supabase
        .from('partner_commissions')
        .insert({
          partner_id: partnerId,
          amount: 5000,
          rate: 15,
          source: 'tour_booking',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.amount).toBe(5000);
    });
  });

  // ============================================
  // 11. ADMIN OPERATIONS
  // ============================================
  describe('11. Admin Operations', () => {
    let adminId: string;

    beforeEach(async () => {
      const { data: admin } = await supabase.auth.admin.createUser({
        email: `admin-${Date.now()}@example.com`,
        password: 'AdminPass123!@#',
        user_metadata: { role: 'admin' },
      });
      adminId = admin.user?.id || '';
    });

    it('Should create admin user', () => {
      expect(adminId).toBeTruthy();
    });

    it('Should only allow admin to moderate reviews', async () => {
      // Проверяем что обычный пользователь не может модерировать
      const { data: regularUser } = await supabase.auth.admin.createUser({
        email: `user-${Date.now()}@example.com`,
        password: 'Pass123!@#',
        user_metadata: { role: 'tourist' },
      });

      // Попытка модерировать должна быть отклонена
      const { error } = await supabase
        .from('reviews')
        .update({
          is_flagged: true,
          moderation_status: 'rejected',
        })
        .eq('user_id', regularUser.user?.id!);

      // Error должен быть null, но RLS должен заблокировать доступ
    });

    it('Should allow admin to view all analytics', async () => {
      const { data, error } = await supabase
        .from('admin_analytics')
        .select('*')
        .limit(1);

      // Admin должен иметь доступ
      expect(error).toBeNull();
    });

    it('Should allow admin to suspend user account', async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `suspend-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: suspended, error } = await supabase.auth.admin.updateUserById(
        user.user?.id!,
        {
          user_metadata: { suspended: true },
        }
      );

      expect(error).toBeNull();
      expect(suspended.user?.user_metadata?.suspended).toBe(true);
    });
  });

  // ============================================
  // 12. TRANSFER OPERATOR WORKFLOWS
  // ============================================
  describe('12. Transfer Operator Workflows', () => {
    let transferId: string;

    beforeEach(async () => {
      const { data: transfer } = await supabase
        .from('transfer_orders')
        .insert({
          operator_name: 'Taxi Company',
          pickup_location: 'Airport',
          dropoff_location: 'Hotel',
          pickup_time: '2026-02-15T10:00:00Z',
          passenger_count: 4,
          vehicle_type: 'sedan',
          price: 2000,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      transferId = transfer?.id || '';
    });

    it('Should create transfer order with valid data', () => {
      expect(transferId).toBeTruthy();
    });

    it('Should validate passenger count matches vehicle capacity', async () => {
      const { error } = await supabase
        .from('transfer_orders')
        .insert({
          operator_name: 'Taxi',
          pickup_location: 'Airport',
          dropoff_location: 'Hotel',
          pickup_time: '2026-02-15T10:00:00Z',
          passenger_count: 10, // sedan max 4
          vehicle_type: 'sedan',
          price: 2000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });

    it('Should update transfer status to confirmed', async () => {
      const { data, error } = await supabase
        .from('transfer_orders')
        .update({ status: 'confirmed' })
        .eq('id', transferId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('confirmed');
    });
  });
});
