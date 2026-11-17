import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { serverError } from '@/lib/validation'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tag = (searchParams.get('tag') ?? '').trim()
    const limit = Math.max(5, Math.min(100, Number(searchParams.get('limit') ?? 25)))

    const where = {
      userId: user.id,
      ...(tag
        ? {
            note: {
              noteTags: {
                some: {
                  tag: {
                    name: { equals: tag, mode: 'insensitive' as const },
                  },
                },
              },
            },
          }
        : {}),
    }

    const now = new Date()

    const dueCards = await db.flashcard.findMany({
      where: { ...where, dueAt: { lte: now } },
      orderBy: [{ dueAt: 'asc' }],
      take: limit,
      include: { note: { select: { id: true, title: true } } },
    })

    const remaining = Math.max(0, limit - dueCards.length)
    const newCards = remaining
      ? await db.flashcard.findMany({
          // Never-reviewed cards only; failed cards wait until their due date.
          where: { ...where, lastReviewedAt: null, id: { notIn: dueCards.map((c) => c.id) } },
          orderBy: [{ createdAt: 'desc' }],
          take: remaining,
          include: { note: { select: { id: true, title: true } } },
        })
      : []

    return NextResponse.json({
      cards: [...dueCards, ...newCards],
      stats: {
        dueCount: dueCards.length,
        newCount: newCards.length,
      },
    })
  } catch (error) {
    return serverError('Failed to build study session', error, 'Failed to build study session')
  }
}

