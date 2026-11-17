import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { normalizeQuestion, parseFlashcards } from '@/lib/ai-parse'
import { truncateContent, withRetry } from '@/lib/text'
import { flashcardGenSchema, parseBody, serverError } from '@/lib/validation'

export const POST = withLimit(async (req, user) => {
  try {
    const parsed = await parseBody(req, flashcardGenSchema)
    if (!parsed.ok) return parsed.response
    const { noteId, count } = parsed.data

    const note = await db.note.findFirst({
      where: { id: noteId, userId: user.id },
      include: {
        noteTags: { include: { tag: true } },
        flashcards: { select: { question: true } },
      },
    })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const tagList = note.noteTags.map((t) => t.tag.name).join(', ')
    const existingQuestions = note.flashcards.map((f) => f.question)

    const prompt = [
      'Create study flashcards from the following note.',
      `Generate exactly ${count} cards.`,
      'Return ONLY valid JSON array in this shape: [{"question":"...","answer":"..."}]',
      'Questions must be clear and answerable from the note. Keep answers concise.',
      ...(existingQuestions.length
        ? ['Do NOT repeat these existing questions:', ...existingQuestions.slice(0, 50).map((q) => `- ${q}`)]
        : []),
      '',
      `Title: ${note.title}`,
      `Tags: ${tagList || 'none'}`,
      'Content:',
      truncateContent(note.content, 8000),
    ].join('\n')

    const model = getModel('summarize')
    const result = await withRetry(() => model.generateContent(prompt), 'Flashcard generation', 2)
    const cards = parseFlashcards(result.response.text())

    if (cards.length === 0) {
      return NextResponse.json({ error: 'Could not parse flashcards from model response' }, { status: 500 })
    }

    // Skip cards that duplicate existing ones (or each other).
    const seen = new Set(existingQuestions.map(normalizeQuestion))
    const fresh = cards.filter((card) => {
      const key = normalizeQuestion(card.question)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const created = await db.$transaction(
      fresh.map((card) =>
        db.flashcard.create({
          data: { noteId: note.id, userId: user.id, question: card.question, answer: card.answer },
        })
      )
    )

    return NextResponse.json({ flashcards: created, skippedDuplicates: cards.length - fresh.length })
  } catch (error) {
    return serverError('Flashcard generation error', error, 'Failed to generate flashcards')
  }
}, 'ai:flashcards', 8, 60_000)
