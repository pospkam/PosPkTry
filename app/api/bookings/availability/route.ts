/**
 * Bookings Availability API
 * GET /api/bookings/availability - Get available slots for a tour
 * POST /api/bookings/availability - Create new availability slot
 */

import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@booking-pillar'
import { authenticateUser, authorizeRole } from '@core/auth'
import type { AvailabilitySearch } from '@booking-pillar/lib/availability/types'

/**
 * GET /api/bookings/availability
 * Get available slots with filters
 * Query params: tourId, dateFrom, dateTo, minSpaces, maxPrice, sortBy
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const minSpaces = searchParams.get('minSpaces')
    const maxPrice = searchParams.get('maxPrice')

    if (!tourId) {
      return NextResponse.json({ error: 'tourId is required' }, { status: 400 })
    }

    // Build search params
    const params: AvailabilitySearch = {
      tourId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minAvailableSpaces: minSpaces ? parseInt(minSpaces) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy: 'date',
      sortOrder: 'asc',
    }

    // Search availability
    const slots = await availabilityService.search(params)

    return NextResponse.json({
      slots,
      count: slots.length,
    })
  } catch (error) {
    console.error('Failed to search availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search availability' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings/availability
 * Create new availability slot (operator only)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check operator role
    const isOperator = await authorizeRole(request, 'operator')
    if (!isOperator) {
      return NextResponse.json({ error: 'Only operators can create availability' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()

    // Validate required fields
    if (!body.tourId || !body.date || !body.totalCapacity || !body.basePrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create slot
    const slot = await availabilityService.createSlot({
      tourId: body.tourId,
      date: new Date(body.date),
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '18:00',
      totalCapacity: body.totalCapacity,
      basePrice: body.basePrice,
      minParticipants: body.minParticipants || 1,
      maxParticipants: body.maxParticipants || body.totalCapacity,
      bookingDeadlineHours: body.bookingDeadlineHours,
      cancellationDeadlineHours: body.cancellationDeadlineHours,
      notes: body.notes,
    })

    return NextResponse.json(slot, { status: 201 })
  } catch (error) {
    console.error('Failed to create availability slot:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create availability slot' },
      { status: 500 }
    )
  }
}
