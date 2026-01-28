/**
 * Bookings Payments Refund API
 * POST /api/bookings/payments/[id]/refund - Process refund
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/pillars/booking'
import { bookingService } from '@/pillars/booking'
import { authenticateUser, authorizeRole } from '@/pillars/core-infrastructure/services/auth'

/**
 * POST /api/bookings/payments/[id]/refund
 * Process refund for a payment (admin or booking owner)
 * Body: { reason, refundAmount }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()

    if (!body.reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }

    // Get payment to check authorization
    const payment = await paymentService.getTransaction(params.id)

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check authorization
    const booking = await bookingService.getById(payment.bookingId)

    if (booking.userId !== userId && !(await authorizeRole(request, 'admin'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process refund
    const refund = await paymentService.refund({
      transactionId: params.id,
      refundAmount: body.refundAmount,
      reason: body.reason,
      description: body.description,
    })

    return NextResponse.json({
      message: 'Refund processed successfully',
      refund,
    })
  } catch (error) {
    console.error('Failed to process refund:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process refund' },
      { status: 500 }
    )
  }
}
