/**
 * Bookings Availability API
 * GET /api/bookings/availability - Get available slots for a tour
 * POST /api/bookings/availability - Create new availability slot
 */

import { NextRequest, NextResponse } from 'next/server'
import { availabilityService } from '@/lib/database'
import { authenticateUser, authorizeRole } from '@/lib/auth'
import { verifyTourOwnership } from '@/lib/auth/operator-helpers'
import { z } from 'zod'
import type { AvailabilitySearch } from '@/lib/database' // TODO: fix import path - lib/availability/types'

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
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateFrom'],
      message: 'Некорректная дата dateFrom',
    })
  }

  if (to && Number.isNaN(to.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'Некорректная дата dateTo',
    })
  }

  if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'dateTo не может быть раньше dateFrom',
    })
  }
})

const createAvailabilitySchema = z.object({
  tourId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  startTime: z.string().trim().min(1).optional().default('09:00'),
  endTime: z.string().trim().min(1).optional().default('18:00'),
  totalCapacity: z.coerce.number().int().min(1),
  basePrice: z.coerce.number().nonnegative(),
  minParticipants: z.coerce.number().int().min(1).optional().default(1),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  bookingDeadlineHours: z.coerce.number().int().min(0).optional(),
  cancellationDeadlineHours: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  const parsedDate = new Date(data.date)
  if (Number.isNaN(parsedDate.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date'],
      message: 'Некорректная дата',
    })
  }

  const maxParticipants = data.maxParticipants ?? data.totalCapacity
  if (maxParticipants < data.minParticipants || maxParticipants > data.totalCapacity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxParticipants'],
      message: 'maxParticipants должен быть в диапазоне minParticipants..totalCapacity',
    })
  }
})

function paramOrUndefined(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key)
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * GET /api/bookings/availability
 * Get available slots with filters
 * Query params: tourId, dateFrom, dateTo, minSpaces, maxPrice, sortBy
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
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
        {
          error: 'Invalid query parameters',
          details: parsedQuery.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { tourId, dateFrom, dateTo, minSpaces, maxPrice } = parsedQuery.data

    // Build search params
    const params: AvailabilitySearch = {
      tourId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minAvailableSpaces: minSpaces,
      maxPrice,
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
    const parsedBody = createAvailabilitySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid availability payload',
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    }

    const {
      tourId,
      date,
      startTime,
      endTime,
      totalCapacity,
      basePrice,
      minParticipants,
      maxParticipants,
      bookingDeadlineHours,
      cancellationDeadlineHours,
      notes,
    } = parsedBody.data

    const isTourOwner = await verifyTourOwnership(userId, tourId)
    if (!isTourOwner) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const parsedDate = new Date(date)
    const normalizedMaxParticipants = maxParticipants ?? totalCapacity

    // Create slot
    const slot = await availabilityService.createSlot({
      tourId,
      date: parsedDate,
      startTime,
      endTime,
      totalCapacity,
      basePrice,
      minParticipants,
      maxParticipants: normalizedMaxParticipants,
      bookingDeadlineHours,
      cancellationDeadlineHours,
      notes,
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
