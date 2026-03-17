/**
 * Bookings Availability API
 * GET /api/bookings/availability - Get available slots for a tour
 * POST /api/bookings/availability - Create new availability slot (operator)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query } from '@/lib/database'
import { authenticateUser, authorizeRole } from '@/lib/auth'
import { verifyTourOwnership } from '@/lib/auth/operator-helpers'

const availabilityQuerySchema = z.object({
  tourId: z.string().trim().min(1),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  minSpaces: z.coerce.number().int().min(1).optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
  const from = data.dateFrom ? new Date(data.dateFrom) : null
  const to = data.dateTo ? new Date(data.dateTo) : null

  if (from && Number.isNaN(from.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateFrom'], message: 'Некорректная дата dateFrom' })
  }
  if (to && Number.isNaN(to.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateTo'], message: 'Некорректная дата dateTo' })
  }
  if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateTo'], message: 'dateTo не может быть раньше dateFrom' })
  }
})

const createAvailabilitySchema = z.object({
  tourId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  totalCapacity: z.coerce.number().int().min(1),
  basePrice: z.coerce.number().nonnegative().optional(),
  minParticipants: z.coerce.number().int().min(1).optional().default(1),
  notes: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  const parsedDate = new Date(data.date)
  if (Number.isNaN(parsedDate.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'Некорректная дата' })
  }
})

function paramOrUndefined(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

interface DepartureRow {
  id: string;
  tour_id: string;
  start_date: string;
  end_date: string | null;
  available_slots: string;
  booked_slots: string;
  remaining_slots: string;
  price: string | null;
  min_group_size: string | null;
  status: string;
  notes: string | null;
}

function formatSlot(row: DepartureRow) {
  return {
    id: row.id,
    tourId: row.tour_id,
    date: row.start_date,
    endDate: row.end_date ?? null,
    availableSlots: Number(row.available_slots),
    bookedSlots: Number(row.booked_slots),
    remainingSlots: Number(row.remaining_slots),
    price: row.price ? Number(row.price) : null,
    minGroupSize: row.min_group_size ? Number(row.min_group_size) : null,
    status: row.status,
    notes: row.notes ?? null,
  }
}

/**
 * GET /api/bookings/availability
 * Get available departure slots for a tour
 * Query params: tourId, dateFrom, dateTo, minSpaces, maxPrice
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsedQuery = availabilityQuerySchema.safeParse({
      tourId: paramOrUndefined(searchParams, 'tourId'),
      dateFrom: paramOrUndefined(searchParams, 'dateFrom'),
      dateTo: paramOrUndefined(searchParams, 'dateTo'),
      minSpaces: paramOrUndefined(searchParams, 'minSpaces'),
      maxPrice: paramOrUndefined(searchParams, 'maxPrice'),
    })

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsedQuery.error.flatten() },
        { status: 400 }
      )
    }

    const { tourId, dateFrom, dateTo, minSpaces, maxPrice } = parsedQuery.data

    const conditions: string[] = ['td.tour_id = $1', 'td.status = \'active\'']
    const queryParams: unknown[] = [tourId]
    let idx = 2

    if (dateFrom) {
      conditions.push(`td.start_date >= $${idx++}`)
      queryParams.push(new Date(dateFrom))
    } else {
      conditions.push('td.start_date >= CURRENT_DATE')
    }

    if (dateTo) {
      conditions.push(`td.start_date <= $${idx++}`)
      queryParams.push(new Date(dateTo))
    }

    if (minSpaces) {
      conditions.push(`(td.available_slots - td.booked_slots) >= $${idx++}`)
      queryParams.push(minSpaces)
    }

    if (maxPrice !== undefined) {
      conditions.push(`COALESCE(td.price_override, t.price) <= $${idx++}`)
      queryParams.push(maxPrice)
    }

    const result = await query<DepartureRow>(
      `SELECT
         td.id,
         td.tour_id,
         td.start_date::text,
         td.end_date::text,
         td.available_slots,
         td.booked_slots,
         (td.available_slots - td.booked_slots) AS remaining_slots,
         COALESCE(td.price_override, t.price)::text AS price,
         td.min_group_size,
         td.status,
         td.notes
       FROM tour_departures td
       JOIN tours t ON t.id = td.tour_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY td.start_date ASC`,
      queryParams as unknown[]
    )

    const slots = result.rows.map(formatSlot)

    return NextResponse.json({ slots, count: slots.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search availability' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings/availability
 * Create new departure slot for a tour (operator only)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isOperator = await authorizeRole(request, 'operator')
    if (!isOperator) {
      return NextResponse.json({ error: 'Only operators can create availability' }, { status: 403 })
    }

    const body = await request.json()
    const parsedBody = createAvailabilitySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid availability payload', details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const { tourId, date, totalCapacity, basePrice, minParticipants, notes } = parsedBody.data

    const isTourOwner = await verifyTourOwnership(userId, tourId)
    if (!isTourOwner) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const result = await query<DepartureRow>(
      `INSERT INTO tour_departures
         (tour_id, start_date, available_slots, booked_slots, price_override, min_group_size, notes)
       VALUES ($1, $2, $3, 0, $4, $5, $6)
       RETURNING
         id, tour_id, start_date::text, end_date::text, available_slots, booked_slots,
         (available_slots - booked_slots) AS remaining_slots,
         price_override::text AS price, min_group_size, status, notes`,
      [tourId, new Date(date), totalCapacity, basePrice ?? null, minParticipants, notes ?? null]
    )

    return NextResponse.json(formatSlot(result.rows[0]), { status: 201 })
  } catch (error) {
    // Обработка нарушения UNIQUE(tour_id, start_date)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Заезд на эту дату уже существует для данного тура' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create availability slot' },
      { status: 500 }
    )
  }
}
