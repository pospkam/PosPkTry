/**
 * Bookings Payments API
 * POST /api/bookings/payments - Initiate payment
 * PATCH /api/bookings/payments - Verify payment completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { paymentService } from '@/lib/services'
import { getBookingForUser, confirmBookingPayment } from '@/lib/bookings/booking.service'
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
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = initiatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { bookingId, gateway, returnUrl, notificationUrl } = parsed.data

    const booking = await getBookingForUser(bookingId, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const paymentResponse = await paymentService.initiatePayment({
      bookingId: bookingId,
      amount: Number(booking.totalAmount || 0),
      currency: 'RUB',
      gateway: gateway,
      payerName: booking.tourist.name || 'Customer',
      payerEmail: booking.tourist.email || '',
      payerPhone: undefined,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}`,
      notificationUrl: notificationUrl || `${process.env.NEXT_PUBLIC_API_URL}/webhooks/payments`,
      description: `Оплата бронирования ${booking.tour.title}`,
      metadata: {
        bookingId: booking.id,
        tourId: booking.tour.id,
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
 * PATCH /api/bookings/payments
 * Verify payment completion and confirm booking
 * Body: { transactionId, verificationData }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = verifyPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { transactionId, verificationData } = parsed.data

    const txn = await paymentService.getTransaction(transactionId)
    if (!txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (!txn.bookingId) {
      return NextResponse.json({ error: 'Transaction has no booking reference' }, { status: 400 })
    }

    const booking = await getBookingForUser(txn.bookingId, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const verification = await paymentService.verifyPayment(
      transactionId,
      verificationData || {}
    )

    if (verification.status === 'completed') {
      const confirmed = await confirmBookingPayment(txn.bookingId, transactionId)

      return NextResponse.json({
        message: 'Оплата подтверждена, бронирование активировано',
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
