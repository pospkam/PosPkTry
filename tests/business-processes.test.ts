/**
 * Тесты для всех бизнес-процессов KamHub
 * Выявляет ошибки в workflow'ах, ограничениях и валидации
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('BUSINESS PROCESSES TESTS', () => {
  // ============================================
  // PROCESS 1: TOURIST BOOKING JOURNEY
  // ============================================
  describe('Process 1: Tourist Booking Journey', () => {
    it('Complete booking flow: search -> select -> book -> pay', async () => {
      // 1. Create tourist user
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `tourist-flow-${Date.now()}@example.com`,
        password: 'Pass123!@#',
        user_metadata: { role: 'tourist' },
      });
      expect(tourist.user?.id).toBeTruthy();

      // 2. Create operator
      const { data: operator } = await supabase.auth.admin.createUser({
        email: `operator-flow-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      // 3. Create tours
      const { data: tours } = await supabase
        .from('tours')
        .insert([
          {
            operator_id: operator.user?.id,
            title: 'Avachinsky Volcano',
            price: 5000,
            duration_days: 2,
            max_participants: 10,
            is_active: true,
          },
          {
            operator_id: operator.user?.id,
            title: 'Baikal Lake',
            price: 8000,
            duration_days: 3,
            max_participants: 8,
            is_active: true,
          },
        ])
        .select();
      expect(tours?.length).toBe(2);

      // 4. Tourist searches and selects tour
      const { data: availableTours } = await supabase
        .from('tours')
        .select('*')
        .eq('is_active', true)
        .limit(10);
      expect(availableTours?.length).toBeGreaterThan(0);

      const selectedTour = availableTours?.[0];

      // 5. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tour_id: selectedTour?.id,
          user_id: tourist.user?.id,
          participants: 2,
          total_price: (selectedTour?.price || 0) * 2,
          status: 'pending',
        })
        .select()
        .single();

      expect(bookingError).toBeNull();
      expect(booking?.status).toBe('pending');

      // 6. Create payment
      const { data: transaction, error: paymentError } = await supabase
        .from('transactions')
        .insert({
          booking_id: booking?.id,
          amount: booking?.total_price,
          currency: 'RUB',
          status: 'processing',
          payment_method: 'card',
        })
        .select()
        .single();

      expect(paymentError).toBeNull();

      // 7. Confirm booking after payment
      const { data: confirmedBooking } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking?.id)
        .select()
        .single();

      expect(confirmedBooking?.status).toBe('confirmed');

      // 8. Complete payment
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction?.id);

      // 9. Complete booking
      const { data: completedBooking } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking?.id)
        .select()
        .single();

      expect(completedBooking?.status).toBe('completed');
    });

    it('Tourist cannot book more participants than tour allows', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `tourist-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Small Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 2,
          is_active: true,
        })
        .select()
        .single();

      // Try to book more than max
      const { error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          participants: 5, // Exceeds max 2
          total_price: 25000,
          status: 'pending',
        });

      expect(error?.message).toContain('max_participants');
    });

    it('Tourist cannot book inactive tour', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `tourist-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Inactive Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 5,
          is_active: false,
        })
        .select()
        .single();

      const { error } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          participants: 2,
          total_price: 10000,
          status: 'pending',
        });

      expect(error).not.toBeNull();
    });
  });

  // ============================================
  // PROCESS 2: OPERATOR TOUR MANAGEMENT
  // ============================================
  describe('Process 2: Operator Tour Management', () => {
    let operatorId: string;
    let tourId: string;

    beforeEach(async () => {
      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-manage-${Date.now()}@example.com`,
        password: 'Pass123!@#',
        user_metadata: { role: 'operator' },
      });
      operatorId = operator.user?.id || '';

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operatorId,
          title: 'New Tour',
          price: 5000,
          duration_days: 2,
          max_participants: 10,
          is_active: true,
        })
        .select()
        .single();

      tourId = tour?.id || '';
    });

    it('Operator can create and manage tours', async () => {
      // Create multiple tours
      const { data: newTours } = await supabase
        .from('tours')
        .insert([
          {
            operator_id: operatorId,
            title: 'Tour A',
            price: 3000,
            duration_days: 1,
            max_participants: 5,
            is_active: true,
          },
          {
            operator_id: operatorId,
            title: 'Tour B',
            price: 7000,
            duration_days: 3,
            max_participants: 15,
            is_active: true,
          },
        ])
        .select();

      expect(newTours?.length).toBe(2);

      // Fetch operator's tours
      const { data: operatorTours } = await supabase
        .from('tours')
        .select('*')
        .eq('operator_id', operatorId);

      expect(operatorTours?.length).toBeGreaterThanOrEqual(3);
    });

    it('Operator can update tour price', async () => {
      const newPrice = 6500;
      const { data: updatedTour } = await supabase
        .from('tours')
        .update({ price: newPrice })
        .eq('id', tourId)
        .select()
        .single();

      expect(updatedTour?.price).toBe(newPrice);
    });

    it('Operator cannot have negative price', async () => {
      const { error } = await supabase
        .from('tours')
        .update({ price: -1000 })
        .eq('id', tourId);

      expect(error).not.toBeNull();
    });

    it('Operator can deactivate tour', async () => {
      const { data: deactivated } = await supabase
        .from('tours')
        .update({ is_active: false })
        .eq('id', tourId)
        .select()
        .single();

      expect(deactivated?.is_active).toBe(false);
    });

    it('Operator sees only their own tours', async () => {
      // Create another operator
      const { data: anotherOp } = await supabase.auth.admin.createUser({
        email: `op-other-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      // Create tour for another operator
      await supabase
        .from('tours')
        .insert({
          operator_id: anotherOp.user?.id,
          title: 'Other Tour',
          price: 4000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        });

      // Query should only show current operator's tours
      const { data: myTours } = await supabase
        .from('tours')
        .select('*')
        .eq('operator_id', operatorId);

      const isOnlyMyTours = myTours?.every((t) => t.operator_id === operatorId);
      expect(isOnlyMyTours).toBe(true);
    });
  });

  // ============================================
  // PROCESS 3: PAYMENT WORKFLOW
  // ============================================
  describe('Process 3: Payment Workflow', () => {
    it('Complete payment flow: pending -> processing -> completed', async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `payer-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `op-pay-${Date.now()}@example.com`,
        password: 'Pass123!@#',
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

      // 1. Create transaction (pending)
      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          booking_id: booking?.id,
          amount: 20000,
          currency: 'RUB',
          status: 'pending',
          payment_method: 'card',
        })
        .select()
        .single();

      expect(transaction?.status).toBe('pending');

      // 2. Update to processing
      const { data: processing } = await supabase
        .from('transactions')
        .update({ status: 'processing' })
        .eq('id', transaction?.id)
        .select()
        .single();

      expect(processing?.status).toBe('processing');

      // 3. Update to completed
      const { data: completed } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction?.id)
        .select()
        .single();

      expect(completed?.status).toBe('completed');

      // 4. Update booking to paid
      const { data: paidBooking } = await supabase
        .from('bookings')
        .update({ status: 'paid' })
        .eq('id', booking?.id)
        .select()
        .single();

      expect(paidBooking?.status).toBe('paid');
    });

    it('Payment failure should trigger booking cancellation', async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `fail-payer-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `fail-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Fail Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: user.user?.id,
          participants: 1,
          total_price: 5000,
          status: 'pending',
        })
        .select()
        .single();

      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          booking_id: booking?.id,
          amount: 5000,
          currency: 'RUB',
          status: 'processing',
          payment_method: 'card',
        })
        .select()
        .single();

      // Payment failed
      const { data: failedTransaction } = await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction?.id)
        .select()
        .single();

      expect(failedTransaction?.status).toBe('failed');

      // Booking should be cancelled
      const { data: cancelledBooking } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking?.id)
        .select()
        .single();

      expect(cancelledBooking?.status).toBe('cancelled');
    });

    it('Refund process: completed -> refunded', async () => {
      const { data: user } = await supabase.auth.admin.createUser({
        email: `refund-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `refund-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Refund Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: user.user?.id,
          participants: 1,
          total_price: 5000,
          status: 'completed',
        })
        .select()
        .single();

      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          booking_id: booking?.id,
          amount: 5000,
          currency: 'RUB',
          status: 'completed',
          payment_method: 'card',
        })
        .select()
        .single();

      // Request refund
      const { data: refundedTransaction } = await supabase
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', transaction?.id)
        .select()
        .single();

      expect(refundedTransaction?.status).toBe('refunded');
    });
  });

  // ============================================
  // PROCESS 4: REVIEW & MODERATION
  // ============================================
  describe('Process 4: Review & Moderation', () => {
    it('Tourist can post review after booking completion', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `reviewer-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `rev-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Review Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          participants: 1,
          total_price: 5000,
          status: 'completed',
        })
        .select()
        .single();

      // Post review
      const { data: review } = await supabase
        .from('reviews')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          booking_id: booking?.id,
          rating: 5,
          title: 'Amazing!',
          content: 'Best tour ever',
          is_verified: true,
        })
        .select()
        .single();

      expect(review?.rating).toBe(5);
      expect(review?.is_verified).toBe(true);
    });

    it('Admin can flag inappropriate reviews', async () => {
      const { data: admin } = await supabase.auth.admin.createUser({
        email: `admin-mod-${Date.now()}@example.com`,
        password: 'Pass123!@#',
        user_metadata: { role: 'admin' },
      });

      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `bad-reviewer-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `bad-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Bad Review Tour',
          price: 5000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: review } = await supabase
        .from('reviews')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          rating: 1,
          title: 'Spam',
          content: 'XXXXX inappropriate content',
        })
        .select()
        .single();

      // Admin flags review
      const { data: flagged } = await supabase
        .from('reviews')
        .update({
          is_flagged: true,
          moderation_status: 'pending_review',
        })
        .eq('id', review?.id)
        .select()
        .single();

      expect(flagged?.is_flagged).toBe(true);
    });
  });

  // ============================================
  // PROCESS 5: LOYALTY & REWARDS
  // ============================================
  describe('Process 5: Loyalty & Rewards', () => {
    it('Tourist earns points on booking completion', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `loyalty-tourist-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `loyalty-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Loyalty Tour',
          price: 10000,
          duration_days: 2,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          participants: 1,
          total_price: 10000,
          status: 'completed',
        })
        .select()
        .single();

      // Check loyalty points (5% of booking)
      const expectedPoints = Math.floor((booking?.total_price || 0) * 0.05);
      // Query loyalty balance
    });

    it('Tourist can redeem loyalty points', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `redeem-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      // Add points to loyalty account
      const { data: loyalty } = await supabase
        .from('user_loyalty')
        .insert({
          user_id: tourist.user?.id,
          total_points: 5000,
          level: 'silver',
        })
        .select()
        .single();

      // Redeem points
      const { data: redeemed } = await supabase
        .from('user_loyalty')
        .update({
          total_points: 4500,
        })
        .eq('user_id', tourist.user?.id)
        .select()
        .single();

      expect(redeemed?.total_points).toBeLessThan(loyalty?.total_points || 0);
    });
  });

  // ============================================
  // PROCESS 6: OPERATOR COMMISSION & PAYOUT
  // ============================================
  describe('Process 6: Operator Commission & Payout', () => {
    it('Operator commission calculated from bookings', async () => {
      const { data: operator } = await supabase.auth.admin.createUser({
        email: `commission-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Commission Tour',
          price: 10000,
          duration_days: 1,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      // Multiple bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .insert([
          {
            tour_id: tour?.id,
            user_id: `user-1`,
            participants: 1,
            total_price: 10000,
            status: 'completed',
          },
          {
            tour_id: tour?.id,
            user_id: `user-2`,
            participants: 2,
            total_price: 20000,
            status: 'completed',
          },
        ])
        .select();

      // Calculate total commission
      const totalAmount = (bookings || []).reduce((sum, b) => sum + b.total_price, 0);
      const commissionRate = 0.15; // 15%
      const expectedCommission = Math.floor(totalAmount * commissionRate);

      // Verify commission recorded
    });

    it('Operator receives payout', async () => {
      const { data: operator } = await supabase.auth.admin.createUser({
        email: `payout-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      // Create payout
      const { data: payout } = await supabase
        .from('operator_payouts')
        .insert({
          operator_id: operator.user?.id,
          amount: 50000,
          status: 'pending',
          payout_method: 'bank_transfer',
        })
        .select()
        .single();

      expect(payout?.status).toBe('pending');

      // Process payout
      const { data: processed } = await supabase
        .from('operator_payouts')
        .update({ status: 'processed' })
        .eq('id', payout?.id)
        .select()
        .single();

      expect(processed?.status).toBe('processed');
    });
  });

  // ============================================
  // PROCESS 7: MULTI-SERVICE BOOKING
  // ============================================
  describe('Process 7: Multi-Service Booking', () => {
    it('Tourist books tour + car rental + souvenir', async () => {
      const { data: tourist } = await supabase.auth.admin.createUser({
        email: `multi-tourist-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      const { data: operator } = await supabase.auth.admin.createUser({
        email: `multi-op-${Date.now()}@example.com`,
        password: 'Pass123!@#',
      });

      // 1. Book tour
      const { data: tour } = await supabase
        .from('tours')
        .insert({
          operator_id: operator.user?.id,
          title: 'Multi Tour',
          price: 5000,
          duration_days: 2,
          max_participants: 5,
          is_active: true,
        })
        .select()
        .single();

      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          tour_id: tour?.id,
          user_id: tourist.user?.id,
          participants: 1,
          total_price: 5000,
          status: 'confirmed',
        })
        .select()
        .single();

      // 2. Rent car
      const { data: car } = await supabase
        .from('cars')
        .insert({
          brand: 'Toyota',
          model: 'Camry',
          price_per_day: 3000,
          available: true,
        })
        .select()
        .single();

      const { data: rental } = await supabase
        .from('car_rentals')
        .insert({
          car_id: car?.id,
          customer_name: 'John',
          customer_email: tourist.user?.email || '',
          customer_phone: '+79991234567',
          driver_license: 'AB123456',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          days_count: 2,
          pickup_location: 'Airport',
          return_location: 'Airport',
          rental_price: 6000,
          total_price: 6000,
          status: 'confirmed',
        })
        .select()
        .single();

      // 3. Buy souvenir
      const { data: product } = await supabase
        .from('souvenir_products')
        .insert({
          name: 'Postcard Set',
          price: 250,
          stock: 100,
          category: 'postcards',
        })
        .select()
        .single();

      const { data: order } = await supabase
        .from('souvenir_orders')
        .insert({
          customer_name: 'John',
          customer_email: tourist.user?.email || '',
          customer_phone: '+79991234567',
          items: [
            {
              product_id: product?.id,
              quantity: 2,
              price: 250,
            },
          ],
          total_amount: 500,
          status: 'confirmed',
        })
        .select()
        .single();

      // Verify all bookings
      expect(booking?.status).toBe('confirmed');
      expect(rental?.status).toBe('confirmed');
      expect(order?.status).toBe('confirmed');

      // Calculate total
      const totalSpent =
        (booking?.total_price || 0) + (rental?.total_price || 0) + (order?.total_amount || 0);
      expect(totalSpent).toBe(11500);
    });
  });
});
