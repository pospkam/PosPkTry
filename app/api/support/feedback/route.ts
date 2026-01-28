/**
 * API: Feedback & Surveys
 * GET /api/support/feedback - list feedback
 * POST /api/support/feedback - create feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { feedbackService } from '@support-pillar/services'

export async function GET(request: NextRequest) {
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
    console.error('GET /api/support/feedback error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

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
    console.error('POST /api/support/feedback error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
