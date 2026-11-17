// app/api/ai/tags/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { truncateContent, withRetry } from '@/lib/text'
import { normalizeTagNames, setNoteTags } from '@/lib/tags'
import { parseTagsResponse } from '@/lib/ai-parse'
import { noteIdSchema, parseBody, serverError } from '@/lib/validation'

export const POST = withLimit(async (req, user) => {
  try {
    const parsed = await parseBody(req, noteIdSchema)
    if (!parsed.ok) return parsed.response

    const note = await db.note.findFirst({ where: { id: parsed.data.noteId, userId: user.id } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const rawContent = `${note.title}\n\n${note.content ?? ''}`
    if (rawContent.trim().length < 50) {
      return NextResponse.json({ error: 'Note too short to generate tags' }, { status: 400 })
    }

    const text = truncateContent(rawContent, 5000)
    const model = getModel('tags')
    const result = await withRetry(
      () =>
        model.generateContent(
          `Analyze the following text and suggest 3-6 short, relevant tags (single words or short phrases). Return ONLY a JSON array of strings, nothing else.\n\nText:\n${text}`
        ),
      'Tag generation'
    )

    const tagNames = normalizeTagNames(parseTagsResponse(result.response.text()))
    if (tagNames.length === 0) {
      return NextResponse.json({ error: 'Could not generate tags' }, { status: 500 })
    }

    const tags = await db.$transaction((tx) =>
      setNoteTags(tx, { noteId: note.id, userId: user.id, names: tagNames, mode: 'add' })
    )

    return NextResponse.json({ tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })) })
  } catch (err) {
    return serverError('Auto-tag error', err, 'Failed to generate tags')
  }
}, 'ai:tags', 10, 60_000)
