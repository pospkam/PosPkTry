/**
 * API: Feedback & Surveys
 * GET /api/support/feedback - list feedback
 * POST /api/support/feedback - create feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@/lib/services'
import { requireRole, requireAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateFeedbackSchema = z.object({
  ticketId: z.string().optional(),
  overallRating: z.number({ coerce: true }).min(1).max(5).optional(),
  comment: z.string().optional(),
  rating: z.number({ coerce: true }).min(1).max(5).optional(),
  category: z.string().optional(),
}).refine(
  data => data.ticketId || data.overallRating || data.rating || data.comment,
  'Необходимо указать хотя бы одно поле обратной связи'
)

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'agent'])
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams

    const filter = {
      agentId: searchParams.get('agentId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      ratingMin: searchParams.get('ratingMin') ? parseInt(searchParams.get('ratingMin')!) : undefined,
      ratingMax: searchParams.get('ratingMax') ? parseInt(searchParams.get('ratingMax')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    const result = await feedbackService.listFeedback(filter)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const parsed = CreateFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Check if it's feedback or survey
    if (data.overallRating && !data.ticketId) {
      // It's a survey
      const survey = await feedbackService.createSurvey(data)
      return NextResponse.json({
        success: true,
        data: survey,
      })
    } else {
      // It's feedback
      const feedback = await feedbackService.createFeedback(data)
      return NextResponse.json({
        success: true,
        data: feedback,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
