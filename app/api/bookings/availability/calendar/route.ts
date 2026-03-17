/**
 * Bookings Calendar API
 * GET /api/bookings/availability/calendar - Get full calendar for a tour
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

/**
 * GET /api/bookings/availability/calendar
 * Get calendar view with all availability data for a tour.
 * Public by design: calendar availability for tour selection.
 * Query params: tourId, startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!tourId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'tourId, startDate и endDate обязательны' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Некорректный формат даты' }, { status: 400 })
    }

    if (end < start) {
      return NextResponse.json({ error: 'endDate не может быть раньше startDate' }, { status: 400 })
    }

    const result = await query<{
      date: string;
      available_slots: string;
      booked_slots: string;
      remaining: string;
      price: string | null;
      status: string;
    }>(
      `SELECT
         td.start_date::text AS date,
         td.available_slots,
         td.booked_slots,
         (td.available_slots - td.booked_slots) AS remaining,
         COALESCE(td.price_override, t.price)::text AS price,
         td.status
       FROM tour_departures td
       JOIN tours t ON t.id = td.tour_id
       WHERE td.tour_id = $1
         AND td.start_date >= $2
         AND td.start_date <= $3
       ORDER BY td.start_date ASC`,
      [tourId, start, end]
    )

    const days = result.rows.map(row => ({
      date: row.date,
      available: Number(row.remaining),
      totalSlots: Number(row.available_slots),
      bookedSlots: Number(row.booked_slots),
      price: row.price ? Number(row.price) : null,
      status: row.status,
    }))

    return NextResponse.json({ days })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get calendar' },
      { status: 500 }
    )
  }
}
