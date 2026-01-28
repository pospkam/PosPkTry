/**
 * GET/PUT/DELETE /api/engagement/messages/[id]
 * Get, update, or delete specific message
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@engagement-pillar/lib/messaging/services'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const message = await messagingService.getMessage(params.id)

    return NextResponse.json({
      success: true,
      data: { message },
    })
  } catch (error) {
    console.error('GET /api/engagement/messages/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch message' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    if (body.markAsRead) {
      await messagingService.markAsRead(params.id, userId)
    }

    const message = await messagingService.getMessage(params.id)

    return NextResponse.json({
      success: true,
      data: { message },
    })
  } catch (error) {
    console.error('PUT /api/engagement/messages/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await messagingService.deleteMessage(params.id, userId)

    return NextResponse.json({
      success: true,
      message: 'Message deleted',
    })
  } catch (error) {
    console.error('DELETE /api/engagement/messages/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
