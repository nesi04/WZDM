import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { extractJsonArray } from '@/lib/ai-parse'

function parseQuiz(raw: string): Array<{ question: string; answer: string; type: string }> {
  const jsonSlice = extractJsonArray(raw)
  try {
    const data = JSON.parse(jsonSlice || raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
      .map((x) => ({
        question: x.question.trim(),
        answer: x.answer.trim(),
        type: typeof x.type === 'string' ? x.type : 'short_answer',
      }))
      .filter((x) => x.question && x.answer)
  } catch {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines
      .map((line) => {
        const m = line.match(/^\d+[\).\-\s]+(.+?)\s*\|\s*(.+)$/)
        if (!m) return null
        return { question: m[1].trim(), answer: m[2].trim(), type: 'short_answer' }
      })
      .filter((x): x is { question: string; answer: string; type: string } => !!x)
  }
}

export const POST = withLimit(async (req: NextRequest) => {
  try {
    const user = await getAuthedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { noteId, questionCount = 6 } = await req.json()
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

    const note = await db.note.findFirst({ where: { id: noteId, userId: user.id } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const count = Math.max(3, Math.min(15, Number(questionCount) || 6))
    const model = getModel('chat')
    const result = await model.generateContent(
      [
        `Generate ${count} quiz questions from this note for active recall.`,
        'Return only JSON array with objects: {"question":"...","answer":"...","type":"mcq|short_answer"}.',
        'If mcq, include options in question text and provide correct answer in answer field.',
        '',
        `Title: ${note.title}`,
        note.content,
      ].join('\n')
    )

    const questions = parseQuiz(result.response.text())
    if (!questions.length) {
      return NextResponse.json({ error: 'Could not parse quiz questions' }, { status: 500 })
    }

    return NextResponse.json({ noteId: note.id, questions })
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate quiz' }, { status: 500 })
  }
}, 'ai:quiz', 8, 60_000)

