/**
 * Bookings API - Detail Operations
 * GET /api/bookings/[id] - Get booking details
 * PUT /api/bookings/[id] - Update booking
 * DELETE /api/bookings/[id] - Cancel booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from .@/lib/database.
import { authenticateUser } from '@/lib/auth'
import type { BookingUpdate } from .@/lib/database.lib/booking/types'

/**
 * GET /api/bookings/[id]
 * Get booking details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking
    const booking = await bookingService.getById(params.id)

    // Authorization: user can only see their own bookings
    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.error('Failed to get booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get booking' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/bookings/[id]
 * Update booking details (special requests, dietary requirements, etc.)
 * Can only update pending bookings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking for authorization
    const booking = await bookingService.getById(params.id)

    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()

    // Update booking
    const updated = await bookingService.update(params.id, {
      specialRequests: body.specialRequests,
      dietaryRequirements: body.dietaryRequirements,
      mobilityRequirements: body.mobilityRequirements,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.error('Failed to update booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update booking' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel booking and process refund
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking for authorization
    const booking = await bookingService.getById(params.id)

    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const reason = body.reason || 'User requested cancellation'

    // Cancel booking
    const cancelled = await bookingService.cancel(params.id, reason, userId)

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: cancelled,
      refundAmount: cancelled.refundAmount,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.error('Failed to cancel booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}
