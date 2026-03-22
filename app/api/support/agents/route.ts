/**
 * API: Support Agents
 * GET /api/support/agents - list agents
 * POST /api/support/agents - create agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { agentService } from '@/lib/services'
import { requireRole } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateAgentSchema = z.object({
  userId: z.string().min(1, 'ID пользователя обязателен'),
  name: z.string().min(1, 'Имя агента обязательно'),
  email: z.string().email('Некорректный email'),
  team: z.string().optional(),
  skills: z.array(z.string()).optional(),
  maxConcurrentTickets: z.number({ coerce: true }).int().positive().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'agent'])
  if (auth instanceof NextResponse) return auth

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
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const parsed = CreateAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const agent = await agentService.createAgent(parsed.data)

    return NextResponse.json({
      success: true,
      data: agent,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
