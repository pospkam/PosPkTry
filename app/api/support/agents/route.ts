/**
 * API: Support Agents
 * GET /api/support/agents - list agents
 * POST /api/support/agents - create agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { agentService } from '@support-pillar/services'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const team = searchParams.get('team')
    const category = searchParams.get('category')

    if (category) {
      // Get available agents for category
      const agents = await agentService.getAvailableAgents(category)
      return NextResponse.json({
        success: true,
        data: agents,
      })
    }

    // For now, return empty list (full agent listing would require additional implementation)
    return NextResponse.json({
      success: true,
      data: [],
    })
  } catch (error) {
    console.error('GET /api/support/agents error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const agent = await agentService.createAgent(data)

    return NextResponse.json({
      success: true,
      data: agent,
    })
  } catch (error) {
    console.error('POST /api/support/agents error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
