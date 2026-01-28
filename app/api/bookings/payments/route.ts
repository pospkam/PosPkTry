/**
 * Bookings Payments API
 * POST /api/bookings/payments - Initiate payment
 * POST /api/bookings/payments/verify - Verify payment completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@booking-pillar'
import { bookingService } from '@booking-pillar'
import { authenticateUser } from '@core/auth'

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

    // Verify booking belongs to user
    const booking = await bookingService.getById(body.bookingId)

    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Initiate payment
    const paymentResponse = await paymentService.initiatePayment({
      bookingId: body.bookingId,
      amount: booking.finalPrice,
      currency: booking.currencyCode,
      gateway: body.gateway,
      payerName: booking.primaryContact.name,
      payerEmail: booking.primaryContact.email,
      payerPhone: booking.primaryContact.phone,
      returnUrl: body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${body.bookingId}`,
      notificationUrl: body.notificationUrl || `${process.env.NEXT_PUBLIC_API_URL}/webhooks/payments`,
      description: `Payment for booking ${booking.bookingNumber}`,
      metadata: {
        bookingNumber: booking.bookingNumber,
        tourId: booking.tourId,
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
    // Parse body
    const body = await request.json()

    if (!body.transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    // Verify payment
    const verification = await paymentService.verifyPayment(
      body.transactionId,
      body.verificationData || {}
    )

    if (verification.status === 'completed') {
      // Confirm booking
      await bookingService.confirmPayment(verification.transactionId || '', body.transactionId)

      return NextResponse.json({
        message: 'Payment verified and booking confirmed',
        verification,
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
