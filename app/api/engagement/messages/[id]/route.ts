/**
 * GET/PUT/DELETE /api/engagement/messages/[id]
 * Get, update, or delete specific message
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

function extractMessageParticipantIds(message: unknown): string[] {
  if (!message || typeof message !== 'object') {
    return [];
  }

  const record = message as Record<string, unknown>;
  const candidateIds = [
    record.senderId,
    record.sender_id,
    record.recipientId,
    record.recipient_id,
    record.userId,
    record.user_id,
  ];

  return candidateIds.filter((value): value is string => typeof value === 'string');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const message = await messagingService.getMessage(id)
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const participantIds = extractMessageParticipantIds(message)
    if (role !== 'admin' && (participantIds.length === 0 || !participantIds.includes(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const existingMessage = await messagingService.getMessage(id)
    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const participantIds = extractMessageParticipantIds(existingMessage)
    if (role !== 'admin' && (participantIds.length === 0 || !participantIds.includes(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (body.markAsRead) {
      await messagingService.markAsRead(id, userId)
    }

    const message = await messagingService.getMessage(id)

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
    const existingMessage = await messagingService.getMessage(id)
    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const participantIds = extractMessageParticipantIds(existingMessage)
    if (role !== 'admin' && (participantIds.length === 0 || !participantIds.includes(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await messagingService.deleteMessage(id, userId)

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
