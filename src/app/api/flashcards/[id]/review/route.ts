import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { nextSrsState } from '@/lib/srs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const { quality } = await req.json()
    const parsedQuality = Number(quality)
    if (!Number.isFinite(parsedQuality) || parsedQuality < 0 || parsedQuality > 5) {
      return NextResponse.json({ error: 'quality must be a number between 0 and 5' }, { status: 400 })
    }

    const flashcard = await db.flashcard.findFirst({ where: { id, userId: user.id } })
    if (!flashcard) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 })

    const next = nextSrsState(parsedQuality, {
      repetitions: flashcard.repetitions,
      interval: flashcard.interval,
      easeFactor: flashcard.easeFactor,
    })

    const updated = await db.$transaction(async (tx) => {
      const card = await tx.flashcard.update({
        where: { id: flashcard.id },
        data: {
          repetitions: next.repetitions,
          interval: next.interval,
          easeFactor: next.easeFactor,
          dueAt: next.dueAt,
          lastReviewedAt: new Date(),
        },
      })

      await tx.flashcardReview.create({
        data: {
          flashcardId: flashcard.id,
          userId: user.id,
          quality: parsedQuality,
          intervalBefore: flashcard.interval,
          intervalAfter: next.interval,
          easeFactorBefore: flashcard.easeFactor,
          easeFactorAfter: next.easeFactor,
        },
      })

      return card
    })

    return NextResponse.json({ flashcard: updated })
  } catch (error: any) {
    console.error('Flashcard review error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to review flashcard' }, { status: 500 })
  }
}

