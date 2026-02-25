/**
 * Bookings API - Detail Operations
 * GET /api/bookings/[id] - Get booking details
 * PUT /api/bookings/[id] - Update booking
 * DELETE /api/bookings/[id] - Cancel booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/lib/database'
import { authenticateUser } from '@/lib/auth'

/**
 * GET /api/bookings/[id]
 * Get booking details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Ownership is enforced at service layer
    const booking = await bookingService.getByIdForUser(id, userId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Parse body
    const body = await request.json()

    // Ownership is enforced at service layer
    const updated = await bookingService.updateForUser(id, userId, {
      specialRequests: body.specialRequests,
      dietaryRequirements: body.dietaryRequirements,
      mobilityRequirements: body.mobilityRequirements,
    })
    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Parse body
    const body = await request.json()
    const reason = body.reason || 'User requested cancellation'

    // Ownership is enforced at service layer
    const cancelled = await bookingService.cancel(id, reason, userId)
    if (!cancelled) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

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
