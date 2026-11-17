import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { isTransientGeminiError, parseQuiz } from '@/lib/ai-parse'
import { truncateContent } from '@/lib/text'
import { parseBody, quizGenSchema } from '@/lib/validation'

export const POST = withLimit(async (req, user) => {
  try {
    const parsed = await parseBody(req, quizGenSchema)
    if (!parsed.ok) return parsed.response
    const { noteId, questionCount: count } = parsed.data

    const note = await db.note.findFirst({ where: { id: noteId, userId: user.id } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const model = getModel('chat')
    const prompt = [
      `Generate ${count} quiz questions from this note for active recall practice.`,
      'Aim for a mix of multiple-choice questions (mcq) and concise short-answer questions (short_answer).',
      '',
      'Return ONLY a valid JSON array of question objects adhering to this schema:',
      '[',
      '  {',
      '    "question": "Question text without option letters or embedded choices",',
      '    "type": "mcq",',
      '    "options": ["First option", "Second option", "Third option", "Fourth option"],',
      '    "answer": "Exact text of the correct option (must match one of the 4 options verbatim)",',
      '    "explanation": "Brief explanation of why this answer is correct"',
      '  },',
      '  {',
      '    "question": "Question text requiring a concise response",',
      '    "type": "short_answer",',
      '    "answer": "Reference answer",',
      '    "explanation": "Key concepts or points to check"',
      '  }',
      ']',
      '',
      'Strict requirements:',
      '1. For type "mcq", provide exactly 4 distinct, non-empty, plausible options in the "options" array.',
      '2. For type "mcq", the "answer" must be the exact text of the correct option from the "options" array, NOT just a letter like "A" or "B".',
      '3. Do not put option labels (A, B, C, D) inside the question text or options.',
      '4. For type "short_answer", omit the "options" field.',
      '5. Return only the raw JSON array. Do not include markdown code block formatting if possible.',
      '',
      `Title: ${note.title}`,
      truncateContent(note.content, 8000),
    ].join('\n')

    // Bounded retry (max 1 retry) for transient upstream provider failures
    let rawResponseText: string | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(prompt)
        rawResponseText = result.response.text()
        break
      } catch (err: unknown) {
        if (attempt === 0 && isTransientGeminiError(err)) {
          console.warn('Gemini quiz generation hit transient error, retrying once...', err)
          await new Promise((resolve) => setTimeout(resolve, 800))
          continue
        }
        throw err
      }
    }

    if (!rawResponseText) {
      return NextResponse.json({ error: 'Failed to generate quiz questions. Please try again.' }, { status: 500 })
    }

    const questions = parseQuiz(rawResponseText)
    if (!questions.length) {
      return NextResponse.json(
        { error: 'Could not parse quiz questions from note content. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ noteId: note.id, questions })
  } catch (error: unknown) {
    console.error('Quiz generation error:', error)

    if (isTransientGeminiError(error)) {
      return NextResponse.json(
        { error: 'Quiz generation is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Failed to generate quiz. Please try again later.' }, { status: 500 })
  }
}, 'ai:quiz', 8, 60_000)
