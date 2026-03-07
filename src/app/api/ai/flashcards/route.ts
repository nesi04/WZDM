import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { extractJsonArray } from '@/lib/ai-parse'

function parseFlashcards(raw: string): Array<{ question: string; answer: string }> {
  const jsonSlice = extractJsonArray(raw)
  try {
    const data = JSON.parse(jsonSlice || raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
      .map((x) => ({ question: x.question.trim(), answer: x.answer.trim() }))
      .filter((x) => x.question && x.answer)
      .slice(0, 20)
  } catch {
    // Fallback: parse "Q: ... A: ..." blocks.
    const blocks = raw.split(/\n{2,}/)
    const parsed = blocks
      .map((b) => {
        const q = b.match(/(?:^|\n)\s*(?:Q|Question)\s*:\s*(.+)/i)?.[1]?.trim()
        const a = b.match(/(?:^|\n)\s*(?:A|Answer)\s*:\s*(.+)/i)?.[1]?.trim()
        return q && a ? { question: q, answer: a } : null
      })
      .filter((x): x is { question: string; answer: string } => !!x)
      .slice(0, 20)
    return parsed
  }
}

export const POST = withLimit(async (req: NextRequest) => {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { noteId, count = 8 } = await req.json()
    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
    }

    const note = await db.note.findFirst({
      where: { id: noteId, userId: user.id },
      include: { noteTags: { include: { tag: true } } },
    })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const tagList = note.noteTags.map((t) => t.tag.name).join(', ')
    const model = getModel('summarize')
    const targetCount = Math.max(3, Math.min(20, Number(count) || 8))

    const prompt = [
      'Create study flashcards from the following note.',
      `Generate exactly ${targetCount} cards.`,
      'Return ONLY valid JSON array in this shape: [{"question":"...","answer":"..."}]',
      'Questions must be clear and answerable from the note. Keep answers concise.',
      '',
      `Title: ${note.title}`,
      `Tags: ${tagList || 'none'}`,
      'Content:',
      note.content,
    ].join('\n')

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const cards = parseFlashcards(text)

    if (cards.length === 0) {
      return NextResponse.json({ error: 'Could not parse flashcards from model response' }, { status: 500 })
    }

    const created = await db.$transaction(
      cards.map((card) =>
        db.flashcard.create({
          data: {
            noteId: note.id,
            userId: user.id,
            question: card.question,
            answer: card.answer,
          },
        })
      )
    )

    return NextResponse.json({ flashcards: created })
  } catch (error: any) {
    console.error('Flashcard generation error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate flashcards' }, { status: 500 })
  }
}, 'ai:flashcards', 8, 60_000)

