/**
 * Bookings Payments API
 * POST /api/bookings/payments - Initiate payment
 * POST /api/bookings/payments/verify - Verify payment completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { paymentService } from '@/lib/services'
import { bookingService } from '@/lib/services'
import { authenticateUser } from '@/lib/auth'

const initiatePaymentSchema = z.object({
  bookingId: z.string().uuid(),
  gateway: z.string().min(1).max(50),
  returnUrl: z.string().url().optional(),
  notificationUrl: z.string().url().optional(),
});

const verifyPaymentSchema = z.object({
  transactionId: z.string().uuid(),
  verificationData: z.record(z.unknown()).optional(),
});

/**
 * POST /api/bookings/payments
 * Initiate a payment for a booking
 * Body: { bookingId, gateway, returnUrl, notificationUrl }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = initiatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { bookingId, gateway, returnUrl, notificationUrl } = parsed.data

    // Ownership is enforced at service layer
    const booking = await bookingService.getByIdForUser(bookingId, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Initiate payment
    const paymentResponse = await paymentService.initiatePayment({
      bookingId: bookingId,
      amount: Number(booking.totalPrice || 0),
      currency: 'RUB',
      gateway: gateway,
      payerName: 'Customer',
      payerEmail: '',
      payerPhone: undefined,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}`,
      notificationUrl: notificationUrl || `${process.env.NEXT_PUBLIC_API_URL}/webhooks/payments`,
      description: `Payment for booking ${booking.id}`,
      metadata: {
        bookingId: booking.id,
        tourId: booking.tourId || undefined,
      },
    })

    return NextResponse.json(paymentResponse, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings/payments/verify
 * Verify payment completion and confirm booking
 * Body: { transactionId, verificationData }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = verifyPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { transactionId, verificationData } = parsed.data

    const transaction = await paymentService.getTransaction(transactionId)
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (!transaction.bookingId) {
      return NextResponse.json({ error: 'Transaction has no booking reference' }, { status: 400 })
    }

    const booking = await bookingService.getByIdForUser(transaction.bookingId, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify payment
    const verification = await paymentService.verifyPayment(
      transactionId,
      verificationData || {}
    )

    if (verification.status === 'completed') {
      // Confirm booking
      const confirmed = await bookingService.confirmPayment(transaction.bookingId, transactionId)
      if (!confirmed) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      return NextResponse.json({
        message: 'Payment verified and booking confirmed',
        verification,
        booking: confirmed,
      })
    }

    return NextResponse.json(verification)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
