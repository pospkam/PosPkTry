/**
 * API: Knowledge Base
 * GET /api/support/knowledge-base - search articles and FAQs
 * POST /api/support/knowledge-base - create article
 */

import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseService } from '@/lib/services'
import { requireRole } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateArticleSchema = z.object({
  title: z.string().min(1, 'Заголовок статьи обязателен'),
  content: z.string().min(1, 'Содержимое статьи обязательно'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
})

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
    const body = await request.json()
    const parsed = CreateArticleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const author = auth.userId

    const article = await knowledgeBaseService.createArticle(parsed.data, author)

    return NextResponse.json({
      success: true,
      data: article,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
