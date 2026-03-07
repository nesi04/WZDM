import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'

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
          where: { ...where, repetitions: 0, id: { notIn: dueCards.map((c) => c.id) } },
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
  } catch (error: any) {
    console.error('Study session error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to build study session' }, { status: 500 })
  }
}

