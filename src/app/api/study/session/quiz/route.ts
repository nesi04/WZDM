import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthedUser } from '@/lib/server-auth'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { extractJsonArray } from '@/lib/ai-parse'

export interface QuizQuestion {
  question: string
  answer: string
  type: 'mcq' | 'short_answer'
  options?: string[]
  explanation?: string
}

function parseQuiz(raw: string): QuizQuestion[] {
  const jsonSlice = extractJsonArray(raw)
  try {
    const data = JSON.parse(jsonSlice || raw)
    if (!Array.isArray(data)) return []

    const validQuestions: QuizQuestion[] = []

    for (const item of data) {
      if (!item || typeof item !== 'object') continue

      const rawQuestion = (item as Record<string, unknown>).question
      const rawAnswer = (item as Record<string, unknown>).answer
      if (typeof rawQuestion !== 'string' || typeof rawAnswer !== 'string') continue

      const question = rawQuestion.trim()
      const answer = rawAnswer.trim()
      if (!question || !answer) continue

      const rawType =
        typeof (item as Record<string, unknown>).type === 'string'
          ? ((item as Record<string, unknown>).type as string).trim().toLowerCase()
          : 'short_answer'

      const rawExplanation = (item as Record<string, unknown>).explanation
      const explanation =
        typeof rawExplanation === 'string' && rawExplanation.trim()
          ? rawExplanation.trim()
          : undefined

      const rawOptions = (item as Record<string, unknown>).options

      if (rawType === 'mcq' && Array.isArray(rawOptions)) {
        const stringOptions: string[] = []
        for (const opt of rawOptions) {
          if (typeof opt === 'string' && opt.trim().length > 0) {
            stringOptions.push(opt.trim())
          }
        }

        const uniqueOptions: string[] = Array.from(new Set<string>(stringOptions))

        let matchedOption: string | undefined = uniqueOptions.find((opt) => opt === answer)
        if (!matchedOption) {
          matchedOption = uniqueOptions.find((opt) => opt.toLowerCase() === answer.toLowerCase())
        }

        if (!matchedOption && uniqueOptions.length === 4) {
          const letterMatch = answer.match(/^[A-Da-d][\).\:\s]*$/)
          if (letterMatch) {
            const letterIndex = answer.trim().toUpperCase().charCodeAt(0) - 65
            if (letterIndex >= 0 && letterIndex < uniqueOptions.length) {
              matchedOption = uniqueOptions[letterIndex]
            }
          }
        }

        if (uniqueOptions.length === 4 && matchedOption) {
          validQuestions.push({
            question,
            answer: matchedOption,
            type: 'mcq',
            options: uniqueOptions,
            explanation,
          })
          continue
        }
      }

      validQuestions.push({
        question,
        answer,
        type: 'short_answer',
        explanation,
      })
    }

    return validQuestions
  } catch {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
    const fallbackQuestions: QuizQuestion[] = []

    for (const line of lines) {
      const m = line.match(/^\d+[\).\-\s]+(.+?)\s*\|\s*(.+)$/)
      if (m && m[1].trim() && m[2].trim()) {
        fallbackQuestions.push({
          question: m[1].trim(),
          answer: m[2].trim(),
          type: 'short_answer',
        })
      }
    }

    return fallbackQuestions
  }
}

function isTransientGeminiError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status =
      typeof errObj.status === 'number'
        ? errObj.status
        : typeof (errObj.response as Record<string, unknown> | undefined)?.status === 'number'
          ? ((errObj.response as Record<string, unknown>).status as number)
          : typeof (errObj.cause as Record<string, unknown> | undefined)?.status === 'number'
            ? ((errObj.cause as Record<string, unknown>).status as number)
            : undefined

    if (status && [429, 500, 502, 503, 504].includes(status)) {
      return true
    }
  }

  if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
    const message = String((error as { message?: unknown }).message || '')
    if (
      /\b(429|500|502|503|504)\b/.test(message) ||
      /service\s*unavailable/i.test(message) ||
      /high\s*demand/i.test(message) ||
      /overloaded/i.test(message) ||
      /temporarily\s*unavailable/i.test(message) ||
      /rate\s*limit/i.test(message) ||
      /resource[_\s]exhausted/i.test(message) ||
      /deadline[_\s]exceeded/i.test(message) ||
      /bad\s*gateway/i.test(message) ||
      /gateway\s*timeout/i.test(message)
    ) {
      return true
    }
  }

  return false
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
      note.content,
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
      return NextResponse.json(
        { error: 'Failed to generate quiz questions. Please try again.' },
        { status: 500 }
      )
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

    return NextResponse.json(
      { error: 'Failed to generate quiz. Please try again later.' },
      { status: 500 }
    )
  }
}, 'ai:quiz', 8, 60_000)
