/**
 * Bookings Payments API
 * POST /api/bookings/payments - Initiate payment
 * POST /api/bookings/payments/verify - Verify payment completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/database'
import { bookingService } from '@/lib/database'
import { authenticateUser } from '@/lib/auth'

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

    // Parse body
    const body = await request.json()

    if (!body.bookingId || !body.gateway) {
      return NextResponse.json(
        { error: 'bookingId and gateway are required' },
        { status: 400 }
      )
    }

    // Ownership is enforced at service layer
    const booking = await bookingService.getByIdForUser(body.bookingId, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Initiate payment
    const paymentResponse = await paymentService.initiatePayment({
      bookingId: body.bookingId,
      amount: Number(booking.totalPrice || 0),
      currency: 'RUB',
      gateway: body.gateway,
      payerName: 'Customer',
      payerEmail: '',
      payerPhone: undefined,
      returnUrl: body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${body.bookingId}`,
      notificationUrl: body.notificationUrl || `${process.env.NEXT_PUBLIC_API_URL}/webhooks/payments`,
      description: `Payment for booking ${booking.id}`,
      metadata: {
        bookingId: booking.id,
        tourId: booking.tourId || undefined,
      },
    })

    return NextResponse.json(paymentResponse, { status: 201 })
  } catch (error) {
    console.error('Failed to initiate payment:', error)
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

    // Parse body
    const body = await request.json()

    if (!body.transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    const transaction = await paymentService.getTransaction(body.transactionId)
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
      body.transactionId,
      body.verificationData || {}
    )

    if (verification.status === 'completed') {
      // Confirm booking
      const confirmed = await bookingService.confirmPayment(transaction.bookingId, body.transactionId)
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
    console.error('Failed to verify payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
