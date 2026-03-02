/**
 * GET/PUT/DELETE /api/engagement/messages/[id]
 * Get, update, or delete specific message
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const message = role === 'admin'
      ? await messagingService.getMessage(id)
      : await messagingService.getMessageForUser(id, userId)
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existingMessage = role === 'admin'
      ? await messagingService.getMessage(id)
      : await messagingService.getMessageForUser(id, userId)
    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const body = await request.json()

    if (body.markAsRead) {
      const updated = await messagingService.markAsRead(id, userId, role === 'admin')
      if (!updated) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }
    }

    const message = role === 'admin'
      ? await messagingService.getMessage(id)
      : await messagingService.getMessageForUser(id, userId)
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const deleted = await messagingService.deleteMessage(id, userId, role === 'admin')
    if (!deleted) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

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
