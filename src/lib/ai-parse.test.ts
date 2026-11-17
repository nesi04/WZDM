import { describe, expect, it } from 'vitest'
import {
  extractJsonArray,
  isTransientGeminiError,
  normalizeQuestion,
  parseFlashcards,
  parseQuiz,
  parseTagsResponse,
} from './ai-parse'

describe('extractJsonArray', () => {
  it('returns bare arrays as-is', () => {
    expect(extractJsonArray('[1,2]')).toBe('[1,2]')
  })
  it('unwraps ```json fences', () => {
    expect(extractJsonArray('Here:\n```json\n["a"]\n```')).toBe('["a"]')
  })
  it('finds an array embedded in prose', () => {
    expect(extractJsonArray('Sure! ["x","y"] hope that helps')).toBe('["x","y"]')
  })
  it('returns null when there is no array', () => {
    expect(extractJsonArray('')).toBeNull()
    expect(extractJsonArray('no array here')).toBeNull()
  })
})

describe('parseTagsResponse', () => {
  it('parses a JSON array and caps at 6 tags', () => {
    const raw = JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(parseTagsResponse(raw)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })
  it('falls back to comma/newline separated text and strips bullets/quotes', () => {
    expect(parseTagsResponse('- "biology", cells\n* mitosis')).toEqual(['biology', 'cells', 'mitosis'])
  })
  it('drops meta words and over-long tags', () => {
    expect(parseTagsResponse('json, ' + 'x'.repeat(31) + ', ok')).toEqual(['ok'])
  })
})

describe('parseFlashcards', () => {
  it('parses JSON and drops incomplete cards', () => {
    const raw = '```json\n[{"question":" Q1 ","answer":" A1 "},{"question":"Q2"},{"question":"","answer":"x"}]\n```'
    expect(parseFlashcards(raw)).toEqual([{ question: 'Q1', answer: 'A1' }])
  })
  it('falls back to Q:/A: blocks', () => {
    const raw = 'Q: What is DNA?\nA: Genetic material\n\nQuestion: Unit of life?\nAnswer: Cell'
    expect(parseFlashcards(raw)).toEqual([
      { question: 'What is DNA?', answer: 'Genetic material' },
      { question: 'Unit of life?', answer: 'Cell' },
    ])
  })
  it('caps at 20 cards', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }))
    expect(parseFlashcards(JSON.stringify(many))).toHaveLength(20)
  })
})

describe('normalizeQuestion', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(normalizeQuestion('What is  DNA?')).toBe(normalizeQuestion('what is dna'))
  })
})

describe('parseQuiz', () => {
  const opts = ['Paris', 'London', 'Rome', 'Berlin']

  it('keeps a valid MCQ and matches the answer case-insensitively', () => {
    const raw = JSON.stringify([{ question: 'Capital of France?', type: 'mcq', options: opts, answer: 'paris' }])
    expect(parseQuiz(raw)).toEqual([
      { question: 'Capital of France?', type: 'mcq', options: opts, answer: 'Paris', explanation: undefined },
    ])
  })

  it('maps a letter answer to the matching option', () => {
    const raw = JSON.stringify([{ question: 'Capital of Italy?', type: 'mcq', options: opts, answer: 'C' }])
    expect(parseQuiz(raw)[0]).toMatchObject({ type: 'mcq', answer: 'Rome' })
  })

  it('downgrades an MCQ with the wrong option count to short answer', () => {
    const raw = JSON.stringify([{ question: 'Q?', type: 'mcq', options: ['a', 'b'], answer: 'a' }])
    expect(parseQuiz(raw)[0]).toMatchObject({ type: 'short_answer', answer: 'a' })
    expect(parseQuiz(raw)[0].options).toBeUndefined()
  })

  it('downgrades an MCQ whose answer matches no option', () => {
    const raw = JSON.stringify([{ question: 'Q?', type: 'mcq', options: opts, answer: 'Madrid' }])
    expect(parseQuiz(raw)[0].type).toBe('short_answer')
  })

  it('falls back to "1. question | answer" lines when JSON is invalid', () => {
    expect(parseQuiz('1. What is H2O? | Water\nnoise\n2) Sky colour | Blue')).toEqual([
      { question: 'What is H2O?', answer: 'Water', type: 'short_answer' },
      { question: 'Sky colour', answer: 'Blue', type: 'short_answer' },
    ])
  })
})

describe('isTransientGeminiError', () => {
  it('detects retryable statuses and messages', () => {
    expect(isTransientGeminiError({ status: 503 })).toBe(true)
    expect(isTransientGeminiError({ response: { status: 429 } })).toBe(true)
    expect(isTransientGeminiError(new Error('The model is overloaded'))).toBe(true)
    expect(isTransientGeminiError(new Error('[GoogleGenerativeAI Error]: 500 Internal'))).toBe(true)
  })
  it('rejects non-transient errors', () => {
    expect(isTransientGeminiError({ status: 400 })).toBe(false)
    expect(isTransientGeminiError(new Error('API key not valid'))).toBe(false)
    expect(isTransientGeminiError(null)).toBe(false)
    expect(isTransientGeminiError('503')).toBe(false)
  })
})
