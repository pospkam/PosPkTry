/**
 * Bookings Calendar API
 * GET /api/bookings/availability/calendar - Get full calendar for a tour
 * GET /api/bookings/availability/stats - Get availability statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@booking-pillar'

/**
 * GET /api/bookings/availability/calendar
 * Get calendar view with all availability data
 * Query params: tourId, startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!tourId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'tourId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Get calendar
    const calendar = await availabilityService.getCalendar(
      tourId,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Failed to get calendar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get calendar' },
      { status: 500 }
    )
  }
}
