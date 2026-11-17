import { describe, expect, it, vi } from 'vitest'
import { truncateContent, withRetry } from './text'
import { normalizeTagNames, MAX_TAGS_PER_NOTE } from './tags'
import { allow } from './rate-limit'
import { chatSchema, createNoteSchema, importTextSchema, parseBody, reviewSchema, updateNoteSchema } from './validation'

describe('truncateContent', () => {
  it('leaves short text untouched', () => {
    expect(truncateContent('hello', 10)).toBe('hello')
  })
  it('cuts at a sentence boundary when one is near the limit', () => {
    const text = 'First sentence here. Second one goes on and on'
    expect(truncateContent(text, 25)).toBe('First sentence here.')
  })
  it('hard-cuts when no boundary is near the limit', () => {
    expect(truncateContent('a'.repeat(100), 10)).toBe('a'.repeat(10))
  })
})

describe('withRetry', () => {
  it('retries until success', async () => {
    vi.useFakeTimers()
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const promise = withRetry(fn, 'test')
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    spy.mockRestore()
    vi.useRealTimers()
  })
  it('rethrows the last error after all attempts fail', async () => {
    vi.useFakeTimers()
    const fn = vi.fn().mockRejectedValue(new Error('nope'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const promise = withRetry(fn, 'test', 2)
    const assertion = expect(promise).rejects.toThrow('nope')
    await vi.runAllTimersAsync()
    await assertion
    expect(fn).toHaveBeenCalledTimes(2)
    spy.mockRestore()
    vi.useRealTimers()
  })
})

describe('normalizeTagNames', () => {
  it('trims, drops empties and de-duplicates case-insensitively', () => {
    expect(normalizeTagNames([' Math ', 'math', '', 'Physics', null])).toEqual(['Math', 'Physics'])
  })
  it('drops over-long names and caps the count', () => {
    const many = Array.from({ length: 50 }, (_, i) => `t${i}`)
    expect(normalizeTagNames(['x'.repeat(31)])).toEqual([])
    expect(normalizeTagNames(many)).toHaveLength(MAX_TAGS_PER_NOTE)
  })
})

describe('allow (rate limiter)', () => {
  it('allows `rate` requests per interval, then blocks, then refills', () => {
    vi.useFakeTimers()
    const key = `test:${Math.random()}`
    expect([allow(key, 2, 1000), allow(key, 2, 1000), allow(key, 2, 1000)]).toEqual([true, true, false])
    vi.advanceTimersByTime(1000)
    expect(allow(key, 2, 1000)).toBe(true)
    vi.useRealTimers()
  })
  it('keeps keys independent', () => {
    const a = `a:${Math.random()}`
    const b = `b:${Math.random()}`
    expect(allow(a, 1)).toBe(true)
    expect(allow(a, 1)).toBe(false)
    expect(allow(b, 1)).toBe(true)
  })
})

describe('validation schemas', () => {
  it('createNoteSchema trims and requires title/content', () => {
    expect(createNoteSchema.parse({ title: ' T ', content: ' C ' })).toEqual({ title: 'T', content: 'C', tags: [] })
    expect(createNoteSchema.safeParse({ title: '  ', content: 'C' }).success).toBe(false)
  })
  it('updateNoteSchema allows partial updates but rejects empty title and wrong types', () => {
    expect(updateNoteSchema.parse({ isFavorite: true })).toEqual({ isFavorite: true })
    expect(updateNoteSchema.safeParse({ title: '' }).success).toBe(false)
    expect(updateNoteSchema.safeParse({ isArchived: 'yes' }).success).toBe(false)
  })
  it('importTextSchema validates URLs and treats "" as no URL', () => {
    expect(importTextSchema.safeParse({ title: 'T', content: 'C', sourceUrl: 'not a url' }).success).toBe(false)
    expect(importTextSchema.parse({ title: 'T', content: 'C', sourceUrl: '' }).sourceUrl).toBeUndefined()
    expect(importTextSchema.parse({ title: 'T', content: 'C', sourceUrl: 'https://example.com' }).sourceUrl).toBe(
      'https://example.com'
    )
  })
  it('reviewSchema only accepts integer quality 0..5', () => {
    expect(reviewSchema.parse({ quality: '4' })).toEqual({ quality: 4 })
    expect(reviewSchema.safeParse({ quality: 6 }).success).toBe(false)
    expect(reviewSchema.safeParse({ quality: 2.5 }).success).toBe(false)
  })
  it('chatSchema requires a message and allows null noteId', () => {
    expect(chatSchema.safeParse({ message: '  ' }).success).toBe(false)
    expect(chatSchema.parse({ message: 'hi', noteId: null })).toEqual({ message: 'hi', noteId: null })
  })
})

describe('parseBody', () => {
  const req = (body: string) => new Request('http://x', { method: 'POST', body })

  it('returns parsed data on success', async () => {
    const result = await parseBody(req('{"quality":3}'), reviewSchema)
    expect(result).toEqual({ ok: true, data: { quality: 3 } })
  })
  it('returns 400 for invalid JSON', async () => {
    const result = await parseBody(req('{not json'), reviewSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })
  it('returns 400 with the first issue message for schema failures', async () => {
    const result = await parseBody(req('{"title":"","content":"x"}'), createNoteSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      expect(await result.response.json()).toEqual({ error: 'Title is required' })
    }
  })
})
