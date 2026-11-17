export function extractJsonArray(raw: string): string | null {
  const text = (raw || '').trim()
  if (!text) return null

  // Exact JSON array.
  if (text.startsWith('[') && text.endsWith(']')) return text

  // ```json ... ``` or ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    const inner = fence[1].trim()
    if (inner.startsWith('[') && inner.endsWith(']')) return inner
  }

  // First array-looking slice.
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }

  return null
}

type Json = Record<string, unknown>

const isObject = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x)

/** Parse model output (JSON array, or CSV/newline fallback) into clean tag names. */
export function parseTagsResponse(response: string): string[] {
  let candidates: string[] = []

  try {
    const parsed: unknown = JSON.parse(extractJsonArray(response) || response)
    if (Array.isArray(parsed)) {
      candidates = parsed.filter((t): t is string => typeof t === 'string')
    }
  } catch {
    candidates = response.split(/[,\n|]/).map((t) => t.trim())
  }

  return candidates
    .map((t) => t.replace(/^["'\-\*\d\.\[\]{}:]+|["'\[\]{}:]+$/g, '').trim())
    .filter((t) => {
      if (!t || t.length > 30) return false
      if (/^[\[\]{}",:\s]+$/.test(t)) return false
      if (t === 'json' || t === 'array' || t === 'object') return false
      return true
    })
    .slice(0, 6)
}

export interface ParsedFlashcard {
  question: string
  answer: string
}

/** Parse model output into flashcards (JSON array, or "Q: / A:" block fallback). */
export function parseFlashcards(raw: string): ParsedFlashcard[] {
  const jsonSlice = extractJsonArray(raw)
  try {
    const data: unknown = JSON.parse(jsonSlice || raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((x): x is { question: string; answer: string } =>
        isObject(x) && typeof x.question === 'string' && typeof x.answer === 'string'
      )
      .map((x) => ({ question: x.question.trim(), answer: x.answer.trim() }))
      .filter((x) => x.question && x.answer)
      .slice(0, 20)
  } catch {
    return raw
      .split(/\n{2,}/)
      .map((b) => {
        const q = b.match(/(?:^|\n)\s*(?:Q|Question)\s*:\s*(.+)/i)?.[1]?.trim()
        const a = b.match(/(?:^|\n)\s*(?:A|Answer)\s*:\s*(.+)/i)?.[1]?.trim()
        return q && a ? { question: q, answer: a } : null
      })
      .filter((x): x is ParsedFlashcard => !!x)
      .slice(0, 20)
  }
}

/** Normalize a question for duplicate detection. */
export function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface QuizQuestion {
  question: string
  answer: string
  type: 'mcq' | 'short_answer'
  options?: string[]
  explanation?: string
}

/**
 * Parse model output into quiz questions. MCQs must have exactly 4 unique
 * options and an answer that matches one (by text or A-D letter); otherwise
 * they're downgraded to short-answer.
 */
export function parseQuiz(raw: string): QuizQuestion[] {
  const jsonSlice = extractJsonArray(raw)
  try {
    const data: unknown = JSON.parse(jsonSlice || raw)
    if (!Array.isArray(data)) return []

    const validQuestions: QuizQuestion[] = []

    for (const item of data) {
      if (!isObject(item)) continue
      if (typeof item.question !== 'string' || typeof item.answer !== 'string') continue

      const question = item.question.trim()
      const answer = item.answer.trim()
      if (!question || !answer) continue

      const rawType = typeof item.type === 'string' ? item.type.trim().toLowerCase() : 'short_answer'
      const explanation =
        typeof item.explanation === 'string' && item.explanation.trim() ? item.explanation.trim() : undefined

      if (rawType === 'mcq' && Array.isArray(item.options)) {
        const uniqueOptions = Array.from(
          new Set(
            item.options
              .filter((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0)
              .map((opt) => opt.trim())
          )
        )

        let matchedOption =
          uniqueOptions.find((opt) => opt === answer) ??
          uniqueOptions.find((opt) => opt.toLowerCase() === answer.toLowerCase())

        if (!matchedOption && uniqueOptions.length === 4 && /^[A-Da-d][).:\s]*$/.test(answer)) {
          matchedOption = uniqueOptions[answer.toUpperCase().charCodeAt(0) - 65]
        }

        if (uniqueOptions.length === 4 && matchedOption) {
          validQuestions.push({ question, answer: matchedOption, type: 'mcq', options: uniqueOptions, explanation })
          continue
        }
      }

      validQuestions.push({ question, answer, type: 'short_answer', explanation })
    }

    return validQuestions
  } catch {
    const fallbackQuestions: QuizQuestion[] = []
    for (const line of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const m = line.match(/^\d+[).\-\s]+(.+?)\s*\|\s*(.+)$/)
      if (m && m[1].trim() && m[2].trim()) {
        fallbackQuestions.push({ question: m[1].trim(), answer: m[2].trim(), type: 'short_answer' })
      }
    }
    return fallbackQuestions
  }
}

/** True for upstream errors worth retrying (rate limits, overload, 5xx, timeouts). */
export function isTransientGeminiError(error: unknown): boolean {
  if (!isObject(error) && !(error instanceof Error)) return false
  const errObj = error as unknown as Json

  const statusOf = (x: unknown) => (isObject(x) && typeof x.status === 'number' ? x.status : undefined)
  const status = statusOf(errObj) ?? statusOf(errObj.response) ?? statusOf(errObj.cause)
  if (status && [429, 500, 502, 503, 504].includes(status)) return true

  const message = String(errObj.message ?? '')
  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    /service\s*unavailable|high\s*demand|overloaded|temporarily\s*unavailable|rate\s*limit|resource[_\s]exhausted|deadline[_\s]exceeded|bad\s*gateway|gateway\s*timeout/i.test(
      message
    )
  )
}
