import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth'
import { rescheduleBooking } from '@/lib/bookings/booking.service'
import { ApiResponse } from '@/types'

const payloadSchema = z.object({
  targetTourId: z.string().trim().min(1),
  targetDate: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u, 'Дата должна быть в формате YYYY-MM-DD'),
  participants: z.number().int().positive().optional(),
  comment: z.string().max(500).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.isAuthenticated || !auth.userId || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Требуется аутентификация' } as ApiResponse<null>,
        { status: 401 }
      )
    }

    if (auth.role !== 'operator' && auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав для переброса бронирования' } as ApiResponse<null>,
        { status: 403 }
      )
    }

    const { id: bookingId } = await params

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные', details: parsed.error.flatten() } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const booking = await rescheduleBooking(
      bookingId,
      auth.userId,
      auth.role === 'admin' ? 'admin' : 'operator',
      parsed.data
    )

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Бронирование перенесено на новую дату/тур',
    } as ApiResponse<typeof booking>)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
    const normalized = message.toLowerCase()

    if (normalized.includes('не найден')) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 404 }
      )
    }

    if (
      normalized.includes('недостаточно прав') ||
      normalized.includes('нельзя перебросить')
    ) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 403 }
      )
    }

    if (
      normalized.includes('недостаточно мест') ||
      normalized.includes('количество участников') ||
      normalized.includes('некорректная дата') ||
      normalized.includes('не активен')
    ) {
      return NextResponse.json(
        { success: false, error: message } as ApiResponse<null>,
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Ошибка при перебросе бронирования' } as ApiResponse<null>,
      { status: 500 }
    )
  }
}
