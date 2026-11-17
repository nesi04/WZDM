import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { serverError } from '@/lib/validation'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dueOnly = searchParams.get('due') === 'true'
    const noteId = searchParams.get('noteId') ?? undefined
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') ?? 30)))

    const flashcards = await db.flashcard.findMany({
      where: {
        userId: user.id,
        ...(noteId ? { noteId } : {}),
        ...(dueOnly ? { dueAt: { lte: new Date() } } : {}),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        note: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json({ flashcards })
  } catch (error) {
    return serverError('Failed to fetch flashcards', error, 'Failed to fetch flashcards')
  }
}

