/**
 * API: Knowledge Base
 * GET /api/support/knowledge-base - search articles and FAQs
 * POST /api/support/knowledge-base - create article
 */

import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseService } from '@/lib/database'
import { requireRole } from '@/lib/auth/middleware'

// AUTH: GET is public by design — allows unauthenticated users to search help content.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const filter = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
      sortOrder: searchParams.get('sortOrder') || 'DESC',
    } as any

    const result = await knowledgeBaseService.searchArticles(filter)

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/support/knowledge-base error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'agent'])
  if (auth instanceof NextResponse) return auth

  try {
    const data = await request.json()
    const author = auth.userId

    const article = await knowledgeBaseService.createArticle(data, author)

    return NextResponse.json({
      success: true,
      data: article,
    })
  } catch (error) {
    console.error('POST /api/support/knowledge-base error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
