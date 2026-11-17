import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getModel } from '@/lib/gemini'
import { withLimit } from '@/lib/with-limits'
import { truncateContent, withRetry } from '@/lib/text'
import { noteIdSchema, parseBody, serverError } from '@/lib/validation'

export const POST = withLimit(async (req, user) => {
  try {
    const parsed = await parseBody(req, noteIdSchema)
    if (!parsed.ok) return parsed.response

    const note = await db.note.findFirst({ where: { id: parsed.data.noteId, userId: user.id } })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const rawContent = note.content ?? ''
    if (rawContent.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is empty' }, { status: 400 })
    }

    // Roughly 6000 chars = ~1500 tokens
    const text = truncateContent(rawContent, 6000)
    const wasTruncated = text.length < rawContent.length

    const model = getModel('summarize')
    const result = await withRetry(
      () =>
        model.generateContent(
          `Summarize the following text in 3-5 clear bullet points. ${
            wasTruncated ? '(Note: this is the beginning of a longer document)' : ''
          }\n\n${text}`
        ),
      'Summarization'
    )
    const summary = result.response.text()

    await db.note.update({ where: { id: note.id }, data: { summary } })

    return NextResponse.json({
      summary,
      wasTruncated,
      originalLength: rawContent.length,
      processedLength: text.length,
    })
  } catch (err) {
    return serverError('Summarization error', err, 'Failed to generate summary')
  }
}, 'ai:summarize', 10, 60_000)
