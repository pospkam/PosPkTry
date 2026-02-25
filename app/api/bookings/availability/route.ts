/**
 * Bookings Availability API
 * GET /api/bookings/availability - Get available slots for a tour
 * POST /api/bookings/availability - Create new availability slot
 */

import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@/lib/database'
import { authenticateUser, authorizeRole } from '@/lib/auth'
import { verifyTourOwnership } from '@/lib/auth/operator-helpers'
import type { AvailabilitySearch } from '@/lib/database' // TODO: fix import path - lib/availability/types'

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

    const isTourOwner = await verifyTourOwnership(userId, String(body.tourId))
    if (!isTourOwner) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const parsedDate = new Date(String(body.date))
    const totalCapacity = Number(body.totalCapacity)
    const basePrice = Number(body.basePrice)
    const minParticipants = body.minParticipants !== undefined ? Number(body.minParticipants) : 1
    const maxParticipants = body.maxParticipants !== undefined ? Number(body.maxParticipants) : totalCapacity

    if (
      Number.isNaN(parsedDate.getTime()) ||
      !Number.isInteger(totalCapacity) ||
      totalCapacity < 1 ||
      !Number.isFinite(basePrice) ||
      basePrice < 0 ||
      !Number.isInteger(minParticipants) ||
      minParticipants < 1 ||
      !Number.isInteger(maxParticipants) ||
      maxParticipants < minParticipants ||
      maxParticipants > totalCapacity
    ) {
      return NextResponse.json({ error: 'Invalid availability payload' }, { status: 400 })
    }

    // Create slot
    const slot = await availabilityService.createSlot({
      tourId: body.tourId,
      date: parsedDate,
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '18:00',
      totalCapacity,
      basePrice,
      minParticipants,
      maxParticipants,
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
