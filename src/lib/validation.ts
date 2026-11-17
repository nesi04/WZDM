import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MAX_TAG_LENGTH, MAX_TAGS_PER_NOTE } from './tags'

const MAX_TITLE = 200
const MAX_CONTENT = 200_000

const id = z.string().trim().min(1).max(64)
const title = z.string().trim().min(1, 'Title is required').max(MAX_TITLE)
const content = z.string().trim().min(1, 'Content is required').max(MAX_CONTENT)
const tagList = z.array(z.string().trim().max(MAX_TAG_LENGTH)).max(MAX_TAGS_PER_NOTE)

export const createNoteSchema = z.object({
  title,
  content,
  tags: tagList.optional().default([]),
})

export const updateNoteSchema = z.object({
  title: title.optional(),
  content: content.optional(),
  tags: tagList.optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
})

export const importTextSchema = z.object({
  title,
  content,
  sourceUrl: z.url().max(2048).optional().or(z.literal('').transform(() => undefined)),
  tags: tagList.optional().default([]),
})

export const noteIdSchema = z.object({ noteId: id })

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000),
  noteId: id.optional().nullable(),
})

export const flashcardGenSchema = z.object({
  noteId: id,
  count: z.coerce.number().int().min(3).max(20).optional().default(8),
})

export const quizGenSchema = z.object({
  noteId: id,
  questionCount: z.coerce.number().int().min(3).max(15).optional().default(6),
})

export const reviewSchema = z.object({
  quality: z.coerce.number().int().min(0).max(5),
})

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Parse a JSON request body against a schema; returns a 400 response on failure. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid request body'
    return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) }
  }
  return { ok: true, data: result.data }
}

/** Log the real error server-side; return a generic message to the client. */
export function serverError(label: string, error: unknown, message = 'Something went wrong. Please try again.') {
  console.error(`${label}:`, error)
  return NextResponse.json({ error: message }, { status: 500 })
}
