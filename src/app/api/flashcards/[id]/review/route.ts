import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { nextSrsState } from '@/lib/srs'
import { parseBody, reviewSchema, serverError } from '@/lib/validation'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const parsed = await parseBody(req, reviewSchema)
    if (!parsed.ok) return parsed.response
    const parsedQuality = parsed.data.quality

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
  } catch (error) {
    return serverError('Flashcard review error', error, 'Failed to review flashcard')
  }
}

